import { clearDashboardSession } from "../_lib/dashboard-auth.js";
import { json } from "../_lib/analytics.js";

export function onRequestPost() {
  return json(
    { ok: true },
    200,
    { "set-cookie": clearDashboardSession() },
  );
}

export function onRequestGet() {
  return json({ ok: false }, 405);
}
