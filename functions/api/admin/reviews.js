import {
  errorResponse,
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  requireAdmin,
} from "../../_shared.js";

const VALID_STATUSES = ["pending", "approved", "rejected"];

export async function onRequestGet(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";

  if (!VALID_STATUSES.includes(status)) {
    return errorResponse("Invalid status", 400);
  }

  const { results: reviews } = await env.DB.prepare(
    `SELECT r.id, r.product_id, r.rating, r.comment, r.reviewer_name, r.status, r.created_at,
            p.name as product_name, p.sku as product_sku
     FROM reviews r
     JOIN products p ON p.id = r.product_id
     WHERE r.status = ?
     ORDER BY r.created_at DESC`
  )
    .bind(status)
    .all();

  const counts = await env.DB.prepare(
    "SELECT status, COUNT(*) as count FROM reviews GROUP BY status"
  ).all();

  const countMap = { pending: 0, approved: 0, rejected: 0 };
  for (const row of counts.results) {
    if (row.status in countMap) countMap[row.status] = row.count;
  }

  return jsonResponse({ reviews, counts: countMap });
}

export async function onRequestPatch(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const { id, status } = body;

  if (!id || typeof id !== "string") {
    return errorResponse("Review id is required", 400);
  }

  if (!VALID_STATUSES.includes(status)) {
    return errorResponse("Invalid status", 400);
  }

  const existing = await env.DB.prepare("SELECT id FROM reviews WHERE id = ?").bind(id).first();
  if (!existing) {
    return errorResponse("Review not found", 404);
  }

  await env.DB.prepare("UPDATE reviews SET status = ? WHERE id = ?").bind(status, id).run();

  return jsonResponse({ id, status });
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return errorResponse("Review id is required", 400);
  }

  const existing = await env.DB.prepare("SELECT id FROM reviews WHERE id = ?").bind(id).first();
  if (!existing) {
    return errorResponse("Review not found", 404);
  }

  await env.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();

  return jsonResponse({ id, deleted: true });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
