(function () {
  "use strict";

  const artists = Array.isArray(window.NGS_ARTISTS) ? window.NGS_ARTISTS : [];
  const featuredGrid = document.getElementById("featuredArtistGrid");
  const rosterGrid = document.getElementById("artistRosterGrid");
  const artistSearch = document.getElementById("artistSearch");
  const rosterCount = document.getElementById("rosterCount");
  const releaseGrid = document.getElementById("releaseGrid");

  const FALLBACK_RELEASES = [
    { id: "w8DSI4HZKnM", title: "Creep With The Wolf" },
    { id: "8YFWjkhWilc", title: "Man Moves Different Now" },
    { id: "Qr1gNggtg8k", title: "Ride On My Enemies" },
    { id: "Zkb80UYO0pY", title: "Money in the Bando" },
    { id: "5YgrpFXZ92Q", title: "Marked for War" },
    { id: "ccwwJFDErvg", title: "Bulletproof Mind" }
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function monogram(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "NG";
    return words.slice(0, 2).map(word => word[0]).join("").toUpperCase();
  }

  function youtubeSearchUrl(name) {
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent("NextGen Sessions " + name);
  }

  function featuredCard(artist, index) {
    return `
      <a class="featured-artist-card" data-monogram="${escapeHtml(monogram(artist.name))}" href="${youtubeSearchUrl(artist.name)}" target="_blank" rel="noopener" aria-label="Explore ${escapeHtml(artist.name)} on YouTube">
        <span class="artist-position">Featured ${String(index + 1).padStart(2, "0")}</span>
        <div class="featured-artist-inner">
          <span class="artist-genre">${escapeHtml(artist.genre)}</span>
          <h3>${escapeHtml(artist.name)}</h3>
          <p>${escapeHtml(artist.summary)}</p>
        </div>
      </a>`;
  }

  function rosterCard(artist) {
    return `
      <a class="artist-roster-card" data-monogram="${escapeHtml(monogram(artist.name))}" href="${youtubeSearchUrl(artist.name)}" target="_blank" rel="noopener" aria-label="Explore ${escapeHtml(artist.name)} on YouTube">
        <span class="artist-genre">${escapeHtml(artist.genre)}</span>
        <h3>${escapeHtml(artist.name)}</h3>
        <p>${escapeHtml(artist.summary)}</p>
      </a>`;
  }

  function renderFeatured() {
    if (!featuredGrid) return;
    const featured = artists.filter(artist => artist.featured).slice(0, 6);
    featuredGrid.innerHTML = featured.map(featuredCard).join("");
  }

  function renderRoster(query) {
    if (!rosterGrid) return;
    const term = String(query || "").trim().toLowerCase();
    const filtered = artists
      .filter(artist => !term || [artist.name, artist.genre, artist.summary].join(" ").toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "en-GB"));

    rosterGrid.innerHTML = filtered.map(rosterCard).join("");
    if (rosterCount) {
      rosterCount.textContent = `${filtered.length} artist${filtered.length === 1 ? "" : "s"}${term ? " found" : ""}`;
    }
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function releaseCard(release) {
    const id = escapeHtml(release.id);
    const title = escapeHtml(release.title || "NextGen Sessions release");
    const date = formatDate(release.published);
    return `
      <a class="release-card" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">
        <img loading="lazy" decoding="async" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${title} release thumbnail">
        <div class="release-meta">
          <span class="tag">Official release</span>
          <h3>${title}</h3>
          <p>Watch on YouTube</p>
          ${date ? `<span class="release-date">${escapeHtml(date)}</span>` : ""}
        </div>
      </a>`;
  }

  function updateLatest(releases, source) {
    const valid = Array.isArray(releases) && releases.length ? releases : FALLBACK_RELEASES;
    const latest = valid[0];
    const frame = document.getElementById("latestVideoFrame");
    const latestTitle = document.getElementById("latestVideoTitle");
    const latestDate = document.getElementById("latestVideoDate");
    const latestLink = document.getElementById("latestWatchLink");
    const heroLink = document.getElementById("heroLatestLink");
    const latestStatus = document.getElementById("latestStatus");

    if (frame) {
      frame.src = `https://www.youtube-nocookie.com/embed/${latest.id}?rel=0&modestbranding=1`;
      frame.title = latest.title || "Latest NextGen Sessions release";
    }
    if (latestTitle) latestTitle.textContent = latest.title || "Latest NextGen Sessions release";
    if (latestDate) {
      const date = formatDate(latest.published);
      latestDate.textContent = date ? `Published ${date}` : "Latest official NextGen Sessions release";
    }
    const watchUrl = `https://www.youtube.com/watch?v=${latest.id}`;
    if (latestLink) latestLink.href = watchUrl;
    if (heroLink) heroLink.href = watchUrl;
    if (latestStatus) {
      latestStatus.textContent = source === "youtube"
        ? "Updated automatically from the official releases feed"
        : "Reliable catalogue fallback active";
    }
    if (releaseGrid) releaseGrid.innerHTML = valid.slice(0, 6).map(releaseCard).join("");
  }

  renderFeatured();
  renderRoster("");

  if (artistSearch) {
    artistSearch.addEventListener("input", event => renderRoster(event.target.value));
  }

  fetch("/api/latest", { headers: { Accept: "application/json" } })
    .then(response => {
      if (!response.ok) throw new Error("Latest release endpoint unavailable");
      return response.json();
    })
    .then(data => updateLatest(data.items, data.source))
    .catch(() => updateLatest(FALLBACK_RELEASES, "fallback"));
})();
