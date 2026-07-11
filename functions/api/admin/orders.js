import { handleOptions, jsonResponse, methodNotAllowedResponse, requireAdmin } from "../../_shared.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const { results } = await env.DB.prepare(
    `
    SELECT id, status, total, created_at, items
    FROM orders
    ORDER BY created_at DESC
    `
  ).all();

  const orders = results.map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total,
    created_at: o.created_at,
    item_count: JSON.parse(o.items || "[]").reduce((sum, i) => sum + (i.quantity || 1), 0),
  }));

  return jsonResponse(orders);
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
