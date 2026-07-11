import { errorResponse, handleOptions, methodNotAllowedResponse, notFoundResponse, requireAdmin } from "../../_shared.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const key = params.key;

  const object = await env.IMAGES.get(key);
  if (!object) {
    return notFoundResponse("Image not found");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000");

  return new Response(object.body, { headers });
}

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequest(context) {
  return methodNotAllowedResponse();
}
