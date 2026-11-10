// Minimal native fetch helper. Mirrors the axios behaviour main.js relied on:
// default Accept header, JSON request bodies, JSON-or-text response bodies,
// and an error (with response.status/data) for any non-2xx status.
export class HttpError extends Error {
  constructor(status, data, headers) {
    super(`Request failed with status code ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.response = { status, data, headers };
  }
}

export async function request(url, { method = "GET", headers = {}, body, timeoutMs } = {}) {
  const finalHeaders = new Headers({ Accept: "application/json, text/plain, */*" });
  for (const [key, value] of Object.entries(headers)) {
    finalHeaders.set(key, value);
  }
  let payload;
  if (body !== undefined && body !== null) {
    if (typeof body === "string") {
      payload = body;
    } else {
      payload = JSON.stringify(body);
      if (!finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
      }
    }
  }
  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: payload,
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  });
  const text = await response.text();
  let data = text;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    throw new HttpError(response.status, data, response.headers);
  }
  return { status: response.status, headers: response.headers, data };
}
