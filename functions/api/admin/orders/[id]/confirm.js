import { errorResponse, handleOptions, jsonResponse, methodNotAllowedResponse, notFoundResponse, requireAdmin } from "../../../../_shared.js";

export async function onRequestPost(context) {
  const { env, request, params } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const id = params.id;
  const order = await env.DB.prepare(
    "SELECT id, status, items, total FROM orders WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!order) {
    return notFoundResponse("Order not found");
  }

  if (order.status !== "pending") {
    return errorResponse("Order is not pending", 400);
  }

  const items = JSON.parse(order.items);

  // Resolve variant IDs and validate stock.
  const lineItems = [];
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

    if (!variant) {
      return errorResponse(`Variant not found for ${item.name}`, 400);
    }

    const quantity = item.quantity || 1;
    if (variant.sold_out || variant.stock_qty < quantity) {
      return errorResponse(
        `Insufficient stock for ${item.name} - ${variant.size_key} / ${variant.colorway}`,
        409
      );
    }

    lineItems.push({ variant, quantity });
  }

  // Decrement stock and update sold-out state.
  for (const { variant, quantity } of lineItems) {
    const newStock = variant.stock_qty - quantity;
    await env.DB.prepare(
      "UPDATE variants SET stock_qty = ?, sold_out = ? WHERE id = ?"
    )
      .bind(newStock, newStock <= 0 ? 1 : 0, variant.id)
      .run();
  }

  // Mark order confirmed.
  await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?")
    .bind("confirmed", id)
    .run();

  return jsonResponse({ id, status: "confirmed" });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
