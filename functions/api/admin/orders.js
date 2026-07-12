import {
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  requireAdmin,
  maybeCancelStaleOrder,
} from "../../_shared.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const { results } = await env.DB.prepare(
    `
    SELECT id, status, shipping_status, tracking_number, total, created_at, items
    FROM orders
    ORDER BY created_at DESC
    `
  ).all();

  const orders = [];
  for (const o of results) {
    const processed = await maybeCancelStaleOrder(o, env);
    orders.push({
      id: processed.id,
      status: processed.status,
      shipping_status: processed.shipping_status,
      tracking_number: processed.tracking_number,
      total: processed.total,
      created_at: processed.created_at,
      item_count: JSON.parse(processed.items || "[]").reduce(
        (sum, i) => sum + (i.quantity || 1),
        0
      ),
    });
  }

  return jsonResponse(orders);
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
