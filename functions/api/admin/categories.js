import { errorResponse, handleOptions, jsonResponse, methodNotAllowedResponse, requireAdmin } from "../../_shared.js";

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const { id: bodyId, name, size_schema } = body;
  if (!name || !Array.isArray(size_schema) || size_schema.length === 0) {
    return errorResponse("Name and size_schema are required", 400);
  }

  const slug = slugify(name);

  // Update existing category if id is provided.
  if (bodyId) {
    const existing = await env.DB.prepare("SELECT id FROM categories WHERE id = ?")
      .bind(bodyId)
      .first();
    if (!existing) {
      return errorResponse("Category not found", 404);
    }
    await env.DB.prepare(
      "UPDATE categories SET name = ?, slug = ?, size_schema = ? WHERE id = ?"
    )
      .bind(name, slug, JSON.stringify(size_schema), bodyId)
      .run();
    return jsonResponse({ id: bodyId, name, slug, size_schema });
  }

  const id = generateId();

  try {
    await env.DB.prepare(
      "INSERT INTO categories (id, name, slug, size_schema) VALUES (?, ?, ?, ?)"
    )
      .bind(id, name, slug, JSON.stringify(size_schema))
      .run();
  } catch (err) {
    if (err.message?.includes("UNIQUE constraint failed")) {
      return errorResponse("Category slug already exists", 409);
    }
    throw err;
  }

  return jsonResponse({ id, name, slug, size_schema }, 201);
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
