(function () {
  "use strict";

  const root = document.getElementById("artistProfile");
  if (!root) return;

  const slug = String(root.dataset.artist || "").trim();
  const profiles = window.NGS_ARTIST_PROFILES || {};
  const profile = profiles[slug] || {};

  const albumLibrary = {
    "renz-cole": [
      {
        title: "Playmaker",
        year: "2026",
        coverVideoId: "ms-IKCbxjlY",
        fullAlbumVideoId: "yU4fK6aSqEg",
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
        fullAlbumVideoId: "VwLzUxVabSQ",
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
        fullAlbumVideoId: "RBtL3sJQTTw",
        description: "A cinematic dancehall album built around rank, pressure, spiritual authority and the weight that comes with carrying the crown.",
        tracks: [
          { id: "ZR6vqKxmngw", title: "Top Ranka" },
          { id: "AMdc_Z9bh30", title: "Crown Heavy" }
        ]
      }
    ],
    "jay-starks": [
      {
        title: "Queens in My Soul",
        year: "2026",
        coverVideoId: "bB_APAjvIc8",
        fullAlbumVideoId: "Xj806cr_eS4",
        description: "A Queens-rooted hip-hop album shaped by neighbourhood memory, Jamaica Avenue perspective, ambition and long-term legacy.",
        tracks: [
          { id: "bB_APAjvIc8", title: "Queens in My Soul" },
          { id: "n6OLDR0PUkw", title: "Jamaica Avenue" },
          { id: "xLFZKSjvzl0", title: "No Shade In Queens" },
          { id: "PI3OXiRlcHU", title: "Architect of Havoc" }
        ]
      }
    ],
    "alonzo-ray": [
      {
        title: "Seasoned",
        year: "2026",
        coverVideoId: "PZtq68Vo7OU",
        fullAlbumVideoId: "PZtq68Vo7OU",
        description: "A mature West Coast hip-hop album built around experience, patience, spiritual alignment and long-term perspective.",
        tracks: []
      }
    ],
    "reiss": [
      {
        title: "Nothing Given",
        year: "2026",
        coverVideoId: "ULjYMdDHySM",
        fullAlbumVideoId: "ULjYMdDHySM",
        description: "A focused UK rap album centred on discipline, earned progress and refusing to expect shortcuts.",
        tracks: []
      }
    ],
    "voss-carter": [
      {
        title: "Heavyweight",
        year: "2026",
        coverVideoId: "tlv_IqPiV1Y",
        fullAlbumVideoId: "tlv_IqPiV1Y",
        description: "A composed West Coast hip-hop album about legacy, endurance, authority and the weight carried after success.",
        tracks: []
      }
    ]
  };

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

  function normaliseText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/[^a-zA-Z0-9'&]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function safeVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
  }

  function artistAliases() {
    const configured = Array.isArray(profile.catalogueAliases) ? profile.catalogueAliases : [];
    return [profile.name, ...configured].map(normaliseText).filter(Boolean);
  }

  function albumMatchesArtist(item) {
    const raw = normaliseText(item?.artist || item?.rawTitle || item?.title);
    if (!raw) return false;
    return artistAliases().some(alias => raw === alias || raw.includes(alias));
  }

  function cleanAlbumTitle(value) {
    return String(value || "")
      .replace(/\b(?:official\s+)?full\s+album\b/gi, "")
      .replace(/\b(?:official\s+)?album\s+(?:video|audio)\b/gi, "")
      .replace(/\b20\d{2}\b/g, "")
      .replace(/\bnextgen\s+sessions\b/gi, "")
      .replace(/\(\s*\)|\[\s*\]/g, "")
      .replace(/^\s*[-–—:|]+|[-–—:|]+\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function parseAlbumTitle(item) {
    const explicit = cleanAlbumTitle(item?.album || item?.albumTitle || "");
    if (explicit) return explicit;

    const rawTitle = String(item?.rawTitle || item?.title || "").trim();
    const aliases = [profile.name, ...(profile.catalogueAliases || [])].filter(Boolean);
    const segments = rawTitle.split("|").map(part => part.trim()).filter(Boolean);

    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const artistPattern = new RegExp(escaped, "i");
      const segment = segments.find(part => artistPattern.test(part));
      if (!segment) continue;
      const remainder = cleanAlbumTitle(
        segment
          .replace(new RegExp(`^.*?${escaped}\\s*[-–—:]?\\s*`, "i"), "")
          .replace(artistPattern, "")
      );
      if (remainder && !/^(?:full|album|official)$/i.test(remainder)) return remainder;
    }

    const fallback = segments.find(part => {
      const cleaned = cleanAlbumTitle(part);
      if (!cleaned) return false;
      if (/^(?:hip\s*hop|dancehall|reggae|uk\s*rap|r&b|soul|official)$/i.test(cleaned)) return false;
      return !aliases.some(alias => normaliseText(part).includes(normaliseText(alias)));
    });

    return cleanAlbumTitle(fallback || rawTitle) || "Untitled album";
  }

  function albumYear(item) {
    const explicit = String(item?.year || "").match(/20\d{2}/)?.[0];
    if (explicit) return explicit;
    const rawYear = String(item?.rawTitle || item?.title || "").match(/20\d{2}/)?.[0];
    if (rawYear) return rawYear;
    const date = new Date(item?.published || item?.publishedAt || "");
    return Number.isNaN(date.getTime()) ? "" : String(date.getUTCFullYear());
  }

  function normalisePlaylistAlbum(item) {
    const id = safeVideoId(item?.id || item?.videoId);
    if (!id || !albumMatchesArtist(item)) return null;
    return {
      title: parseAlbumTitle(item),
      year: albumYear(item),
      coverVideoId: id,
      fullAlbumVideoId: id,
      description: `A complete ${profile.name || "NextGen Sessions"} album release from the official NextGen Sessions album catalogue.`,
      tracks: [],
      source: "youtube-album-playlist"
    };
  }

  function sameAlbum(a, b) {
    const left = normaliseText(a?.title);
    const right = normaliseText(b?.title);
    return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
  }

  function mergeAlbums(curated, playlistAlbums) {
    const merged = curated.map(album => ({ ...album, tracks: [...(album.tracks || [])] }));
    playlistAlbums.forEach(album => {
      const existing = merged.find(item => sameAlbum(item, album));
      if (existing) {
        existing.fullAlbumVideoId = existing.fullAlbumVideoId || album.fullAlbumVideoId;
        existing.coverVideoId = existing.coverVideoId || album.coverVideoId;
        existing.year = existing.year || album.year;
        return;
      }
      merged.push(album);
    });
    return merged;
  }

  async function loadAlbumCatalogue() {
    try {
      const response = await fetch("/albums.json", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) return [];
      const payload = await response.json();
      const items = Array.isArray(payload?.albums) ? payload.albums : [];
      return items.map(normalisePlaylistAlbum).filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  function albumSearchUrl(album) {
    const artistName = profile.name || slug.replaceAll("-", " ");
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
    const fullAlbumVideoId = safeVideoId(album.fullAlbumVideoId);
    const coverVideoId = safeVideoId(album.coverVideoId || fullAlbumVideoId || album.tracks?.[0]?.id);
    const tracks = Array.isArray(album.tracks) ? album.tracks.filter(track => safeVideoId(track.id)) : [];
    const detailParts = [];
    if (fullAlbumVideoId) detailParts.push("Full album video");
    if (tracks.length) detailParts.push(`${tracks.length} included release${tracks.length === 1 ? "" : "s"}`);
    const details = detailParts.join(" · ") || "Album project";

    return `
      <article class="album-card">
        <div class="album-cover" data-monogram="${escapeHtml(album.title.slice(0, 2).toUpperCase())}">
          ${coverVideoId ? `<img loading="lazy" decoding="async" src="/api/release-image?id=${encodeURIComponent(coverVideoId)}" alt="${escapeHtml(album.title)} cover artwork">` : ""}
          <span class="album-badge">Album</span>
        </div>
        <div class="album-copy">
          <div class="album-meta"><span>${escapeHtml(album.year || "")}</span><span>${escapeHtml(details)}</span></div>
          <h3>${escapeHtml(album.title)}</h3>
          <p>${escapeHtml(album.description || "")}</p>
          ${fullAlbumVideoId ? `
            <div class="discography-actions album-full-actions">
              <button class="button button-primary" type="button" data-play-album="${escapeHtml(fullAlbumVideoId)}" data-album-title="${escapeHtml(album.title)}">Play full album here</button>
              <a class="button button-secondary" href="https://www.youtube.com/watch?v=${escapeHtml(fullAlbumVideoId)}" target="_blank" rel="noopener">Open full album</a>
            </div>` : ""}
          ${tracks.length ? `
            <ul class="album-track-list" aria-label="Included releases from ${escapeHtml(album.title)}">
              ${tracks.map(trackMarkup).join("")}
            </ul>` : ""}
          ${!fullAlbumVideoId ? `<a class="button button-secondary album-search" href="${escapeHtml(albumSearchUrl(album))}" target="_blank" rel="noopener">Find album on YouTube</a>` : ""}
        </div>
      </article>`;
  }

  function playAlbum(videoId, title) {
    const id = safeVideoId(videoId);
    if (!id) return;
    const frame = root.querySelector("[data-featured-frame]");
    const heading = root.querySelector("[data-featured-title]");
    const tag = root.querySelector("[data-featured-tag]");
    const copy = root.querySelector("[data-featured-copy]");
    const link = root.querySelector("[data-featured-link]");

    if (frame) {
      frame.innerHTML = `<iframe loading="eager" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}?rel=0&amp;modestbranding=1" title="${escapeHtml(`${profile.name || "Artist"} — ${title}`)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>`;
    }
    if (heading) heading.textContent = title;
    if (tag) tag.textContent = "Full album";
    if (copy) copy.textContent = "Playing the complete album through the main profile player.";
    if (link) {
      link.href = `https://www.youtube.com/watch?v=${id}`;
      link.hidden = false;
    }
    document.getElementById("featured-release")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function mountAlbums(albums) {
    if (!Array.isArray(albums) || !albums.length) return true;
    const existing = root.querySelector("#artist-albums");
    if (existing) existing.remove();
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
        <p>Album releases remain grouped together while every available individual song also stays in the full catalogue below.</p>
      </div>
      <div class="album-grid">${albums.map(albumMarkup).join("")}</div>`;

    discography.insertAdjacentElement("beforebegin", section);

    section.addEventListener("error", event => {
      const image = event.target.closest(".album-cover img");
      if (!image) return;
      image.hidden = true;
      image.parentElement?.classList.add("image-unavailable");
    }, true);

    section.addEventListener("click", event => {
      const button = event.target.closest("[data-play-album]");
      if (!button) return;
      playAlbum(button.dataset.playAlbum, button.dataset.albumTitle || "Full album");
    });

    return true;
  }

  function mountWhenReady(albums) {
    if (mountAlbums(albums)) return;
    const observer = new MutationObserver(() => {
      if (mountAlbums(albums)) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 5000);
  }

  const curated = Array.isArray(albumLibrary[slug]) ? albumLibrary[slug] : [];
  loadAlbumCatalogue()
    .then(playlistAlbums => mountWhenReady(mergeAlbums(curated, playlistAlbums)))
    .catch(() => mountWhenReady(curated));
})();
