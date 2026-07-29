(function () {
  "use strict";

  const grid = document.getElementById("releaseArchiveGrid");
  if (!grid) return;

  const search = document.getElementById("releaseSearch");
  const controls = document.getElementById("releaseArchiveControls");
  const count = document.getElementById("releaseCount");
  const empty = document.getElementById("releaseArchiveEmpty");
  const clear = document.getElementById("clearReleaseFilters");
  const filterButtons = [...document.querySelectorAll(".release-filter")];
  const artists = Array.isArray(window.NGS_ARTISTS) ? window.NGS_ARTISTS : [];

  const artistGroups = {
    "dancehall & reggae": "Dancehall & Reggae",
    "jamaican dancehall": "Dancehall & Reggae",
    "dark melodic dancehall": "Dancehall & Reggae",
    "jamaican reggae": "Dancehall & Reggae",
    "reggae / dancehall": "Dancehall & Reggae",
    "reggae / soul": "Dancehall & Reggae",
    "dancehall": "Dancehall & Reggae",
    "uk rap": "UK Rap & Grime",
    "uk rap / grime": "UK Rap & Grime",
    "west coast hip-hop": "Hip-Hop",
    "new york hip-hop": "Hip-Hop",
    "hip-hop / soul": "Hip-Hop",
    "hip-hop / r&b": "Hip-Hop",
    "uk r&b": "R&B & Soul",
    "r&b / soul": "R&B & Soul",
    "soul / r&b": "R&B & Soul",
    "r&b": "R&B & Soul",
    "punjabi / bhangra": "Global Sounds",
    "arabic soul / oud": "Global Sounds",
    "global pop": "Global Sounds",
    "pop / r&b": "Global Sounds"
  };

  const releaseOverrides = {
    "5YgrpFXZ92Q": { artist: "Rudii Marka", title: "Marked for War", group: "Dancehall & Reggae" },
    "zrnWeU7KRS0": { artist: "Mizzy G", title: "Corner To Crown", group: "UK Rap & Grime" },
    "U6lh9buVYHg": { artist: "Reeko", title: "Smile Wid Knife", group: "Dancehall & Reggae" },
    "oc7Cryy5xTM": { artist: "Reeko", title: "Nuff Man A Watch", group: "Dancehall & Reggae" },
    "JwFCGCLWw0I": { artist: "Renz Cole", title: "Outside Till Late", group: "UK Rap & Grime" },
    "s0ZS2HJjw2M": { artist: "Renz Cole", title: "False Nine", group: "UK Rap & Grime" },
    "yU4fK6aSqEg": { artist: "Renz Cole", title: "Playmaker", group: "UK Rap & Grime" },
    "Xj806cr_eS4": { artist: "Jay Starks", title: "Queens in My Soul", group: "Hip-Hop" },
    "ESEyLheoF9Q": { artist: "Kastro", title: "Urban Reign", group: "UK Rap & Grime" },
    "ZR6vqKxmngw": { artist: "Kemar Ranka", title: "Top Ranka", group: "Dancehall & Reggae" },
    "VwLzUxVabSQ": { artist: "Reeko", title: "Mi Call Di Shots", group: "Dancehall & Reggae" }
  };

  const fallbackReleases = Object.entries(releaseOverrides).map(([id, release]) => ({
    id,
    title: `${release.artist} - ${release.title}`,
    published: ""
  }));

  let catalogue = [];
  let activeFilter = "All";

  function normaliseText(value) {
    return String(value || "").toLowerCase().replace(/[’‘]/g, "'").trim();
  }

  function findArtist(rawTitle) {
    const haystack = normaliseText(rawTitle);
    return [...artists]
      .sort((a, b) => b.name.length - a.name.length)
      .find(artist => haystack.includes(normaliseText(artist.name))) || null;
  }

  function inferGroup(rawTitle, artist) {
    const title = normaliseText(rawTitle);
    if (/dancehall|reggae|gully|jamaican/.test(title)) return "Dancehall & Reggae";
    if (/uk rap|grime|london rap/.test(title)) return "UK Rap & Grime";
    if (/r&b|rnb|soul/.test(title)) return "R&B & Soul";
    if (/punjabi|bhangra|arabic|oud|global|afro|latin/.test(title)) return "Global Sounds";
    const mapped = artistGroups[normaliseText(artist?.genre)];
    if (mapped) return mapped;
    return "Hip-Hop";
  }

  function cleanReleaseTitle(rawTitle, artistName) {
    const segments = String(rawTitle || "")
      .split("|")
      .map(part => part.trim())
      .filter(Boolean);
    const artistPattern = artistName
      ? new RegExp(artistName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      : null;
    const bestSegment = artistPattern
      ? (segments.find(segment => artistPattern.test(segment) && /[-–—]/.test(segment)) || segments.find(segment => artistPattern.test(segment)))
      : segments[0];
    let title = bestSegment || String(rawTitle || "NextGen Sessions release").trim();

    if (artistPattern && artistPattern.test(title)) {
      title = title.replace(new RegExp(`^.*?${artistPattern.source}\\s*[-–—:]\\s*`, "i"), "");
      title = title.replace(new RegExp(`^${artistPattern.source}\\s+`, "i"), "");
      if (normaliseText(title) === normaliseText(artistName)) title = "";
    }

    title = title
      .replace(/\s+(uk rap|grime|dancehall|reggae|hip-?hop|r&b|rnb|soul|afro swing|global pop)\s+20\d{2}$/i, "")
      .replace(/\s*(?:[-–—]\s*)?\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+20\d{2})?$/i, "")
      .replace(/\s+(official\s+(music\s+)?video|official\s+audio|visuali[sz]er|lyric\s+video)$/i, "")
      .replace(/\s+\|\s+.*$/i, "")
      .trim();

    return title || segments[0] || "NextGen Sessions release";
  }

  function prepareRelease(release) {
    const override = releaseOverrides[release.id];
    if (override) {
      return { ...release, ...override, rawTitle: release.title || override.title };
    }

    const artist = findArtist(release.title);
    if (!artist) return null;

    const title = cleanReleaseTitle(release.title, artist.name);
    if (!title || normaliseText(title) === normaliseText(artist.name)) return null;

    return {
      ...release,
      artist: artist.name,
      title,
      group: inferGroup(release.title, artist),
      rawTitle: release.title || ""
    };
  }

  function uniquePreparedReleases(releases) {
    const seen = new Set();
    return releases.filter(release => {
      const key = normaliseText(`${release.artist}|${release.title}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function createReleaseCard(release) {
    const link = document.createElement("a");
    link.className = "archive-release-card";
    link.href = `https://www.youtube.com/watch?v=${release.id}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", `Watch ${release.title} by ${release.artist} on YouTube`);

    const art = document.createElement("div");
    art.className = "archive-release-art";
    art.dataset.monogram = release.artist
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase() || "NG";
    const image = document.createElement("img");
    image.loading = "lazy";
    image.decoding = "async";
    image.src = `/api/release-image?id=${encodeURIComponent(release.id)}`;
    image.alt = `${release.title} by ${release.artist}`;
    image.addEventListener("error", () => {
      image.hidden = true;
      art.classList.add("image-unavailable");
    });
    const play = document.createElement("span");
    play.className = "archive-release-play";
    play.setAttribute("aria-hidden", "true");
    art.append(image, play);

    const body = document.createElement("div");
    body.className = "archive-release-body";
    const genre = document.createElement("span");
    genre.className = "archive-release-genre";
    genre.textContent = release.group;
    const title = document.createElement("h3");
    title.textContent = release.title;
    const artist = document.createElement("p");
    artist.className = "archive-release-artist";
    artist.textContent = release.artist;
    const footer = document.createElement("div");
    footer.className = "archive-release-footer";
    const date = document.createElement("span");
    date.textContent = formatDate(release.published) || "Official release";
    const watch = document.createElement("span");
    watch.className = "archive-release-watch";
    watch.textContent = "Watch";
    footer.append(date, watch);
    body.append(genre, title, artist, footer);
    link.append(art, body);
    return link;
  }

  function render() {
    const term = normaliseText(search?.value);
    const visible = catalogue.filter(release => {
      const matchesFilter = activeFilter === "All" || release.group === activeFilter;
      const searchable = normaliseText([release.title, release.artist, release.group, release.rawTitle].join(" "));
      return matchesFilter && (!term || searchable.includes(term));
    });

    grid.replaceChildren(...visible.map(createReleaseCard));
    grid.classList.remove("is-loading");
    grid.setAttribute("aria-busy", "false");
    empty.hidden = visible.length !== 0;
    if (count) {
      const qualifier = term || activeFilter !== "All" ? " found" : " in the catalogue";
      count.textContent = `${visible.length} release${visible.length === 1 ? "" : "s"}${qualifier}`;
    }
  }

  function setFilter(value) {
    activeFilter = value;
    filterButtons.forEach(button => {
      const selected = button.dataset.filter === value;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    render();
  }

  filterButtons.forEach(button => {
    button.addEventListener("click", () => setFilter(button.dataset.filter || "All"));
  });
  controls?.addEventListener("submit", event => event.preventDefault());
  search?.addEventListener("input", render);
  clear?.addEventListener("click", () => {
    if (search) search.value = "";
    setFilter("All");
    search?.focus();
  });

  fetch("/api/releases", {
    headers: { Accept: "application/json" },
    cache: "no-store"
  })
    .then(response => {
      if (!response.ok) throw new Error("Release catalogue unavailable");
      return response.json();
    })
    .then(payload => {
      const releases = Array.isArray(payload?.releases) && payload.releases.length
        ? payload.releases
        : fallbackReleases;
      catalogue = uniquePreparedReleases(releases.map(prepareRelease).filter(Boolean));
      render();
    })
    .catch(() => {
      catalogue = uniquePreparedReleases(fallbackReleases.map(prepareRelease).filter(Boolean));
      render();
    });
})();
