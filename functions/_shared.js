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

const WOMEN_NUMERIC_SIZES = {
  XS: "06",
  S: "08",
  M: "10",
  L: "12",
  XL: "14",
};

function sortSizeParts(parts) {
  // Prefer US before UK for shoes so output reads "us-8 / uk-7".
  return [...parts].sort((a, b) => {
    const ak = a.split(":")[0];
    const bk = b.split(":")[0];
    if (ak === "us" && bk === "uk") return -1;
    if (ak === "uk" && bk === "us") return 1;
    return ak.localeCompare(bk);
  });
}

/**
 * Format a size key for display.
 * E.g. "us:8|uk:7" -> "us-8 / uk-7"
 * E.g. "alpha:M" with gender "women" -> "M / 10"
 * E.g. "alpha:M" -> "M"
 */
export function displaySize(sizeKey, gender = null) {
  if (!sizeKey) return "";
  const parts = sizeKey.split("|").filter(Boolean);
  const isAlpha = parts.length === 1 && parts[0].startsWith("alpha:");
  const isSingleSize = parts.length === 1 && (parts[0].startsWith("freesize:") || parts[0].startsWith("one_size:"));

  if (isSingleSize) {
    return "One Size";
  }

  if (isAlpha) {
    const value = parts[0].split(":")[1];
    const numeric = gender === "women" ? WOMEN_NUMERIC_SIZES[value] : null;
    return numeric ? `${value} / ${numeric}` : value;
  }

  return sortSizeParts(parts)
    .map((part) => {
      const [k, v] = part.split(":");
      return `${k.toLowerCase()}-${v}`;
    })
    .join(" / ");
}

/**
 * Strip non-size dimensions (gender, stock) from a size_key and re-normalize it.
 */
export function normalizeSizeKey(sizeKey) {
  if (!sizeKey) return "";
  const parts = sizeKey.split("|").filter((part) => {
    const [k] = part.split(":");
    return k && k !== "gender" && k !== "stock";
  });
  return sizeKeyFromRow(Object.fromEntries(parts.map((part) => part.split(":"))));
}

/**
 * Merge duplicate variants that share the same gender + normalized size_key + colorway.
 * Sums stock and keeps the variant as available unless all duplicates are sold out.
 */
export function mergeDuplicateVariants(variants) {
  const map = new Map();
  for (const v of variants) {
    const size_key = normalizeSizeKey(v.size_key);
    const gender = v.gender || "unisex";
    const colorway = v.colorway || "Default";
    const key = `${v.product_id || ""}::${gender}::${size_key}::${colorway}`;
    const existing = map.get(key);
    if (existing) {
      existing.stock_qty = (existing.stock_qty || 0) + (v.stock_qty || 0);
      if (!v.sold_out) existing.sold_out = false;
      if (v.id < existing.id) existing.id = v.id;
    } else {
      map.set(key, { ...v, size_key, gender, colorway });
    }
  }
  return Array.from(map.values());
}
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

const STALE_PENDING_HOURS = 24;

function isStalePending(createdAt) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created > STALE_PENDING_HOURS * 60 * 60 * 1000;
}

/**
 * Lazily cancel a pending order older than 24 hours and restore variant stock.
 * Returns the order row with updated status if cancelled, otherwise the original row.
 */
export async function maybeCancelStaleOrder(order, env) {
  if (!order || order.status !== "pending" || !isStalePending(order.created_at)) {
    return order;
  }

  const items = JSON.parse(order.items || "[]");
  const cancelledAt = new Date().toISOString();

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
      await env.DB.prepare("UPDATE variants SET stock_qty = ?, sold_out = ? WHERE id = ?")
        .bind(newStock, newStock <= 0 ? 1 : 0, variant.id)
        .run();
    }
  }

  await env.DB.prepare("UPDATE orders SET status = ?, cancelled_at = ? WHERE id = ?")
    .bind("cancelled", cancelledAt, order.id)
    .run();

  return { ...order, status: "cancelled", cancelled_at: cancelledAt };
}
