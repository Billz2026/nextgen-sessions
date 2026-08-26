const COOKIE_NAME = "ngs_analytics_session";
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64url(new Uint8Array(signature));
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

export function dashboardConfigured(env) {
  return String(env?.ANALYTICS_DASHBOARD_KEY || "").trim().length >= 16;
}

export function dashboardKeyMatches(env, candidate) {
  const expected = String(env?.ANALYTICS_DASHBOARD_KEY || "").trim();
  return expected.length >= 16 && constantTimeEqual(expected, String(candidate || ""));
}

export async function issueDashboardSession(env) {
  const secret = String(env?.ANALYTICS_DASHBOARD_KEY || "").trim();
  if (secret.length < 16) throw new Error("Dashboard key is not configured");
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v1.${expires}`;
  const signature = await hmac(secret, payload);
  const value = `${payload}.${signature}`;
  return `${COOKIE_NAME}=${value}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function clearDashboardSession() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export async function hasValidDashboardSession(request, env) {
  const secret = String(env?.ANALYTICS_DASHBOARD_KEY || "").trim();
  if (secret.length < 16) return false;
  const cookie = readCookie(request, COOKIE_NAME);
  const match = cookie.match(/^v1\.(\d{10,})\.([A-Za-z0-9_-]{20,})$/);
  if (!match) return false;
  const expires = Number(match[1]);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const payload = `v1.${expires}`;
  const expected = await hmac(secret, payload);
  return constantTimeEqual(expected, match[2]);
}
