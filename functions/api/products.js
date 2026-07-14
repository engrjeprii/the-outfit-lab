import {
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  verifyAdminToken,
  mergeDuplicateVariants,
} from "../_shared.js";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

function parseIntParam(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), min > max ? value : max);
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  // Pagination
  let page = parseIntParam(url.searchParams.get("page"), 1);
  let limit = parseIntParam(url.searchParams.get("limit"), DEFAULT_LIMIT);
  page = Math.max(1, page);
  limit = clamp(limit, 1, MAX_LIMIT);
  const offset = (page - 1) * limit;

  // Filters
  const category = url.searchParams.get("category");
  const brand = url.searchParams.get("brand");
  const gender = url.searchParams.get("gender");
  const q = url.searchParams.get("q");
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");
  const size = url.searchParams.get("size");
  const colorway = url.searchParams.get("colorway");
  const sort = url.searchParams.get("sort") || "newest";

  const whereClauses = ["deleted_at IS NULL"];
  const bindings = [];

  if (category) {
    whereClauses.push("category_id = ?");
    bindings.push(category);
  }

  if (brand) {
    whereClauses.push("brand = ?");
    bindings.push(brand);
  }

  if (gender) {
    whereClauses.push(
      "EXISTS (SELECT 1 FROM variants WHERE variants.product_id = products.id AND variants.gender = ? AND variants.stock_qty > 0)"
    );
    bindings.push(gender);
  }

  if (minPrice !== null && minPrice !== "") {
    const min = parseIntParam(minPrice, null);
    if (min !== null) {
      whereClauses.push("price >= ?");
      bindings.push(min);
    }
  }

  if (maxPrice !== null && maxPrice !== "") {
    const max = parseIntParam(maxPrice, null);
    if (max !== null) {
      whereClauses.push("price <= ?");
      bindings.push(max);
    }
  }

  if (q) {
    whereClauses.push("(name LIKE ? OR sku LIKE ? OR description LIKE ?)");
    const pattern = `%${q}%`;
    bindings.push(pattern, pattern, pattern);
  }

  // Variant-based filters use EXISTS subqueries.
  if (size) {
    whereClauses.push(
      "EXISTS (SELECT 1 FROM variants WHERE variants.product_id = products.id AND variants.size_key LIKE ?)"
    );
    bindings.push(`%${size}%`);
  }

  if (colorway) {
    whereClauses.push(
      "EXISTS (SELECT 1 FROM variants WHERE variants.product_id = products.id AND variants.colorway = ?)"
    );
    bindings.push(colorway);
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const orderBy = {
    newest: "products.created_at DESC",
    oldest: "products.created_at ASC",
    price_asc: "products.price ASC",
    price_desc: "products.price DESC",
    name_asc: "products.name ASC",
    name_desc: "products.name DESC",
    stock_asc: "(SELECT COALESCE(SUM(stock_qty), 0) FROM variants WHERE variants.product_id = products.id) ASC",
    stock_desc: "(SELECT COALESCE(SUM(stock_qty), 0) FROM variants WHERE variants.product_id = products.id) DESC",
  }[sort] || "products.created_at DESC";

  // Count total matching products.
  const countSql = `SELECT COUNT(*) as total FROM products ${where}`;
  const countStmt = env.DB.prepare(countSql).bind(...bindings);
  const { results: countResults } = await countStmt.all();
  const total = countResults[0]?.total || 0;

  // Fetch page of products.
  const selectSql = `
    SELECT id, category_id, brand, gender, sku, name, description, price, retail_price, images, details, size_chart, created_at
    FROM products
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  const selectStmt = env.DB.prepare(selectSql).bind(...bindings, limit, offset);
  const { results } = await selectStmt.all();

  const productIds = results.map((p) => p.id);
  const stockMap = new Map();
  const availableGenderMap = new Map();
  let variantMap = new Map();
  const isAdmin = verifyAdminToken(request, env);

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    const { results: stockResults } = await env.DB.prepare(
      `SELECT product_id, COALESCE(SUM(stock_qty), 0) as total_stock, COUNT(*) as variant_count FROM variants WHERE product_id IN (${placeholders}) GROUP BY product_id`
    )
      .bind(...productIds)
      .all();
    for (const row of stockResults) {
      stockMap.set(row.product_id, {
        total_stock: row.total_stock,
        variant_count: row.variant_count,
      });
    }

    const { results: genderResults } = await env.DB.prepare(
      `SELECT product_id, gender FROM variants WHERE product_id IN (${placeholders}) AND stock_qty > 0 GROUP BY product_id, gender`
    )
      .bind(...productIds)
      .all();
    for (const row of genderResults) {
      if (!availableGenderMap.has(row.product_id)) {
        availableGenderMap.set(row.product_id, new Set());
      }
      availableGenderMap.get(row.product_id).add(row.gender || "unisex");
    }

    if (isAdmin) {
      const { results: variantResults } = await env.DB.prepare(
        `SELECT id, product_id, gender, size_key, colorway, stock_qty, sold_out FROM variants WHERE product_id IN (${placeholders}) ORDER BY gender, size_key, colorway`
      )
        .bind(...productIds)
        .all();
      for (const v of mergeDuplicateVariants(variantResults)) {
        if (!variantMap.has(v.product_id)) {
          variantMap.set(v.product_id, []);
        }
        variantMap.get(v.product_id).push(v);
      }
    }
  }

  const products = results.map((p) => ({
    ...p,
    images: JSON.parse(p.images),
    details: JSON.parse(p.details),
    size_chart: JSON.parse(p.size_chart),
    total_stock: stockMap.get(p.id)?.total_stock ?? 0,
    variant_count: stockMap.get(p.id)?.variant_count ?? 0,
    available_genders: Array.from(availableGenderMap.get(p.id) || [p.gender || "unisex"]),
    variants: isAdmin ? (variantMap.get(p.id) || []) : undefined,
  }));

  return jsonResponse({ products, total, page, limit });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
