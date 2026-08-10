const MAX_BODY_BYTES = 48 * 1024;
const MAX_TEXT = {
  artistName: 100,
  trackTitle: 140,
  email: 254,
  social: 100,
  location: 120,
  summary: 700,
  listeningLink: 2048,
  clientRequestId: 64,
  turnstileToken: 4096
};

const GENRES = new Set([
  "Hip-Hop",
  "UK Rap / Grime",
  "Dancehall / Reggae",
  "R&B / Soul",
  "Punjabi",
  "Global Sounds",
  "Other"
]);

const RELEASE_STATUSES = new Set([
  "Unreleased",
  "Coming soon",
  "Already released"
]);

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

function clean(value, limit) {
  return String(value || "").trim().replace(/\r\n?/g, "\n").slice(0, limit);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function withBreaks(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function validEmail(value) {
  return value.length <= MAX_TEXT.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch (_) {
    return false;
  }
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("body_too_large");
  if (!request.body) throw new Error("invalid_body");

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("body_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}

function normalise(body) {
  return {
    artistName: clean(body?.artistName, MAX_TEXT.artistName),
    trackTitle: clean(body?.trackTitle, MAX_TEXT.trackTitle),
    email: clean(body?.email, MAX_TEXT.email).toLowerCase(),
    social: clean(body?.social, MAX_TEXT.social),
    genre: clean(body?.genre, 40),
    listeningLink: clean(body?.listeningLink, MAX_TEXT.listeningLink),
    location: clean(body?.location, MAX_TEXT.location),
    releaseStatus: clean(body?.releaseStatus, 40),
    summary: clean(body?.summary, MAX_TEXT.summary),
    clientRequestId: clean(body?.clientRequestId, MAX_TEXT.clientRequestId),
    turnstileToken: clean(body?.turnstileToken, MAX_TEXT.turnstileToken),
    consent: body?.consent === true,
    website: clean(body?.website, 120)
  };
}

function validate(data) {
  if (!data.artistName || !data.trackTitle || !data.summary) return "missing_required_field";
  if (!validEmail(data.email)) return "invalid_email";
  if (!GENRES.has(data.genre)) return "invalid_genre";
  if (data.releaseStatus && !RELEASE_STATUSES.has(data.releaseStatus)) return "invalid_release_status";
  if (!validHttpsUrl(data.listeningLink)) return "invalid_listening_link";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.clientRequestId)) {
    return "invalid_request_id";
  }
  if (!data.turnstileToken) return "missing_spam_check";
  if (!data.consent) return "consent_required";
  return "";
}

async function submissionReference(clientRequestId) {
  const bytes = new TextEncoder().encode(clientRequestId);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const shortHash = Array.from(digest.slice(0, 6), byte => byte.toString(16).padStart(2, "0")).join("");
  return `NGS-${shortHash.toUpperCase()}`;
}

function turnstileErrorCodes(result) {
  if (!Array.isArray(result?.["error-codes"])) return [];
  return result["error-codes"]
    .map(code => String(code))
    .filter(code => /^[a-z0-9_-]{1,80}$/i.test(code))
    .slice(0, 6);
}

async function verifyTurnstile(context, token) {
  const secret = String(context.env?.TURNSTILE_SECRET_KEY || "");
  if (!secret) {
    return { valid: false, reason: "missing_secret", errorCodes: [] };
  }

  const formData = new FormData();
  formData.set("secret", secret);
  formData.set("response", token);
  const ip = context.request.headers.get("CF-Connecting-IP");
  if (ip) formData.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    return {
      valid: false,
      reason: "siteverify_http_error",
      status: response.status,
      errorCodes: []
    };
  }

  const result = await response.json();
  const requestHostname = new URL(context.request.url).hostname;
  const success = result?.success === true;
  const actionMatches = result?.action === "music_submission";
  const hostnameMatches = result?.hostname === requestHostname;

  return {
    valid: success && actionMatches && hostnameMatches,
    reason: !success
      ? "siteverify_rejected"
      : !actionMatches
        ? "action_mismatch"
        : !hostnameMatches
          ? "hostname_mismatch"
          : "verified",
    errorCodes: turnstileErrorCodes(result),
    action: typeof result?.action === "string" ? result.action.slice(0, 80) : "",
    hostname: typeof result?.hostname === "string" ? result.hostname.slice(0, 253) : ""
  };
}

function emailShell(content) {
  return `<!doctype html><html><body style="margin:0;background:#080808;color:#f6f1e3;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="padding:18px 22px;border:1px solid #493b16;border-radius:16px;background:#111"><div style="margin-bottom:22px;color:#f3c74f;font-size:22px;font-weight:800;letter-spacing:.08em">NEXTGEN SESSIONS</div>${content}</div><p style="margin:18px 4px 0;color:#8f897d;font-size:12px">NextGen Sessions · Independent music and artist discovery</p></div></body></html>`;
}

function confirmationEmail(data, reference, fromAddress) {
  const artist = escapeHtml(data.artistName);
  const track = escapeHtml(data.trackTitle);
  return {
    from: `NextGen Sessions <${fromAddress}>`,
    to: [data.email],
    reply_to: fromAddress,
    subject: `Submission received — ${reference}`,
    text: `Hi ${data.artistName},\n\nThis confirms that NextGen Sessions received your submission for “${data.trackTitle}”.\n\nStatus: Awaiting review\nReference: ${reference}\n\nPlease allow 3–5 working days for feedback. Submission does not guarantee placement or release.\n\nNextGen Sessions`,
    html: emailShell(`<h1 style="margin:0 0 14px;font-size:28px;line-height:1.15">Submission received</h1><p style="margin:0 0 16px;color:#cec7b9;line-height:1.65">Hi ${artist}, this confirms that we received your submission for <strong style="color:#fff">“${track}”</strong>.</p><div style="margin:20px 0;padding:16px;border-left:3px solid #f3c74f;background:#19170f"><div style="margin-bottom:6px;color:#f3c74f;font-weight:800">AWAITING REVIEW</div><div style="color:#fff;font-size:18px;font-weight:700">Please allow 3–5 working days for feedback.</div></div><p style="margin:0 0 8px;color:#cec7b9"><strong style="color:#fff">Reference:</strong> ${reference}</p><p style="margin:18px 0 0;color:#8f897d;font-size:13px;line-height:1.55">Please keep this email for your records. Submission does not guarantee placement or release.</p>`),
    headers: { "X-Entity-Ref-ID": reference },
    tags: [{ name: "submission_ref", value: reference }]
  };
}

function reviewEmail(data, reference, recipient, fromAddress) {
  const rows = [
    ["Reference", reference],
    ["Artist", data.artistName],
    ["Track", data.trackTitle],
    ["Email", data.email],
    ["Genre", data.genre],
    ["Release status", data.releaseStatus || "Not supplied"],
    ["Location", data.location || "Not supplied"],
    ["Social", data.social || "Not supplied"],
    ["Listening link", data.listeningLink]
  ].map(([label, value]) => `<tr><td style="padding:8px 12px 8px 0;color:#8f897d;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 0;color:#fff;word-break:break-word">${escapeHtml(value)}</td></tr>`).join("");

  return {
    from: `NextGen Submissions <${fromAddress}>`,
    to: [recipient],
    reply_to: data.email,
    subject: `[New submission] ${data.artistName} — ${data.trackTitle} (${reference})`,
    text: `New NextGen Sessions submission\n\nReference: ${reference}\nArtist: ${data.artistName}\nTrack: ${data.trackTitle}\nEmail: ${data.email}\nGenre: ${data.genre}\nRelease status: ${data.releaseStatus || "Not supplied"}\nLocation: ${data.location || "Not supplied"}\nSocial: ${data.social || "Not supplied"}\nListening link: ${data.listeningLink}\n\nSummary:\n${data.summary}`,
    html: emailShell(`<h1 style="margin:0 0 18px;font-size:25px">New music submission</h1><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table><h2 style="margin:22px 0 8px;color:#f3c74f;font-size:15px;text-transform:uppercase">Artist and track summary</h2><p style="margin:0;color:#cec7b9;line-height:1.65">${withBreaks(data.summary)}</p>`),
    headers: { "X-Entity-Ref-ID": reference },
    tags: [{ name: "submission_ref", value: reference }]
  };
}

async function sendEmails(context, data, reference) {
  const apiKey = String(context.env?.RESEND_API_KEY || "");
  const recipient = String(context.env?.SUBMISSION_RECIPIENT || "").trim();
  const fromAddress = String(context.env?.SUBMISSION_FROM_EMAIL || "submissions@nextgensessions.com").trim();
  if (!apiKey || !validEmail(recipient) || !validEmail(fromAddress)) {
    throw new Error("submission_service_not_configured");
  }

  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": `ngs-submission/${data.clientRequestId}`
    },
    body: JSON.stringify([
      reviewEmail(data, reference, recipient, fromAddress),
      confirmationEmail(data, reference, fromAddress)
    ])
  });

  if (!response.ok) {
    console.error(JSON.stringify({
      message: "submission email batch failed",
      status: response.status,
      reference
    }));
    throw new Error("email_delivery_failed");
  }
}

