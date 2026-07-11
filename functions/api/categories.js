import { handleOptions, jsonResponse, methodNotAllowedResponse } from "../_shared.js";

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    "SELECT id, name, slug, size_schema FROM categories ORDER BY name"
  ).all();
  return jsonResponse(results.map((c) => ({
    ...c,
    size_schema: JSON.parse(c.size_schema),
  })));
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
