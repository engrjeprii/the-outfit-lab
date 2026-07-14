import {
  errorResponse,
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  requireAdmin,
  sizeKeyFromRow,
  normalizeSizeKey,
} from "../../_shared.js";

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const {
    sku,
    name,
    description,
    price,
    retail_price,
    category_id,
    brand,
    gender = "unisex",
    images = [],
    videos = [],
    details = {},
    size_chart = [],
    variants = [],
  } = body;

  if (!sku || !name || !price || !category_id) {
    return errorResponse("sku, name, price, and category_id are required", 400);
  }

  const normalizedGender = ["men", "women", "unisex"].includes(gender) ? gender : "unisex";
  const now = new Date().toISOString();
  const retailPrice = retail_price ? parseInt(retail_price, 10) : 0;

  if (retailPrice > 0 && retailPrice < price) {
    return errorResponse("retail_price must be greater than or equal to price", 400);
  }

  // Fetch category to support single-size auto-fill.
  const category = await env.DB.prepare("SELECT size_schema FROM categories WHERE id = ?")
    .bind(category_id)
    .first();
  const sizeSchema = category ? JSON.parse(category.size_schema || "[]") : [];

  // Auto-fill size_chart and variant size_key for single-size categories.
  let filledSizeChart = size_chart;
  let filledVariants = variants;
  if (sizeSchema.length === 1) {
    const dim = sizeSchema[0];
    const defaultValue = dim === "freesize" ? "FREESIZE" : dim === "one_size" ? "OS" : dim.toUpperCase();
    if (!filledSizeChart || filledSizeChart.length === 0) {
      filledSizeChart = [{ [dim]: defaultValue }];
    }
    filledVariants = variants.map((v) => {
      if (v.size_key && !v.size_key.endsWith(":")) return v;
      return { ...v, size_key: `${dim}:${defaultValue}` };
    });
  }

  // Validate that at least one complete variant is provided.
  // Normalize size_key by removing legacy gender/stock fields and merge duplicates.
  const normalizedVariants = filledVariants
    .map((v) => {
      const size_key = v.size_key
        ? normalizeSizeKey(v.size_key)
        : sizeKeyFromRow(
            Object.fromEntries(
              Object.entries(v.size_row || {}).filter(([k]) => k !== "gender" && k !== "stock")
            )
          );
      const variantGender = ["men", "women", "unisex"].includes(v.gender) ? v.gender : "unisex";
      // Legacy shoe data may use 'eu' instead of 'uk'.
      const normalizedSizeKey =
        category_id === "cat-shoes" && size_key.includes("eu:")
          ? size_key.replace(/eu:/g, "uk:")
          : size_key;
      return { ...v, size_key: normalizedSizeKey, gender: variantGender };
    })
    .filter((v) => v.size_key && v.colorway);

  const mergedMap = new Map();
  for (const v of normalizedVariants) {
    const key = `${v.gender}::${v.size_key}::${v.colorway}`;
    const existing = mergedMap.get(key);
    if (existing) {
      existing.stock_qty = (existing.stock_qty ?? 0) + (v.stock_qty ?? 0);
      if (!v.sold_out) existing.sold_out = false;
    } else {
      mergedMap.set(key, { ...v });
    }
  }
  const validVariants = Array.from(mergedMap.values());

  if (validVariants.length === 0) {
    return errorResponse("At least one size and colorway variant is required", 400);
  }

  // Upsert product by SKU.
  const existing = await env.DB.prepare("SELECT id FROM products WHERE sku = ?")
    .bind(sku)
    .first();

  let productId;
  if (existing) {
    productId = existing.id;
    await env.DB.prepare(
      "UPDATE products SET category_id = ?, brand = ?, gender = ?, name = ?, description = ?, price = ?, retail_price = ?, images = ?, videos = ?, details = ?, size_chart = ? WHERE id = ?"
    )
      .bind(
        category_id,
        brand || "",
        normalizedGender,
        name,
        description || "",
        price,
        retailPrice,
        JSON.stringify(images),
        JSON.stringify(videos),
        JSON.stringify(details),
        JSON.stringify(filledSizeChart),
        productId
      )
      .run();
  } else {
    productId = generateId();
    await env.DB.prepare(
      "INSERT INTO products (id, category_id, brand, gender, sku, name, description, price, retail_price, images, videos, details, size_chart, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        productId,
        category_id,
        brand || "",
        normalizedGender,
        sku,
        name,
        description || "",
        price,
        retailPrice,
        JSON.stringify(images),
        JSON.stringify(videos),
        JSON.stringify(details),
        JSON.stringify(filledSizeChart),
        now
      )
      .run();
  }

  // Fetch existing variants to preserve IDs for matching gender + normalized size_key + colorway.
  const { results: existingVariants } = await env.DB.prepare(
    "SELECT id, gender, size_key, colorway FROM variants WHERE product_id = ?"
  )
    .bind(productId)
    .all();

  const normalizedExisting = existingVariants.map((v) => ({
    ...v,
    normalized_size_key: normalizeSizeKey(v.size_key),
  }));

  const variantIdByKey = new Map(
    normalizedExisting.map((v) => [`${v.gender || "unisex"}::${v.normalized_size_key}::${v.colorway}`, v.id])
  );

  // Build list of incoming variant keys to determine which existing variants to remove.
  const incomingKeys = new Set(
    validVariants.map((v) => `${v.gender}::${v.size_key}::${v.colorway}`)
  );

  // Soft-remove variants that no longer exist for this product so existing orders can still reference them.
  // We do not hard-delete to avoid breaking historical orders.
  for (const existing of normalizedExisting) {
    const key = `${existing.gender || "unisex"}::${existing.normalized_size_key}::${existing.colorway}`;
    if (!incomingKeys.has(key)) {
      await env.DB.prepare("UPDATE variants SET sold_out = 1, stock_qty = 0 WHERE id = ?")
        .bind(existing.id)
        .run();
    }
  }

  // Upsert variants.
  for (const v of validVariants) {
    const key = `${v.gender}::${v.size_key}::${v.colorway}`;
    const existingVariantId = variantIdByKey.get(key);
    const stockQty = v.stock_qty ?? 0;
    const soldOut = v.sold_out ? 1 : 0;

    if (existingVariantId) {
      await env.DB.prepare(
        "UPDATE variants SET gender = ?, size_key = ?, colorway = ?, stock_qty = ?, sold_out = ? WHERE id = ?"
      )
        .bind(v.gender, v.size_key, v.colorway, stockQty, soldOut, existingVariantId)
        .run();
    } else {
      await env.DB.prepare(
        "INSERT INTO variants (id, product_id, gender, size_key, colorway, stock_qty, sold_out) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(generateId(), productId, v.gender, v.size_key, v.colorway, stockQty, soldOut)
        .run();
    }
  }

  return jsonResponse({ id: productId, sku, name, created: !existing, updated: !!existing });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
