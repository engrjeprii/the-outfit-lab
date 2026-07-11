import { handleOptions, jsonResponse, methodNotAllowedResponse, notFoundResponse } from "../../_shared.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  const order = await env.DB.prepare(
    "SELECT id, status, items, total, source, created_at FROM orders WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!order) {
    return notFoundResponse("Order not found");
  }

  return jsonResponse({
    ...order,
    items: JSON.parse(order.items),
  });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
