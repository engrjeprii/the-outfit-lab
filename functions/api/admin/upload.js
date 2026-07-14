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

  const file = formData.get("image") || formData.get("video") || formData.get("file");
  if (!file || typeof file === "string") {
    return errorResponse("File is required", 400);
  }

  const isVideo = file.type && file.type.startsWith("video/");
  const isImage = file.type && file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    return errorResponse("Only image or video files are allowed", 400);
  }

  const maxSize = 100 * 1024 * 1024; // 100 MB
  if (file.size > maxSize) {
    return errorResponse("File must be under 100 MB", 400);
  }

  const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
  if (isVideo && !allowedVideoTypes.includes(file.type)) {
    return errorResponse("Video must be MP4, WebM, OGG, or QuickTime", 400);
  }

  const ext = file.name ? file.name.split(".").pop() : isVideo ? "mp4" : "jpg";
  const key = `${crypto.randomUUID()}.${ext}`;

  await env.IMAGES.put(key, file, {
    httpMetadata: {
      contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
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
