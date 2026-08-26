(() => {
  "use strict";

  const loginPanel = document.getElementById("analyticsLoginPanel");
  const dashboard = document.getElementById("analyticsDashboard");
  const loginForm = document.getElementById("analyticsLoginForm");
  const keyInput = document.getElementById("analyticsKey");
  const loginStatus = document.getElementById("analyticsLoginStatus");
  const logout = document.getElementById("analyticsLogout");
  const updated = document.getElementById("analyticsUpdated");
  const errorNode = document.getElementById("analyticsError");
  const rangeButtons = [...document.querySelectorAll("[data-range]")];

  const metricNodes = {
    pageViews: document.getElementById("metricPageViews"),
    releasePlays: document.getElementById("metricReleasePlays"),
    discovery: document.getElementById("metricDiscovery"),
    youtube: document.getElementById("metricYoutube"),
    searches: document.getElementById("metricSearches"),
    social: document.getElementById("metricSocial"),
  };

  let currentRange = "7d";
  let loading = false;

  function n(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.round(n(value)));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showLogin(message = "") {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    logout.hidden = true;
    loginStatus.textContent = message;
    errorNode.hidden = true;
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    logout.hidden = false;
  }

  function setError(message = "") {
    errorNode.textContent = message;
    errorNode.hidden = !message;
  }

  function empty(copy) {
    return `<p class="analytics-empty">${escapeHtml(copy)}</p>`;
  }

  function renderReleases(items) {
    const node = document.getElementById("analyticsTopReleases");
    if (!Array.isArray(items) || !items.length) {
      node.innerHTML = empty("No qualified release engagement in this range yet.");
      return;
    }
    node.innerHTML = items.slice(0, 10).map((item, index) => `<div class="analytics-ranked-item">
      <span class="analytics-rank">${index + 1}</span>
      <div class="analytics-item-copy"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(item.title)}</strong></a><small>${escapeHtml(item.artist)} · ${escapeHtml(item.genre || "NextGen Sessions")}</small></div>
      <div class="analytics-item-stats"><span><b>${formatNumber(item.plays)}</b> plays</span><span><b>${formatNumber(item.clicks)}</b> clicks</span><span><b>${formatNumber(item.discoveryClicks)}</b> discovery</span></div>
    </div>`).join("");
  }

  function renderCompact(nodeId, items, valueKey = "score", emptyCopy = "No data in this range yet.") {
    const node = document.getElementById(nodeId);
    if (!Array.isArray(items) || !items.length) {
      node.innerHTML = empty(emptyCopy);
      return;
    }
    node.innerHTML = items.slice(0, 10).map((item) => {
      const label = item.name || item.title || item.path || item.label || "Unknown";
      const url = item.url || "";
      const labelHtml = url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`
        : `<span>${escapeHtml(label)}</span>`;
      return `<div class="analytics-compact-item"><div class="analytics-item-copy">${labelHtml}${item.type ? `<small>${escapeHtml(item.type)}</small>` : ""}</div><span>${formatNumber(item[valueKey])}</span></div>`;
    }).join("");
  }

  function renderPages(items) {
    const node = document.getElementById("analyticsTopPages");
    if (!Array.isArray(items) || !items.length) {
      node.innerHTML = empty("No pageview data in this range yet.");
      return;
    }
    node.innerHTML = items.slice(0, 10).map((item) => `<div class="analytics-compact-item"><div class="analytics-item-copy"><a href="${escapeHtml(item.path)}" target="_blank" rel="noopener">${escapeHtml(item.path)}</a></div><span>${formatNumber(item.total)}</span></div>`).join("");
  }

  function renderDaily(items) {
    const node = document.getElementById("analyticsDaily");
    if (!Array.isArray(items) || !items.length) {
      node.innerHTML = '<tr><td colspan="5">No daily activity in this range yet.</td></tr>';
      return;
    }
    node.innerHTML = items.map((item) => `<tr><td>${escapeHtml(item.day)}</td><td>${formatNumber(item.pageViews)}</td><td>${formatNumber(item.releasePlays)}</td><td>${formatNumber(item.releaseClicks)}</td><td>${formatNumber(item.artistClicks)}</td></tr>`).join("");
  }

  function render(payload) {
    const totals = payload?.totals || {};
    const discovery = n(totals.release_click) + n(totals.related_release_click) + n(totals.artist_click) + n(totals.related_artist_click) + n(totals.genre_click) + n(totals.new_this_week_click) + n(totals.trending_release_click);
    const social = n(totals.youtube_subscribe_click) + n(totals.social_follow_click);

    metricNodes.pageViews.textContent = formatNumber(totals.page_view);
    metricNodes.releasePlays.textContent = formatNumber(totals.release_play);
    metricNodes.discovery.textContent = formatNumber(discovery);
    metricNodes.youtube.textContent = formatNumber(totals.youtube_click);
    metricNodes.searches.textContent = formatNumber(totals.site_search);
    metricNodes.social.textContent = formatNumber(social);

    const stamp = payload?.generatedAt ? new Date(payload.generatedAt) : new Date();
    updated.textContent = `Aggregated production activity · last ${payload?.rangeDays || 7} day${payload?.rangeDays === 1 ? "" : "s"} · refreshed ${stamp.toLocaleString("en-GB")}`;

    renderReleases(payload?.topReleases);
    renderCompact("analyticsTopArtists", payload?.topArtists, "score", "No artist engagement in this range yet.");
    renderCompact("analyticsTopGenres", payload?.topGenres, "score", "No genre engagement in this range yet.");
    renderPages(payload?.topPages);
    renderCompact("analyticsTopSearches", payload?.topSearches, "total", "No privacy-safe catalogue searches in this range yet.");
    renderDaily(payload?.daily);
  }

  async function loadSummary(range = currentRange) {
    if (loading) return;
    loading = true;
    setError("");
    try {
      const response = await fetch(`/api/analytics-summary?range=${encodeURIComponent(range)}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        showLogin("");
        return;
      }
      if (!response.ok || payload?.ok !== true) {
        if (payload?.error === "analytics-not-configured") {
          showDashboard();
          setError("Analytics reading is not configured yet. Add CF_ACCOUNT_ID and CF_ANALYTICS_READ_TOKEN to the Cloudflare Pages production environment.");
          return;
        }
        throw new Error(payload?.error || `Analytics returned ${response.status}`);
      }
      showDashboard();
      render(payload);
    } catch (_) {
      showDashboard();
      setError("Analytics could not be loaded. The public website is unaffected; check the Cloudflare Analytics Engine read configuration.");
    } finally {
      loading = false;
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = keyInput.value;
    if (!key) return;
    loginStatus.textContent = "Checking…";
    try {
      const response = await fetch("/api/analytics-login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true) {
        loginStatus.textContent = payload?.error === "dashboard-not-configured"
          ? "The private dashboard key has not been configured in Cloudflare yet."
          : "That operations key was not accepted.";
        return;
      }
      keyInput.value = "";
      loginStatus.textContent = "";
      await loadSummary(currentRange);
    } catch (_) {
      loginStatus.textContent = "The dashboard login service is temporarily unavailable.";
    }
  });

  logout.addEventListener("click", async () => {
    await fetch("/api/analytics-logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    showLogin("Signed out.");
  });

  for (const button of rangeButtons) {
    button.addEventListener("click", () => {
      currentRange = button.dataset.range || "7d";
      rangeButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      loadSummary(currentRange);
    });
  }

  loadSummary(currentRange);
})();
