import { errorResponse, handleOptions, jsonResponse, methodNotAllowedResponse, requireAdmin, sizeKeyFromRow } from "../../_shared.js";

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
    category_id,
    brand,
    gender = "unisex",
    images = [],
    details = {},
    size_chart = [],
    variants = [],
  } = body;

  if (!sku || !name || !price || !category_id) {
    return errorResponse("sku, name, price, and category_id are required", 400);
  }

  const normalizedGender = ["men", "women", "unisex"].includes(gender) ? gender : "unisex";
  const now = new Date().toISOString();

  // Validate that at least one complete variant is provided.
  const validVariants = variants
    .map((v) => {
      const size_key = sizeKeyFromRow(
        v.size_key
          ? Object.fromEntries(v.size_key.split("|").map((part) => part.split(":")))
          : v.size_row || {}
      );
      return { ...v, size_key };
    })
    .filter((v) => v.size_key && v.colorway);
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
      "UPDATE products SET category_id = ?, brand = ?, gender = ?, name = ?, description = ?, price = ?, images = ?, details = ?, size_chart = ? WHERE id = ?"
    )
      .bind(
        category_id,
        brand || "",
        normalizedGender,
        name,
        description || "",
        price,
        JSON.stringify(images),
        JSON.stringify(details),
        JSON.stringify(size_chart),
        productId
      )
      .run();
  } else {
    productId = generateId();
    await env.DB.prepare(
      "INSERT INTO products (id, category_id, brand, gender, sku, name, description, price, images, details, size_chart, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
        JSON.stringify(images),
        JSON.stringify(details),
        JSON.stringify(size_chart),
        now
      )
      .run();
  }

  // Fetch existing variants to preserve IDs for matching gender + size_key + colorway.
  const { results: existingVariants } = await env.DB.prepare(
    "SELECT id, gender, size_key, colorway FROM variants WHERE product_id = ?"
  )
    .bind(productId)
    .all();

  const variantIdByKey = new Map(
    existingVariants.map((v) => [`${v.gender || "unisex"}::${v.size_key}::${v.colorway}`, v.id])
  );

  // Build list of incoming variant keys to determine which existing variants to remove.
  const incomingKeys = new Set(
    validVariants.map((v) => `${v.gender || "unisex"}::${v.size_key}::${v.colorway}`)
  );

  // Soft-remove variants that no longer exist for this product so existing orders can still reference them.
  // We do not hard-delete to avoid breaking historical orders.
  for (const existing of existingVariants) {
    const key = `${existing.gender || "unisex"}::${existing.size_key}::${existing.colorway}`;
    if (!incomingKeys.has(key)) {
      await env.DB.prepare("UPDATE variants SET sold_out = 1, stock_qty = 0 WHERE id = ?")
        .bind(existing.id)
        .run();
    }
  }

  // Upsert variants.
  for (const v of validVariants) {
    const variantGender = ["men", "women", "unisex"].includes(v.gender) ? v.gender : "unisex";
    const key = `${variantGender}::${v.size_key}::${v.colorway}`;
    const existingVariantId = variantIdByKey.get(key);
    const stockQty = v.stock_qty ?? 0;
    const soldOut = v.sold_out ? 1 : 0;

    if (existingVariantId) {
      await env.DB.prepare(
        "UPDATE variants SET gender = ?, size_key = ?, colorway = ?, stock_qty = ?, sold_out = ? WHERE id = ?"
      )
        .bind(variantGender, v.size_key, v.colorway, stockQty, soldOut, existingVariantId)
        .run();
    } else {
      await env.DB.prepare(
        "INSERT INTO variants (id, product_id, gender, size_key, colorway, stock_qty, sold_out) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(generateId(), productId, variantGender, v.size_key, v.colorway, stockQty, soldOut)
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
