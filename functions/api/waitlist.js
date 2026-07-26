import {
  errorResponse,
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
} from "../_shared.js";

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const { product_id, email } = body;

  if (!product_id || typeof product_id !== "string") {
    return errorResponse("Product ID is required", 400);
  }

  if (!isValidEmail(email)) {
    return errorResponse("A valid email is required", 400);
  }

  const product = await env.DB.prepare(
    "SELECT id FROM products WHERE id = ? AND deleted_at IS NULL AND is_upcoming = 1"
  )
    .bind(product_id)
    .first();

  if (!product) {
    return errorResponse("Product not found or no longer upcoming", 404);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  const existing = await env.DB.prepare(
    "SELECT id FROM waitlist WHERE product_id = ? AND email = ?"
  )
    .bind(product_id, normalizedEmail)
    .first();

  if (existing) {
    return jsonResponse({ id: existing.id, alreadyJoined: true }, 200);
  }

  const id = generateId();
  await env.DB.prepare(
    "INSERT INTO waitlist (id, product_id, email, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(id, product_id, normalizedEmail, now)
    .run();

  return jsonResponse({ id, alreadyJoined: false }, 201);
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
