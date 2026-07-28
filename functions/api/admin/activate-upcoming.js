import {
  errorResponse,
  handleOptions,
  jsonResponse,
  methodNotAllowedResponse,
  requireAdmin,
  activateReleasedProducts,
} from "../../_shared.js";

export async function onRequestPost(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  try {
    const activated = await activateReleasedProducts(env);
    return jsonResponse({ activated });
  } catch (err) {
    return errorResponse(err.message || "Activation failed", 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
