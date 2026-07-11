import { handleOptions, jsonResponse, methodNotAllowedResponse, notFoundResponse } from "../../_shared.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  const product = await env.DB.prepare(
    "SELECT id, category_id, brand, gender, sku, name, description, price, images, details, size_chart, created_at FROM products WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(id)
    .first();

  if (!product) {
    return notFoundResponse("Product not found");
  }

  const { results: variants } = await env.DB.prepare(
    "SELECT id, size_key, colorway, stock_qty, sold_out FROM variants WHERE product_id = ? ORDER BY size_key, colorway"
  )
    .bind(id)
    .all();

  return jsonResponse({
    ...product,
    images: JSON.parse(product.images),
    details: JSON.parse(product.details),
    size_chart: JSON.parse(product.size_chart),
    variants,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
