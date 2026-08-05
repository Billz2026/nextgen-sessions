window.NGS_ARTIST_IMAGES = {
  "renz-cole": {
    src: "/assets/artists/renz-cole-card.webp",
    srcset: "/assets/artists/renz-cole-card-640.webp 640w, /assets/artists/renz-cole-card.webp 1024w",
    portrait: "/assets/artists/renz-cole-portrait.webp",
    fallback: "/assets/artists/renz-cole-card-640.webp",
    position: "50% 42%"
  },
  "alia-bleu": {
    src: "/assets/artists/alia-bleu-card.webp",
    srcset: "/assets/artists/alia-bleu-card-640.webp 640w, /assets/artists/alia-bleu-card.webp 1024w",
    portrait: "/assets/artists/alia-bleu-portrait.webp",
    fallback: "/assets/artists/alia-bleu-card-640.webp",
    position: "50% 42%"
  },
  "omari-v": {
    src: "/assets/artists/omari-v-card.webp",
    srcset: "/assets/artists/omari-v-card-640.webp 640w, /assets/artists/omari-v-card.webp 1024w",
    portrait: "/assets/artists/omari-v-portrait.webp",
    fallback: "/assets/artists/omari-v-card-640.webp",
    position: "50% 42%"
  },
  "reeko": {
    src: "/assets/artists/reeko-card.webp",
    srcset: "/assets/artists/reeko-card-640.webp 640w, /assets/artists/reeko-card.webp 1024w",
    portrait: "/assets/artists/reeko-portrait.webp",
    fallback: "/assets/artists/reeko-card-640.webp",
    position: "50% 42%"
  },
  "kemar-ranka": {
    src: "/assets/artists/kemar-ranka-portrait.webp?v=20260801-3",
    portrait: "/assets/artists/kemar-ranka-portrait.webp?v=20260801-3",
    fallback: "/assets/artists/kemar-ranka-portrait.webp?v=20260801-3",
    position: "50% 38%"
  },
  "jay-starks": {
    src: "/assets/artists/jay-starks-portrait-approved.webp?v=20260803-1",
    portrait: "/assets/artists/jay-starks-portrait-approved.webp?v=20260803-1",
    fallback: "/assets/artists/jay-starks-portrait-approved.webp?v=20260803-1",
    position: "50% 36%"
  },
  "deon-creed": {
    src: "/assets/artists/deon-creed-card.webp?v=20260803-4",
    srcset: "/assets/artists/deon-creed-card-640.webp?v=20260803-4 640w, /assets/artists/deon-creed-card.webp?v=20260803-4 1024w",
    portrait: "/assets/artists/deon-creed-portrait.webp?v=20260803-4",
    fallback: "/assets/artists/deon-creed-card-640.webp?v=20260803-4",
    position: "50% 34%"
  },
  "kemarco": {
    src: "/assets/artists/kemarco-card.webp",
    srcset: "/assets/artists/kemarco-card-640.webp 640w, /assets/artists/kemarco-card.webp 1024w",
    portrait: "/assets/artists/kemarco-portrait.webp",
    fallback: "/assets/artists/kemarco-card-640.webp",
    position: "50% 42%"
  },
  "rudii-marka": {
    src: "/assets/artists/rudii-marka-card.webp",
    srcset: "/assets/artists/rudii-marka-card-640.webp 640w, /assets/artists/rudii-marka-card.webp 1024w",
    portrait: "/assets/artists/rudii-marka-portrait.webp",
    fallback: "/assets/artists/rudii-marka-card-640.webp",
    position: "50% 42%"
  },
  "reiss": {
    src: "/assets/artists/reiss-card.webp?v=20260803-reiss1&portrait=human4",
    srcset: "/assets/artists/reiss-card-640.webp?v=20260803-reiss1&portrait=human4 640w, /assets/artists/reiss-card.webp?v=20260803-reiss1&portrait=human4 1024w",
    portrait: "/assets/artists/reiss-portrait.webp?v=20260803-reiss1&portrait=human4",
    fallback: "/assets/artists/reiss-card-640.webp?v=20260803-reiss1&portrait=human4",
    position: "50% 32%"
  },
  "rell-danja": {
    src: "/assets/artists/rell-danja-card.webp?v=20260804-rell1",
    srcset: "/assets/artists/rell-danja-card-640.webp?v=20260804-rell1 640w, /assets/artists/rell-danja-card.webp?v=20260804-rell1 1024w",
    portrait: "/assets/artists/rell-danja-portrait.webp?v=20260804-rell1",
    fallback: "/assets/artists/rell-danja-card-640.webp?v=20260804-rell1",
    position: "50% 31%"
  },
  "alonzo-ray": {
    src: "/assets/artists/alonzo-ray-card.webp",
    srcset: "/assets/artists/alonzo-ray-card-640.webp 640w, /assets/artists/alonzo-ray-card.webp 1024w",
    portrait: "/assets/artists/alonzo-ray-portrait.webp",
    fallback: "/assets/artists/alonzo-ray-card-640.webp",
    position: "50% 38%"
  },
  "asif-sultaan": {
    src: "/assets/artists/asif-sultaan-portrait-final.webp?v=20260805-asif-final1",
    portrait: "/assets/artists/asif-sultaan-portrait-final.webp?v=20260805-asif-final1",
    fallback: "/assets/artists/asif-sultaan-portrait-final.webp?v=20260805-asif-final1",
    position: "50% 36%"
  },
  "marlo-saint": {
    src: "/assets/artists/marlo-saint-card.webp?v=20260805-marlo2",
    srcset: "/assets/artists/marlo-saint-card-640.webp?v=20260805-marlo2 640w, /assets/artists/marlo-saint-card.webp?v=20260805-marlo2 720w",
    portrait: "/assets/artists/marlo-saint-portrait.webp?v=20260805-marlo2",
    fallback: "/assets/artists/marlo-saint-card-640.webp?v=20260805-marlo2",
    position: "50% 38%"
  }
};

if (Array.isArray(window.NGS_ARTISTS)) {
  const asif = window.NGS_ARTISTS.find(artist => artist.slug === "asif-sultaan");
  if (asif) {
    asif.genre = "Punjabi / South Asian Fusion";
    asif.summary = "Modern Punjabi crossover with commanding vocals, South Asian trap texture and polished global production.";
  }

  const marlo = window.NGS_ARTISTS.find(artist => artist.slug === "marlo-saint");
  if (marlo) {
    marlo.genre = "UK Afro-Swing / R&B";
    marlo.summary = "Late-night Afro-swing with smooth melody, confident boundaries and polished city-night production.";
  }
}