import { errorResponse, handleOptions, jsonResponse, methodNotAllowedResponse } from "../../_shared.js";

export async function onRequestPost(context) {
  const { env, request } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (body.password !== env.ADMIN_PASSWORD) {
    return errorResponse("Invalid password", 401);
  }

  return jsonResponse({ token: env.ADMIN_PASSWORD });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
