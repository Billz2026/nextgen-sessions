function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export function onRequestGet(context) {
  const siteKey = String(context.env?.TURNSTILE_SITE_KEY || "").trim();
  const ready = Boolean(
    siteKey &&
    context.env?.TURNSTILE_SECRET_KEY &&
    context.env?.RESEND_API_KEY &&
    context.env?.SUBMISSION_RECIPIENT
  );

  return json({
    enabled: ready,
    siteKey: ready ? siteKey : ""
  });
}

export function onRequestPost() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
