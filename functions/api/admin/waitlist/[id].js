import {
  errorResponse,
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  notFoundResponse,
  requireAdmin,
} from "../../../_shared.js";

async function sendEmail({ to, subject, html, env }) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Email service is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { raw: responseText };
  }

  console.log(`Resend response for ${to}: status=${response.status}, body=${JSON.stringify(data)}`);

  if (!response.ok) {
    throw new Error(data.message || `Email send failed: ${response.status}`);
  }

  return data;
}

export async function onRequestGet(context) {
  const { env, request, params } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const productId = params.id;

  const product = await env.DB.prepare(
    "SELECT id, name FROM products WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(productId)
    .first();

  if (!product) {
    return notFoundResponse("Product not found");
  }

  const { results } = await env.DB.prepare(
    "SELECT id, email, created_at, notified_at FROM waitlist WHERE product_id = ? ORDER BY created_at DESC"
  )
    .bind(productId)
    .all();

  return jsonResponse({
    product: { id: product.id, name: product.name },
    waitlist: results,
    total: results.length,
    pending: results.filter((r) => !r.notified_at).length,
  });
}

export async function onRequestPost(context) {
  const { env, request, params } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const productId = params.id;

  const product = await env.DB.prepare(
    "SELECT id, name FROM products WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(productId)
    .first();

  if (!product) {
    return notFoundResponse("Product not found");
  }

  const { results: subscribers } = await env.DB.prepare(
    "SELECT id, email FROM waitlist WHERE product_id = ? AND notified_at IS NULL"
  )
    .bind(productId)
    .all();

  if (subscribers.length === 0) {
    return jsonResponse({ sent: 0, message: "No pending subscribers" });
  }

  const now = new Date().toISOString();
  const subject = `${product.name} is now available at The Outfit Lab`;
  const html = `
    <p>Hi there,</p>
    <p>Great news — <strong>${product.name}</strong> is now available at The Outfit Lab.</p>
    <p><a href="https://the-outfit-lab.pages.dev/products/${product.id}">Shop it now</a></p>
    <p>Thanks,<br/>The Outfit Lab Team</p>
  `;

  const errors = [];
  let sent = 0;

  for (const subscriber of subscribers) {
    try {
      await sendEmail({
        to: subscriber.email,
        subject,
        html,
        env,
      });
      await env.DB.prepare("UPDATE waitlist SET notified_at = ? WHERE id = ?")
        .bind(now, subscriber.id)
        .run();
      sent += 1;
    } catch (err) {
      errors.push({ email: subscriber.email, error: err.message });
    }
  }

  // Mark product as available now that the waitlist has been notified.
  await env.DB.prepare("UPDATE products SET is_upcoming = 0 WHERE id = ?")
    .bind(productId)
    .run();

  return jsonResponse({
    sent,
    failed: errors.length,
    activated: true,
    errors: errors.slice(0, 10),
  });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