export async function onRequestPost(context) {
  const requestUrl = new URL(context.request.url);
  const origin = context.request.headers.get("origin");
  const fetchSite = context.request.headers.get("sec-fetch-site");
  const contentType = context.request.headers.get("content-type") || "";

  if (!origin || origin !== requestUrl.origin || fetchSite === "cross-site") {
    return json({ ok: false, error: "forbidden" }, 403);
  }
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json({ ok: false, error: "unsupported_media_type" }, 415);
  }

  let body;
  try {
    body = await readJson(context.request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_body";
    return json({ ok: false, error: code }, code === "body_too_large" ? 413 : 400);
  }

  const data = normalise(body);
  const reference = await submissionReference(data.clientRequestId || crypto.randomUUID());

  if (data.website) {
    return json({ ok: true, reference });
  }

  const validationError = validate(data);
  if (validationError) return json({ ok: false, error: validationError }, 400);

  let turnstileResult = { valid: false, reason: "verification_error", errorCodes: [] };
  try {
    turnstileResult = await verifyTurnstile(context, data.turnstileToken);
  } catch (error) {
    console.error(JSON.stringify({
      message: "turnstile verification request failed",
      reference
    }));
  }
  if (!turnstileResult.valid) {
    console.warn(JSON.stringify({
      message: "turnstile token rejected",
      reference,
      reason: turnstileResult.reason,
      errorCodes: turnstileResult.errorCodes,
      action: turnstileResult.action || "",
      hostname: turnstileResult.hostname || "",
      status: turnstileResult.status || 0
    }));
    return json({ ok: false, error: "spam_check_failed" }, 400);
  }

  try {
    await sendEmails(context, data, reference);
  } catch (error) {
    console.error(JSON.stringify({ message: "submission delivery failed", reference }));
    return json({ ok: false, error: "delivery_failed" }, 503);
  }

  console.log(JSON.stringify({ message: "submission accepted", reference }));
  return json({ ok: true, reference }, 201);
}

export function onRequestGet() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
