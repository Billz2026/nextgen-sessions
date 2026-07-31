(function () {
  "use strict";

  const root = document.getElementById("artistProfile");
  if (!root) return;

  const slug = String(root.dataset.artist || "").trim();
  const albumLibrary = {
    "renz-cole": [
      {
        title: "Playmaker",
        year: "2026",
        coverVideoId: "ms-IKCbxjlY",
        description: "A football-coded UK rap project built around self-belief, movement, pressure and creating chances without waiting for permission.",
        tracks: [
          { id: "ms-IKCbxjlY", title: "Playmaker" },
          { id: "4TFIW-WTuww", title: "No Assist Ting" },
          { id: "XUXUyj5uHkM", title: "They Know Now" },
          { id: "02d0BdKLyBA", title: "Catch My Wave" },
          { id: "s0ZS2HJjw2M", title: "False Nine" }
        ]
      }
    ],
    "reeko": [
      {
        title: "Mi Call Di Shots",
        year: "2026",
        coverVideoId: "ks4bSmghnDI",
        description: "A Jamaican dancehall project centred on authority, survival, loyalty and controlled gullyside pressure.",
        tracks: [
          { id: "ks4bSmghnDI", title: "Mi Call Di Shots" },
          { id: "wvMNh7u0C4E", title: "Ride Wid Mi", note: "with Keisha" },
          { id: "C6eDlpA08pg", title: "Ready Fi War" },
          { id: "7gXvSVq-T_c", title: "Gully Boss" },
          { id: "uB8nYq1co8c", title: "Nuh Love Round Ya" }
        ]
      }
    ],
    "kemar-ranka": [
      {
        title: "Top Ranka",
        year: "2026",
        coverVideoId: "ZR6vqKxmngw",
        description: "A dancehall project built around rank, pressure and the weight that comes with carrying the crown.",
        tracks: [
          { id: "ZR6vqKxmngw", title: "Top Ranka" },
          { id: "AMdc_Z9bh30", title: "Crown Heavy" }
        ]
      }
    ]
  };

  const albums = albumLibrary[slug];
  if (!Array.isArray(albums) || !albums.length) return;

  if (!document.querySelector('link[href="/artist-albums.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/artist-albums.css";
    document.head.append(stylesheet);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
  }

  function albumSearchUrl(album) {
    const artistName = window.NGS_ARTIST_PROFILES?.[slug]?.name || slug.replaceAll("-", " ");
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent(`NextGen Sessions ${artistName} ${album.title}`);
  }

  function trackMarkup(track) {
    const id = safeVideoId(track.id);
    if (!id) return "";
    return `
      <li class="album-track">
        <div>
          <strong>${escapeHtml(track.title)}</strong>
          ${track.note ? `<span>${escapeHtml(track.note)}</span>` : ""}
        </div>
        <div class="album-track-actions">
          <button type="button" data-play-release="${escapeHtml(id)}">Play here</button>
          <a href="https://www.youtube.com/watch?v=${escapeHtml(id)}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(track.title)} on YouTube">YouTube ↗</a>
        </div>
      </li>`;
  }

  function albumMarkup(album) {
    const coverVideoId = safeVideoId(album.coverVideoId || album.tracks?.[0]?.id);
    const trackCount = Array.isArray(album.tracks) ? album.tracks.filter(track => safeVideoId(track.id)).length : 0;
    return `
      <article class="album-card">
        <div class="album-cover" data-monogram="${escapeHtml(album.title.slice(0, 2).toUpperCase())}">
          ${coverVideoId ? `<img loading="lazy" decoding="async" src="/api/release-image?id=${encodeURIComponent(coverVideoId)}" alt="${escapeHtml(album.title)} cover artwork">` : ""}
          <span class="album-badge">Album</span>
        </div>
        <div class="album-copy">
          <div class="album-meta"><span>${escapeHtml(album.year || "")}</span><span>${trackCount} included release${trackCount === 1 ? "" : "s"}</span></div>
          <h3>${escapeHtml(album.title)}</h3>
          <p>${escapeHtml(album.description || "")}</p>
          <ul class="album-track-list" aria-label="Included releases from ${escapeHtml(album.title)}">
            ${(album.tracks || []).map(trackMarkup).join("")}
          </ul>
          <a class="button button-secondary album-search" href="${escapeHtml(albumSearchUrl(album))}" target="_blank" rel="noopener">Find album on YouTube</a>
        </div>
      </article>`;
  }

  function mountAlbums() {
    if (root.querySelector("#artist-albums")) return true;
    const discography = root.querySelector("#artist-discography");
    if (!discography) return false;

    const section = document.createElement("section");
    section.className = "profile-section album-section";
    section.id = "artist-albums";
    section.setAttribute("aria-labelledby", "artist-albums-title");
    section.innerHTML = `
      <div class="profile-section-heading album-heading">
        <div>
          <p class="eyebrow">Albums and projects</p>
          <h2 id="artist-albums-title">Complete projects.</h2>
        </div>
        <p>Album releases remain grouped together while every individual song also stays available in the full catalogue below.</p>
      </div>
      <div class="album-grid">${albums.map(albumMarkup).join("")}</div>`;

    discography.insertAdjacentElement("beforebegin", section);

    section.addEventListener("error", event => {
      const image = event.target.closest(".album-cover img");
      if (!image) return;
      image.hidden = true;
      image.parentElement?.classList.add("image-unavailable");
    }, true);

    return true;
  }

  if (!mountAlbums()) {
    const observer = new MutationObserver(() => {
      if (mountAlbums()) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 5000);
  }
})();
