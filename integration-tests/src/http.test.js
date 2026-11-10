import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { HttpError, request } from "./http.js";

function mockFetch(status, body) {
  return mock.method(globalThis, "fetch", async () => new Response(body, { status }));
}

describe("request", () => {
  afterEach(() => mock.restoreAll());

  it("sends JSON bodies with merged headers and parses JSON responses", async () => {
    const fetchMock = mockFetch(200, JSON.stringify({ data: { id: 1 } }));
    const res = await request("http://x/api", {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: { name: "John" },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { data: { id: 1 } });
    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.equal(url, "http://x/api");
    assert.equal(init.method, "POST");
    assert.equal(init.body, JSON.stringify({ name: "John" }));
    assert.equal(init.headers.get("accept"), "application/json");
    assert.equal(init.headers.get("content-type"), "application/json");
    assert.equal(init.signal, undefined);
  });

  it("defaults Accept and Content-Type like axios", async () => {
    const fetchMock = mockFetch(200, "");
    await request("http://x", { method: "PUT", body: { a: 1 } });
    const { headers } = fetchMock.mock.calls[0].arguments[1];
    assert.equal(headers.get("accept"), "application/json, text/plain, */*");
    assert.equal(headers.get("content-type"), "application/json");
  });

  it("sends no body when none is given and returns text when not JSON", async () => {
    const fetchMock = mockFetch(200, "plain");
    const res = await request("http://x");
    assert.equal(fetchMock.mock.calls[0].arguments[1].body, undefined);
    assert.equal(res.data, "plain");
  });

  it("returns an empty string for an empty body", async () => {
    mockFetch(200, "");
    const res = await request("http://x", { method: "DELETE" });
    assert.equal(res.data, "");
  });

  it("throws HttpError with status and data on non-2xx", async () => {
    mockFetch(404, JSON.stringify({ detail: "nope" }));
    await assert.rejects(request("http://x"), (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.message, "Request failed with status code 404");
      assert.equal(err.response.status, 404);
      assert.deepEqual(err.response.data, { detail: "nope" });
      return true;
    });
  });

  it("passes an abort signal when a timeout is set", async () => {
    const fetchMock = mockFetch(200, "{}");
    await request("http://x", { timeoutMs: 1000 });
    assert.ok(fetchMock.mock.calls[0].arguments[1].signal instanceof AbortSignal);
  });
});
