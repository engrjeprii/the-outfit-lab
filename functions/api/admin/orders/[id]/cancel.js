import {
  errorResponse,
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  notFoundResponse,
  requireAdmin,
} from "../../../../_shared.js";

export async function onRequestPost(context) {
  const { env, request, params } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const id = params.id;
  const order = await env.DB.prepare(
    "SELECT id, status, items FROM orders WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!order) {
    return notFoundResponse("Order not found");
  }

  if (order.status === "cancelled") {
    return errorResponse("Order is already cancelled", 400);
  }

  if (order.status === "confirmed") {
    // Restore stock for confirmed orders.
    const items = JSON.parse(order.items || "[]");
    for (const item of items) {
      let variant;
      if (item.variant_id) {
        variant = await env.DB.prepare("SELECT * FROM variants WHERE id = ?")
          .bind(item.variant_id)
          .first();
      }
      if (!variant && item.product_id && item.size_key && item.colorway) {
        const gender = item.gender || "unisex";
        variant = await env.DB.prepare(
          "SELECT * FROM variants WHERE product_id = ? AND gender = ? AND size_key = ? AND colorway = ?"
        )
          .bind(item.product_id, gender, item.size_key, item.colorway)
          .first();
      }

      if (variant) {
        const newStock = variant.stock_qty + (item.quantity || 1);
        await env.DB.prepare(
          "UPDATE variants SET stock_qty = ?, sold_out = ? WHERE id = ?"
        )
          .bind(newStock, newStock <= 0 ? 1 : 0, variant.id)
          .run();
      }
    }
  }

  const cancelledAt = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE orders SET status = ?, cancelled_at = ? WHERE id = ?"
  )
    .bind("cancelled", cancelledAt, id)
    .run();

  return jsonResponse({ id, status: "cancelled", cancelled_at: cancelledAt });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
