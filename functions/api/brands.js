import { handleOptions, jsonResponse, methodNotAllowedResponse } from "../_shared.js";

export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    `
    SELECT brand, COUNT(*) as count, MIN(images) as sample_images
    FROM products
    WHERE deleted_at IS NULL AND brand IS NOT NULL AND brand != ''
    GROUP BY brand
    ORDER BY brand
    `
  ).all();

  const brands = results.map((row) => {
    let image = null;
    try {
      const parsed = JSON.parse(row.sample_images);
      image = parsed[0] || null;
    } catch {
      image = row.sample_images;
    }
    return {
      name: row.brand,
      count: row.count,
      image,
    };
  });

  return jsonResponse(brands);
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
