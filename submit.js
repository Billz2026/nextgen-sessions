(() => {
  const form = document.getElementById("musicSubmissionForm");
  const submitButton = document.getElementById("submitButton");
  const formStatus = document.getElementById("formStatus");
  const successBox = document.getElementById("successBox");
  const successCopy = document.getElementById("successCopy");
  const turnstileMount = document.getElementById("turnstileMount");
  if (!form || !submitButton || !formStatus || !successBox || !successCopy || !turnstileMount) return;

  let turnstileWidget = null;
  let turnstileToken = "";
  let clientRequestId = crypto.randomUUID();
  let lastPayloadSignature = "";

  function setStatus(message, type = "") {
    formStatus.textContent = message;
    formStatus.className = `form-status${type ? ` form-status-${type}` : ""}`;
  }

  function setSubmitting(submitting) {
    form.setAttribute("aria-busy", String(submitting));
    submitButton.disabled = submitting || !turnstileToken;
    submitButton.textContent = submitting ? "Submitting…" : "Submit music";
  }

  function resetTurnstile() {
    turnstileToken = "";
    submitButton.disabled = true;
    if (turnstileWidget !== null && window.turnstile) {
      window.turnstile.reset(turnstileWidget);
    }
  }

  function loadTurnstile(siteKey) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        turnstileWidget = window.turnstile.render(turnstileMount, {
          sitekey: siteKey,
          theme: "dark",
          action: "music_submission",
          callback(token) {
            turnstileToken = token;
            submitButton.disabled = false;
            setStatus("Secure submission check complete.", "ready");
          },
          "expired-callback"() {
            turnstileToken = "";
            submitButton.disabled = true;
            setStatus("The security check expired. Please complete it again.", "error");
          },
          "error-callback"() {
            turnstileToken = "";
            submitButton.disabled = true;
            setStatus("The security check could not load. Please refresh and try again.", "error");
          }
        });
        resolve();
      };
      script.onerror = reject;
      document.head.append(script);
    });
  }

  async function initialise() {
    submitButton.disabled = true;
    setStatus("Loading secure submission form…");
    try {
      const response = await fetch("/api/submission-config", {
        headers: { accept: "application/json" },
        cache: "no-store"
      });
      const config = await response.json();
      if (!response.ok || !config.enabled || !config.siteKey) throw new Error("not_ready");
      await loadTurnstile(config.siteKey);
      setStatus("Complete the security check, then submit your track.");
    } catch (_) {
      setStatus("Submissions are temporarily unavailable. Please try again later.", "error");
      turnstileMount.hidden = true;
    }
  }

  function payloadFromForm() {
    const fields = new FormData(form);
    return {
      artistName: fields.get("artistName"),
      trackTitle: fields.get("trackTitle"),
      email: fields.get("email"),
      social: fields.get("social"),
      genre: fields.get("genre"),
      listeningLink: fields.get("listeningLink"),
      location: fields.get("location"),
      releaseStatus: fields.get("releaseStatus"),
      summary: fields.get("summary"),
      consent: fields.get("consent") === "yes",
      website: fields.get("website"),
      clientRequestId,
      turnstileToken
    };
  }

  function payloadSignature(payload) {
    const { turnstileToken: _token, clientRequestId: _requestId, ...fields } = payload;
    return JSON.stringify(fields);
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    successBox.hidden = true;
    if (!form.reportValidity()) return;
    if (!turnstileToken) {
      setStatus("Please complete the security check before submitting.", "error");
      return;
    }

    let payload = payloadFromForm();
    const signature = payloadSignature(payload);
    if (lastPayloadSignature && signature !== lastPayloadSignature) {
      clientRequestId = crypto.randomUUID();
      payload = payloadFromForm();
    }
    lastPayloadSignature = signature;
    setSubmitting(true);
    setStatus("Securely sending your submission…");

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "submission_failed");

      const artistName = String(payload.artistName || "").trim();
      successCopy.textContent = `Thank you${artistName ? `, ${artistName}` : ""}. Please allow 3–5 working days for feedback. Your reference is ${result.reference}. A confirmation email has been sent to you.`;
      successBox.hidden = false;
      form.reset();
      clientRequestId = crypto.randomUUID();
      lastPayloadSignature = "";
      resetTurnstile();
      setStatus("Submission complete.", "ready");
      successBox.scrollIntoView({ behavior: "smooth", block: "center" });
      document.dispatchEvent(new CustomEvent("ngs:submission-complete"));
    } catch (error) {
      const code = error instanceof Error ? error.message : "submission_failed";
      const message = code === "spam_check_failed"
        ? "The security check expired. Please complete it again and resubmit."
        : "We could not send your submission. Your details are still here—please try again.";
      setStatus(message, "error");
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  });

  initialise();
})();
