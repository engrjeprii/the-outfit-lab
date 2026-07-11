import { errorResponse, handleOptions, jsonResponse, methodNotAllowedResponse, requireAdmin } from "../../_shared.js";

export async function onRequestPost(context) {
  const { env, request } = context;
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Invalid form data", 400);
  }

  const file = formData.get("image") || formData.get("file");
  if (!file || typeof file === "string") {
    return errorResponse("Image file is required", 400);
  }

  const ext = file.name ? file.name.split(".").pop() : "jpg";
  const key = `${crypto.randomUUID()}.${ext}`;

  await env.IMAGES.put(key, file, {
    httpMetadata: {
      contentType: file.type || "image/jpeg",
    },
  });

  const publicDomain = env.R2_PUBLIC_DOMAIN;
  const url = publicDomain
    ? `https://${publicDomain}/${key}`
    : `/api/images/${key}`;

  return jsonResponse({ url, key });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
