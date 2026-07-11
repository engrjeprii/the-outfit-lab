/**
 * Shared helpers for Cloudflare Pages Functions.
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

export function notFoundResponse(message = "Not found") {
  return errorResponse(message, 404);
}

export function methodNotAllowedResponse() {
  return errorResponse("Method not allowed", 405);
}

export async function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Generate a short, unique order code like OTL-7X4K9.
 */
export function generateOrderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OTL-${code}`;
}

/**
 * Normalize a size chart row into a deterministic key string.
 * E.g. { us: "8", eu: "41" } -> "us:8|eu:41"
 */
export function sizeKeyFromRow(row) {
  return Object.keys(row)
    .sort()
    .map((k) => `${k}:${row[k]}`)
    .join("|");
}

/**
 * Format a size key for display.
 * E.g. "us:8|eu:41" -> "US 8 / EU 41"
 */
export function displaySize(sizeKey) {
  return sizeKey
    .split("|")
    .map((part) => {
      const [k, v] = part.split(":");
      return `${k.toUpperCase()} ${v}`;
    })
    .join(" / ");
}

/**
 * Verify an admin Authorization header against the ADMIN_PASSWORD env var.
 * Returns true if the token matches.
 */
export function verifyAdminToken(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return token === env.ADMIN_PASSWORD && token.length > 0;
}

/**
 * Require admin auth for a handler. Returns an error response if unauthorized.
 */
export function requireAdmin(request, env) {
  if (!verifyAdminToken(request, env)) {
    return errorResponse("Unauthorized", 401);
  }
  return null;
}
