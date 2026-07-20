import {
  errorResponse,
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
} from "../_shared.js";

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function onRequestGet(context) {
  const { env } = context;

  const { results: reviews } = await env.DB.prepare(
    `SELECT r.id, r.product_id, r.rating, r.comment, r.reviewer_name, r.status, r.created_at,
            p.name as product_name
     FROM reviews r
     LEFT JOIN products p ON p.id = r.product_id
     WHERE r.status = 'approved'
     ORDER BY r.created_at DESC
     LIMIT 100`
  ).all();

  const summary = await env.DB.prepare(
    "SELECT COUNT(*) as count, COALESCE(AVG(rating), 0) as average FROM reviews WHERE status = 'approved'"
  ).first();

  return jsonResponse({
    reviews,
    summary: {
      count: summary?.count || 0,
      average: Math.round((summary?.average || 0) * 10) / 10,
    },
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const { rating, comment, reviewer_name } = body;
  const ratingNum = parseInt(rating, 10);

  if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return errorResponse("Rating must be between 1 and 5", 400);
  }

  if (!comment || typeof comment !== "string" || comment.trim().length < 3) {
    return errorResponse("Comment must be at least 3 characters", 400);
  }

  if (!reviewer_name || typeof reviewer_name !== "string" || reviewer_name.trim().length === 0) {
    return errorResponse("Name is required", 400);
  }

  const id = generateId();
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO reviews (id, product_id, rating, comment, reviewer_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, null, ratingNum, comment.trim(), reviewer_name.trim(), "pending", now)
    .run();

  return jsonResponse(
    { id, rating: ratingNum, status: "pending", created_at: now },
    201
  );
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
