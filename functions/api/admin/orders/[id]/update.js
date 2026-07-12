import {
  errorResponse,
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  notFoundResponse,
  requireAdmin,
} from "../../../../_shared.js";

const VALID_SHIPPING_STATUSES = [
  "pending",
  "packed",
  "shipped",
  "delivered",
  "pickup",
];

export async function onRequestPost(context) {
  const { env, request, params } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const id = params.id;
  const order = await env.DB.prepare(
    "SELECT id, status FROM orders WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!order) {
    return notFoundResponse("Order not found");
  }

  if (order.status !== "confirmed") {
    return errorResponse(
      "Order must be confirmed before updating shipping status",
      400
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const { shipping_status, tracking_number } = body;

  if (!VALID_SHIPPING_STATUSES.includes(shipping_status)) {
    return errorResponse("Invalid shipping status", 400);
  }

  if (
    (shipping_status === "shipped" || shipping_status === "delivered") &&
    !tracking_number
  ) {
    return errorResponse(
      "Tracking number is required for shipped or delivered orders",
      400
    );
  }

  await env.DB.prepare(
    "UPDATE orders SET shipping_status = ?, tracking_number = ? WHERE id = ?"
  )
    .bind(shipping_status, tracking_number || null, id)
    .run();

  return jsonResponse({
    id,
    shipping_status,
    tracking_number: tracking_number || null,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
