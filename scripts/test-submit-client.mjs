import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";

const source = await readFile(new URL("../submit.js", import.meta.url), "utf8");
const listeners = new Map();
const requests = [];
let turnstileOptions;
let executeCount = 0;
let resetCount = 0;

function element(extra = {}) {
  return {
    hidden: false,
    disabled: false,
    textContent: "",
    className: "",
    setAttribute() {},
    addEventListener(type, listener) { listeners.set(type, listener); },
    reportValidity() { return true; },
    reset() {},
    scrollIntoView() {},
    focus() {},
    ...extra
  };
}

const elements = {
  musicSubmissionForm: element(),
  submitButton: element(),
  formStatus: element(),
  successBox: element({ hidden: true }),
  successCopy: element(),
  turnstileMount: element()
};

const document = {
  head: {
    append(script) {
      queueMicrotask(() => script.onload());
    }
  },
  getElementById(id) { return elements[id] || null; },
  createElement() { return {}; },
  dispatchEvent() {}
};

const fields = new Map([
  ["artistName", "Test Artist"],
  ["trackTitle", "Fresh Token"],
  ["email", "artist@example.com"],
  ["social", "@artist"],
  ["genre", "Hip-Hop"],
  ["listeningLink", "https://soundcloud.com/artist/track"],
  ["location", "London"],
  ["releaseStatus", "Unreleased"],
  ["summary", "A finished track."],
  ["consent", "yes"],
  ["website", ""]
]);

const window = {
  turnstile: {
    render(_mount, options) {
      turnstileOptions = options;
      return 7;
    },
    execute(widgetId) {
      assert.equal(widgetId, 7);
      executeCount += 1;
    },
    reset(widgetId) {
      assert.equal(widgetId, 7);
      resetCount += 1;
    }
  }
};

const context = {
  window,
  document,
  crypto: webcrypto,
  FormData: class { get(name) { return fields.get(name) ?? null; } },
  CustomEvent: class {},
  queueMicrotask,
  console,
  fetch: async (url, options = {}) => {
    requests.push({ url, options });
    if (url === "/api/submission-config") {
      return Response.json({ enabled: true, siteKey: "site-key" });
    }
    if (url === "/api/submit") {
      return Response.json({ ok: true, reference: "NGS-123456789ABC" }, { status: 201 });
    }
    throw new Error(`Unexpected request ${url}`);
  },
  Response,
  setTimeout,
  clearTimeout
};

vm.runInNewContext(source, context);
await new Promise(resolve => setTimeout(resolve, 0));

assert.equal(turnstileOptions.execution, "execute");
assert.equal(turnstileOptions.appearance, "interaction-only");
assert.equal(turnstileOptions["refresh-expired"], "auto");
assert.equal(elements.submitButton.disabled, false);

await listeners.get("submit")({ preventDefault() {} });
assert.equal(executeCount, 1);
assert.equal(requests.filter(request => request.url === "/api/submit").length, 0);

turnstileOptions.callback("fresh-token");
await new Promise(resolve => setTimeout(resolve, 0));

const submission = requests.find(request => request.url === "/api/submit");
assert.ok(submission);
assert.equal(JSON.parse(submission.options.body).turnstileToken, "fresh-token");
assert.equal(resetCount, 1);
assert.equal(elements.successBox.hidden, false);

console.log("Submission client lifecycle tests passed");
