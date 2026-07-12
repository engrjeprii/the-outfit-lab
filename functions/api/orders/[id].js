import {
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  notFoundResponse,
  maybeCancelStaleOrder,
} from "../../_shared.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  const order = await env.DB.prepare(
    "SELECT id, status, shipping_status, tracking_number, items, total, source, created_at, cancelled_at FROM orders WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!order) {
    return notFoundResponse("Order not found");
  }

  const processed = await maybeCancelStaleOrder(order, env);

  return jsonResponse({
    ...processed,
    items: JSON.parse(processed.items),
  });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
