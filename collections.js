(function () {
  "use strict";

  const root = document.getElementById("collectionGrid");
  if (!root) return;

  const artists = Array.isArray(window.NGS_ARTISTS) ? window.NGS_ARTISTS : [];
  const artistBySlug = new Map(artists.map(artist => [artist.slug, artist]));

  const collections = [
    {
      title: "Dancehall & Reggae",
      eyebrow: "Jamaican sound",
      description: "Gully dancehall, reflective reggae and hook-led Jamaican records across the NextGen roster.",
      query: "dancehall reggae",
      slugs: ["omari-v", "reeko", "kemarco", "rudii-marka", "rell-danja", "kemar-ranka", "yung-tafari", "javon-ranks", "ragga-blaze", "jahmari-danza", "darian-gayle"]
    },
    {
      title: "UK Rap & Grime",
      eyebrow: "From the endz",
      description: "London rap, estate storytelling, direct bars and darker grime pressure.",
      query: "UK rap grime",
      slugs: ["renz-cole", "kastro", "mace-k", "killa-k", "andre-kadeem", "reiss", "rafe"]
    },
    {
      title: "R&B & Soul",
      eyebrow: "Late-night records",
      description: "Emotionally precise R&B, mature soul writing and polished melodic production.",
      query: "R&B soul",
      slugs: ["alia-bleu", "deon-creed", "zara-veli", "keisha", "marlo-saint", "nyah-rae", "alonzo-ray"]
    },
    {
      title: "Hip-Hop",
      eyebrow: "US and cinematic rap",
      description: "Queens grit, West Coast authority, legacy records and widescreen hip-hop production.",
      query: "hip hop",
      slugs: ["voss-carter", "jay-starks", "marlo-saint", "karvell-reign", "alonzo-ray"]
    },
    {
      title: "Global Sounds",
      eyebrow: "Beyond one region",
      description: "Punjabi, Arabic and global-pop identities built with the same NextGen visual standard.",
      query: "Punjabi Arabic global pop",
      slugs: ["manny-virk", "asif-sultaan", "leila-nour", "mariana-lo", "zara-veli"]
    }
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function collectionUrl(query) {
    return "https://www.youtube.com/@NextGenSessions/search?query=" + encodeURIComponent(query);
  }

  function collectionCard(collection, index) {
    const members = collection.slugs.map(slug => artistBySlug.get(slug)).filter(Boolean);
    const names = members.slice(0, 4).map(artist => artist.name).join(" · ");
    const count = members.length;
    return `
      <a class="collection-card" href="${escapeHtml(collectionUrl(collection.query))}" target="_blank" rel="noopener" aria-label="Explore ${escapeHtml(collection.title)} on the NextGen Sessions YouTube channel">
        <span class="collection-number">${String(index + 1).padStart(2, "0")}</span>
        <div class="collection-copy">
          <span class="collection-eyebrow">${escapeHtml(collection.eyebrow)}</span>
          <h3>${escapeHtml(collection.title)}</h3>
          <p>${escapeHtml(collection.description)}</p>
        </div>
        <div class="collection-footer">
          <span>${count} artist${count === 1 ? "" : "s"}</span>
          <strong>${escapeHtml(names)}</strong>
          <span class="collection-arrow" aria-hidden="true">↗</span>
        </div>
      </a>`;
  }

  root.innerHTML = collections.map(collectionCard).join("");
})();
