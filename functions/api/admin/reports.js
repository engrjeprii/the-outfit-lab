import {
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  requireAdmin,
} from "../../_shared.js";

const RANGE_FILTERS = {
  today: "created_at >= date('now')",
  "7d": "created_at >= date('now', '-7 days')",
  "30d": "created_at >= date('now', '-30 days')",
  all: "1=1",
};

export async function onRequestGet(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "30d";
  const dateFilter = RANGE_FILTERS[range] || RANGE_FILTERS["30d"];

  // Order status summary and confirmed revenue.
  const { results: orderRows } = await env.DB.prepare(
    `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN status = 'confirmed' THEN total ELSE 0 END) AS revenue
    FROM orders
    WHERE ${dateFilter}
    `
  ).all();

  const orderSummary = orderRows[0] || {};

  // Shipping status breakdown for confirmed orders.
  const { results: shippingRows } = await env.DB.prepare(
    `
    SELECT shipping_status, COUNT(*) AS count
    FROM orders
    WHERE status = 'confirmed'
      AND shipping_status IS NOT NULL
      AND ${dateFilter}
    GROUP BY shipping_status
    `
  ).all();

  const shipping = {
    pending: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    pickup: 0,
  };
  for (const row of shippingRows) {
    if (row.shipping_status && Object.prototype.hasOwnProperty.call(shipping, row.shipping_status)) {
      shipping[row.shipping_status] = row.count;
    }
  }

  // Inventory health.
  const { results: inventoryRows } = await env.DB.prepare(
    `
    SELECT
      COUNT(DISTINCT product_id) AS total_products,
      SUM(CASE WHEN stock_qty <= 5 AND stock_qty > 0 THEN 1 ELSE 0 END) AS low_stock,
      SUM(CASE WHEN stock_qty = 0 OR sold_out = 1 THEN 1 ELSE 0 END) AS out_of_stock
    FROM variants
    `
  ).all();

  const inventory = inventoryRows[0] || {};

  return jsonResponse({
    orders: {
      total: Number(orderSummary.total || 0),
      pending: Number(orderSummary.pending || 0),
      confirmed: Number(orderSummary.confirmed || 0),
      cancelled: Number(orderSummary.cancelled || 0),
      revenue: Number(orderSummary.revenue || 0),
    },
    shipping,
    inventory: {
      total_products: Number(inventory.total_products || 0),
      low_stock: Number(inventory.low_stock || 0),
      out_of_stock: Number(inventory.out_of_stock || 0),
    },
    range,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
