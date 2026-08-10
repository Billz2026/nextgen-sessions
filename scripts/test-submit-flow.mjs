import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function importSource(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const { onRequestPost } = await importSource("../functions/api/submit.js");
const { onRequestGet: getSubmissionConfig } = await importSource("../functions/api/submission-config.js");

const endpoint = "https://nextgensessions.com/api/submit";
const basePayload = {
  artistName: "Test Artist",
  trackTitle: "Strong Record",
  email: "artist@example.com",
  social: "@testartist",
  genre: "Dancehall / Reggae",
  listeningLink: "https://soundcloud.com/test/private-track",
  location: "London, UK",
  releaseStatus: "Unreleased",
  summary: "A finished track with a clear visual direction.",
  consent: true,
  website: "",
  clientRequestId: "28f4aabc-5c91-4e93-85fa-68bcf15133c6",
  turnstileToken: "valid-turnstile-token"
};

const env = {
  TURNSTILE_SITE_KEY: "site-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  RESEND_API_KEY: "resend-secret",
  SUBMISSION_RECIPIENT: "owner@example.com",
  SUBMISSION_FROM_EMAIL: "submissions@nextgensessions.com"
};

function context(payload = basePayload, overrides = {}) {
  const request = new Request(endpoint, {
    method: "POST",
    headers: {
      origin: "https://nextgensessions.com",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return { request, env: { ...env, ...(overrides.env || {}) } };
}

async function body(response) {
  return response.json();
}

async function run() {
  const originalFetch = globalThis.fetch;
  try {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("turnstile")) {
        return Response.json({
          success: true,
          action: "music_submission",
          hostname: "nextgensessions.com"
        });
      }
      if (String(url).includes("resend.com")) {
        return Response.json({ data: [{ id: "admin" }, { id: "artist" }] });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const accepted = await onRequestPost(context({
      ...basePayload,
      artistName: "Test <Artist>",
      summary: "Strong & finished <script>alert(1)</script>"
    }));
    const acceptedBody = await body(accepted);
    assert.equal(accepted.status, 201);
    assert.equal(acceptedBody.ok, true);
    assert.match(acceptedBody.reference, /^NGS-[0-9A-F]{12}$/);
    assert.equal(calls.length, 2);

    const turnstileCall = calls[0];
    assert.equal(turnstileCall.options.body.has("idempotency_key"), false);

    const resendCall = calls[1];
    assert.equal(resendCall.options.headers["idempotency-key"], `ngs-submission/${basePayload.clientRequestId}`);
    const emails = JSON.parse(resendCall.options.body);
    assert.equal(emails.length, 2);
    assert.deepEqual(emails[0].to, ["owner@example.com"]);
    assert.deepEqual(emails[1].to, ["artist@example.com"]);
    assert.match(emails[1].text, /3–5 working days/);
    assert.doesNotMatch(emails[0].html, /<script>/);
    assert.match(emails[0].html, /&lt;script&gt;/);

    calls.length = 0;
    const invalidLink = await onRequestPost(context({ ...basePayload, listeningLink: "javascript:alert(1)" }));
    assert.equal(invalidLink.status, 400);
    assert.equal((await body(invalidLink)).error, "invalid_listening_link");
    assert.equal(calls.length, 0);

    calls.length = 0;
    const invalidConsent = await onRequestPost(context({ ...basePayload, consent: false }));
    assert.equal(invalidConsent.status, 400);
    assert.equal((await body(invalidConsent)).error, "consent_required");
    assert.equal(calls.length, 0);

    calls.length = 0;
    globalThis.fetch = async url => {
      calls.push(String(url));
      return Response.json({ success: false, action: "music_submission" });
    };
    const failedChallenge = await onRequestPost(context());
    assert.equal(failedChallenge.status, 400);
    assert.equal((await body(failedChallenge)).error, "spam_check_failed");
    assert.equal(calls.length, 1);

    calls.length = 0;
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("turnstile")) {
        return Response.json({
          success: false,
          "error-codes": ["invalid-input-secret"]
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };
    const invalidSecret = await onRequestPost(context());
    assert.equal(invalidSecret.status, 400);
    assert.equal((await body(invalidSecret)).error, "spam_check_failed");
    assert.equal(calls.length, 1);

    calls.length = 0;
    globalThis.fetch = async url => {
      calls.push(String(url));
      return Response.json({
        success: true,
        action: "music_submission",
        hostname: "attacker.example"
      });
    };
    const wrongHostname = await onRequestPost(context());
    assert.equal(wrongHostname.status, 400);
    assert.equal((await body(wrongHostname)).error, "spam_check_failed");
    assert.equal(calls.length, 1);

    calls.length = 0;
    const honeypot = await onRequestPost(context({ ...basePayload, website: "https://spam.example" }));
    assert.equal(honeypot.status, 200);
    assert.equal((await body(honeypot)).ok, true);
    assert.equal(calls.length, 0);

    const crossOriginRequest = new Request(endpoint, {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
        "content-type": "application/json"
      },
      body: JSON.stringify(basePayload)
    });
    const crossOrigin = await onRequestPost({ request: crossOriginRequest, env });
    assert.equal(crossOrigin.status, 403);

    const oversizedRequest = new Request(endpoint, {
      method: "POST",
      headers: {
        origin: "https://nextgensessions.com",
        "sec-fetch-site": "same-origin",
        "content-type": "application/json"
      },
      body: JSON.stringify({ ...basePayload, summary: "x".repeat(50 * 1024) })
    });
    const oversized = await onRequestPost({ request: oversizedRequest, env });
    assert.equal(oversized.status, 413);

    const readyConfig = await getSubmissionConfig({ env });
    assert.deepEqual(await body(readyConfig), { enabled: true, siteKey: "site-key" });
    const disabledConfig = await getSubmissionConfig({ env: { TURNSTILE_SITE_KEY: "site-key" } });
    assert.deepEqual(await body(disabledConfig), { enabled: false, siteKey: "" });
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("Submission flow tests passed");
}

await run();
