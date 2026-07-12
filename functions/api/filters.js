import { handleOptions, jsonResponse, methodNotAllowedResponse, normalizeSizeKey } from "../_shared.js";

export async function onRequestGet(context) {
  const { env, request } = context;

  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  let colorStmt;
  let sizeStmt;

  if (category) {
    colorStmt = env.DB.prepare(
      `SELECT DISTINCT v.colorway
       FROM variants v
       JOIN products p ON v.product_id = p.id
       WHERE p.category_id = ?
         AND v.colorway IS NOT NULL
         AND v.colorway != ''
       ORDER BY v.colorway`
    ).bind(category);

    sizeStmt = env.DB.prepare(
      `SELECT DISTINCT v.size_key
       FROM variants v
       JOIN products p ON v.product_id = p.id
       WHERE p.category_id = ?
         AND v.size_key IS NOT NULL
         AND v.size_key != ''
       ORDER BY v.size_key`
    ).bind(category);
  } else {
    colorStmt = env.DB.prepare(
      "SELECT DISTINCT colorway FROM variants WHERE colorway IS NOT NULL AND colorway != '' ORDER BY colorway"
    );

    sizeStmt = env.DB.prepare(
      "SELECT DISTINCT size_key FROM variants WHERE size_key IS NOT NULL AND size_key != '' ORDER BY size_key"
    );
  }

  const [{ results: colorResults }, { results: sizeResults }] = await Promise.all([
    colorStmt.all(),
    sizeStmt.all(),
  ]);

  const colorways = colorResults.map((r) => r.colorway);
  const sizes = [...new Set(sizeResults.map((r) => normalizeSizeKey(r.size_key)).filter(Boolean))].sort();

  return jsonResponse({ colorways, sizes });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
