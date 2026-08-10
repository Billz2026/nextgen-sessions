function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff"
    }
  });
}

function errorCodes(result) {
  if (!Array.isArray(result?.["error-codes"])) return [];
  return result["error-codes"]
    .map(code => String(code))
    .filter(code => /^[a-z0-9_-]{1,80}$/i.test(code))
    .slice(0, 6);
}

export async function onRequestGet(context) {
  const secret = String(context.env?.TURNSTILE_SECRET_KEY || "");
  if (!secret) {
    return json({ ok: false, turnstile: "missing_secret" }, 503);
  }

  const formData = new FormData();
  formData.set("secret", secret);
  formData.set("response", "nextgen-secret-health-check");

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      return json({ ok: false, turnstile: "siteverify_unavailable", status: response.status }, 503);
    }

    const result = await response.json();
    const codes = errorCodes(result);
    if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
      return json({ ok: false, turnstile: "invalid_secret" }, 503);
    }
    if (codes.includes("invalid-input-response")) {
      return json({ ok: true, turnstile: "secret_valid" });
    }

    return json({ ok: false, turnstile: "inconclusive", errorCodes: codes }, 503);
  } catch (_) {
    return json({ ok: false, turnstile: "siteverify_unavailable" }, 503);
  }
}

export function onRequestPost() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
