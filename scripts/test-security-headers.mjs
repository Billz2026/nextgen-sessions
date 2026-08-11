import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const middlewareSource = await readFile(new URL("../functions/_middleware.js", import.meta.url), "utf8");
const middlewareModule = await import(
  `data:text/javascript;base64,${Buffer.from(middlewareSource).toString("base64")}`
);
const { onRequest, SECURITY_HEADERS } = middlewareModule;

globalThis.HTMLRewriter = class {
  on() {
    return this;
  }

  transform(response) {
    return response;
  }
};

const requiredCspValues = [
  "default-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com",
  "upgrade-insecure-requests"
];

for (const directive of requiredCspValues) {
  assert.ok(
    SECURITY_HEADERS["Content-Security-Policy"].includes(directive),
    `CSP is missing ${directive}`
  );
}
assert.equal(SECURITY_HEADERS["Strict-Transport-Security"], "max-age=31536000");

async function runMiddleware(url, contentType = "application/json") {
  return onRequest({
    request: new Request(url),
    next: async () => new Response("ok", { headers: { "content-type": contentType } })
  });
}

for (const [label, response] of [
  ["HTML", await runMiddleware("https://nextgensessions.com/", "text/html")],
  ["API", await runMiddleware("https://nextgensessions.com/api/latest")],
  ["legacy redirect", await runMiddleware("https://www.nextgensessions.com/artists/")],
  ["submit redirect", await runMiddleware("https://nextgensessions.com/submit.html")]
]) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(response.headers.get(name), value, `${label} response has an incorrect ${name}`);
  }
}

const headersFile = await readFile(new URL("../_headers", import.meta.url), "utf8");
for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
  assert.ok(
    headersFile.includes(`${name}: ${value}`),
    `_headers does not match middleware value for ${name}`
  );
}

const compiledWorker = await readFile(new URL("../.worker/index.js", import.meta.url), "utf8");
for (const marker of [
  '"Content-Security-Policy"',
  '"Strict-Transport-Security": "max-age=31536000"',
  "function withSecurityHeaders(",
  "return withSecurityHeaders("
]) {
  assert.ok(
    compiledWorker.includes(marker),
    `Compiled Worker is stale or missing security marker: ${marker}`
  );
}

console.log("Security header policy passed for HTML, API and redirect responses.");
