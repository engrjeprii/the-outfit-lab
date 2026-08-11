import {
  errorResponse,
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  sendEmail,
} from "../_shared.js";

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const STORE_URL = "https://theoutfitlab.co";

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
    "SELECT id, name FROM products WHERE id = ? AND deleted_at IS NULL AND is_upcoming = 1"
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

  let emailSent = false;
  let emailError = null;
  try {
    await sendEmail({
      to: normalizedEmail,
      subject: `You're on the waitlist for ${product.name}`,
      html: `
        <p>Hi there,</p>
        <p>Thanks for your interest in <strong>${product.name}</strong>.</p>
        <p>You're on the waitlist and we'll email you as soon as it's available at The Outfit Lab.</p>
        <p><a href="${STORE_URL}/products/${product.id}">View the product</a></p>
        <p>Thanks,<br/>The Outfit Lab Team</p>
      `,
      env,
    });
    emailSent = true;
  } catch (err) {
    emailError = err.message;
    console.error(`Waitlist confirmation email failed for ${normalizedEmail}:`, err.message);
  }

  return jsonResponse({ id, alreadyJoined: false, emailSent, emailError }, 201);
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
