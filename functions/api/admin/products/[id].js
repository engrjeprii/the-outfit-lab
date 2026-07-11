import { handleOptions, jsonResponse, methodNotAllowedResponse, notFoundResponse, requireAdmin } from "../../../_shared.js";

export async function onRequestDelete(context) {
  const { env, request, params } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const id = params.id;
  const product = await env.DB.prepare("SELECT id FROM products WHERE id = ?")
    .bind(id)
    .first();

  if (!product) {
    return notFoundResponse("Product not found");
  }

  // Soft delete product and its variants via ON DELETE CASCADE.
  const deletedAt = new Date().toISOString();
  await env.DB.prepare("UPDATE products SET deleted_at = ? WHERE id = ?").bind(deletedAt, id).run();
  return jsonResponse({ deleted: true });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
