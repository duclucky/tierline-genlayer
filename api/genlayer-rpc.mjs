const STUDIO_DEV_RPC = "https://studio-dev.genlayer.com/api";
const MAX_BODY_BYTES = 64 * 1024;

function jsonResult(status, body) {
  return { status, body };
}

function parseRequestBody(body) {
  if (typeof body === "string") return JSON.parse(body);
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString("utf8"));
  return body;
}

export async function forwardGenlayerRpc(request, fetchImpl = fetch) {
  if (request.method !== "POST") return jsonResult(405, { error: "Method not allowed" });

  let body;
  try {
    body = parseRequestBody(request.body);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid body");
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
      return jsonResult(413, { error: "RPC request is too large" });
    }
  } catch {
    return jsonResult(400, { error: "RPC request must be a JSON object" });
  }

  try {
    const upstream = await fetchImpl(STUDIO_DEV_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    return jsonResult(upstream.status, text);
  } catch {
    return jsonResult(502, { error: "The GenLayer RPC endpoint is unreachable." });
  }
}

export default async function handler(request, response) {
  const result = await forwardGenlayerRpc(request);
  response.status(result.status).send(result.body);
}
