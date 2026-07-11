import { errorResponse, handleOptions, jsonResponse, methodNotAllowedResponse } from "../_shared.js";
import { generateOrderCode } from "../_shared.js";

export async function onRequestPost(context) {
  const { env, request } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const items = body.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    return errorResponse("Cart is empty", 400);
  }

  const total = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

  // Generate a unique order code, retrying on collision.
  let code;
  let attempts = 0;
  do {
    code = generateOrderCode();
    attempts++;
    const existing = await env.DB.prepare("SELECT id FROM orders WHERE id = ?")
      .bind(code)
      .first();
    if (!existing) break;
  } while (attempts < 10);

  const createdAt = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO orders (id, status, items, total, source, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(code, "pending", JSON.stringify(items), total, "messenger", createdAt)
    .run();

  return jsonResponse({ id: code, status: "pending", items, total }, 201);
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
