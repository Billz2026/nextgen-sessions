(() => {
  const page = document.querySelector('[data-site-search="true"]');
  if (!page) return;

  const form = document.getElementById("siteSearchForm");
  const input = document.getElementById("siteSearchInput");
  const resultsNode = document.getElementById("siteSearchResults");
  const statusNode = document.getElementById("siteSearchStatus");
  const filtersNode = document.getElementById("siteSearchFilters");
  const filterButtons = [...filtersNode.querySelectorAll("[data-search-filter]")];

  const TYPE_ORDER = ["artist", "release", "genre", "mix"];
  const TYPE_LABELS = {
    artist: ["Artists", "Artist"],
    release: ["Releases", "Release"],
    genre: ["Genres", "Genre"],
    mix: ["Mixes & collections", "Mix / collection"],
  };

  let items = [];
  let activeFilter = "all";
  let activeResultIndex = -1;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalise(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/[^a-zA-Z0-9&+\s'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function scoreItem(item, query) {
    const q = normalise(query);
    if (!q) return 0;

    const title = normalise(item.title);
    const subtitle = normalise(item.subtitle);
    const description = normalise(item.description);
    const keywords = normalise(Array.isArray(item.keywords) ? item.keywords.join(" ") : "");
    const haystack = `${title} ${subtitle} ${description} ${keywords}`;
    const tokens = q.split(" ").filter(Boolean);

    if (!tokens.every((token) => haystack.includes(token))) return -1;

    let score = 0;
    if (title === q) score += 240;
    else if (title.startsWith(q)) score += 170;
    else if (title.includes(q)) score += 125;

    if (subtitle === q) score += 110;
    else if (subtitle.startsWith(q)) score += 80;
    else if (subtitle.includes(q)) score += 55;

    if (keywords.includes(q)) score += 38;
    if (description.includes(q)) score += 18;

    for (const token of tokens) {
      if (title === token) score += 32;
      else if (title.startsWith(token)) score += 25;
      else if (title.includes(token)) score += 18;
      if (subtitle.includes(token)) score += 12;
      if (keywords.includes(token)) score += 7;
      if (description.includes(token)) score += 3;
    }

    if (item.type === "artist") score += 4;
    return score;
  }

  function resultCard(item) {
    const labels = TYPE_LABELS[item.type] || ["Results", "Result"];
    return `<a class="search-result-card" href="${escapeHtml(item.url)}" data-search-result data-track="search_result_open" data-track-label="${escapeHtml(item.type)}">
      <span class="search-result-type">${escapeHtml(labels[1])}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.subtitle || "NextGen Sessions")}</small>
      <p>${escapeHtml(item.description || "Open this result on NextGen Sessions.")}</p>
    </a>`;
  }

  function emptyState(query) {
    if (!query.trim()) {
      resultsNode.innerHTML = `<div class="site-search-empty"><strong>Search the catalogue.</strong> Start with an artist, track title, genre or mix. Search stays on this device and does not use a third-party search provider.
        <div class="search-shortcuts" aria-label="Search suggestions">
          <button class="search-shortcut" type="button" data-search-shortcut="Renz Cole">Renz Cole</button>
          <button class="search-shortcut" type="button" data-search-shortcut="Dancehall">Dancehall</button>
          <button class="search-shortcut" type="button" data-search-shortcut="R&B">R&amp;B</button>
          <button class="search-shortcut" type="button" data-search-shortcut="UK Rap">UK Rap</button>
          <button class="search-shortcut" type="button" data-search-shortcut="Heatwave">Heatwave</button>
        </div>
      </div>`;
      statusNode.textContent = `${items.length} catalogue items ready`;
      return;
    }

    resultsNode.innerHTML = `<p class="site-search-empty"><strong>No matches for “${escapeHtml(query)}”.</strong> Try a shorter artist name, track title or genre.</p>`;
    statusNode.textContent = "No matching catalogue items";
  }

  function render() {
    const query = input.value.trim();
    activeResultIndex = -1;

    if (!query) {
      emptyState("");
      return;
    }

    const matches = items
      .filter((item) => activeFilter === "all" || item.type === activeFilter)
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score || String(b.item.date || "").localeCompare(String(a.item.date || "")) || a.item.title.localeCompare(b.item.title));

    if (!matches.length) {
      emptyState(query);
      return;
    }

    const grouped = new Map(TYPE_ORDER.map((type) => [type, []]));
    for (const match of matches) grouped.get(match.item.type)?.push(match.item);

    const perGroupLimit = activeFilter === "all" ? 8 : 30;
    const sections = [];
    for (const type of TYPE_ORDER) {
      const group = grouped.get(type) || [];
      if (!group.length) continue;
      const visible = group.slice(0, perGroupLimit);
      const label = TYPE_LABELS[type]?.[0] || "Results";
      const countCopy = group.length > visible.length ? `Showing ${visible.length} of ${group.length}` : `${group.length} result${group.length === 1 ? "" : "s"}`;
      sections.push(`<section class="search-result-group" aria-labelledby="search-group-${type}">
        <div class="search-result-group-heading"><h3 id="search-group-${type}">${escapeHtml(label)}</h3><span>${escapeHtml(countCopy)}</span></div>
        <div class="search-result-list">${visible.map(resultCard).join("")}</div>
      </section>`);
    }

    resultsNode.innerHTML = sections.join("");
    statusNode.textContent = `${matches.length} matching item${matches.length === 1 ? "" : "s"}`;
  }

  function setFilter(type) {
    activeFilter = type;
    for (const button of filterButtons) {
      const active = button.dataset.searchFilter === type;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
    render();
  }

  function focusResult(direction) {
    const cards = [...resultsNode.querySelectorAll("[data-search-result]")];
    if (!cards.length) return;
    activeResultIndex = Math.max(0, Math.min(cards.length - 1, activeResultIndex + direction));
    cards.forEach((card, index) => card.classList.toggle("is-keyboard-active", index === activeResultIndex));
    cards[activeResultIndex].focus();
  }

  input.addEventListener("input", render);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
    render();
    const first = resultsNode.querySelector("[data-search-result]");
    if (first) first.focus();
  });

  filtersNode.addEventListener("click", (event) => {
    const button = event.target.closest("[data-search-filter]");
    if (!button) return;
    setFilter(button.dataset.searchFilter || "all");
  });

  resultsNode.addEventListener("click", (event) => {
    const shortcut = event.target.closest("[data-search-shortcut]");
    if (!shortcut) return;
    input.value = shortcut.dataset.searchShortcut || "";
    input.focus();
    render();
  });

  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const typing = tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;

    if (event.key === "/" && !typing) {
      event.preventDefault();
      input.focus();
      return;
    }
    if (event.key === "Escape" && document.activeElement === input) {
      input.value = "";
      render();
      return;
    }
    if (event.key === "ArrowDown" && (document.activeElement === input || document.activeElement?.matches?.("[data-search-result]"))) {
      event.preventDefault();
      focusResult(1);
    } else if (event.key === "ArrowUp" && document.activeElement?.matches?.("[data-search-result]")) {
      event.preventDefault();
      focusResult(-1);
    }
  });

  const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
  input.value = initialQuery;

  fetch("/search-index.json", { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`Search index returned ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      items = Array.isArray(payload.items) ? payload.items : [];
      render();
      if (initialQuery) input.focus();
    })
    .catch(() => {
      statusNode.textContent = "Search is temporarily unavailable";
      resultsNode.innerHTML = '<p class="site-search-empty">The catalogue search index could not be loaded. Browse <a href="/artists/">artists</a>, <a href="/releases/">releases</a>, <a href="/genres/">genres</a> or <a href="/mixes/">mixes</a> directly.</p>';
    });
})();
