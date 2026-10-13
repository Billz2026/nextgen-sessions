// Add verified YouTube long mixes to New This Week only after public release.
// The input must be the public mix catalogue; scheduled metadata is never used.
import { formatScheduleDate, formatScheduleLong, localDateKey } from "./release-schedule.mjs";

const SOURCE = "youtube-mix-archives-and-channel-uploads";
const COLLECTION_LABELS = {
  bhangra: "Desi Mixes",
  other: "NextGen Special Mixes",
  "uk-rap": "UK Rap Mixes",
  "hip-hop": "Hip-Hop Mixes",
  dancehall: "Dancehall Mixes",
  grime: "Grime Mixes",
  summer: "Sound of Summer",
};
const EXCLUDED = /\b(?:shorts?|teaser|trailer|promo|preview|coming soon|out tomorrow|out tonight|out now)\b|#shorts/i;

export function weeklyMixItems(payload, bounds, now = new Date(), timeZone = "Europe/London") {
  if (payload?.source !== SOURCE ||
      payload?.contentPolicy?.shortsAllowed !== false ||
      !Array.isArray(payload?.mixes)) return [];

  return payload.mixes.flatMap(mix => {
    const id = String(mix?.id || "");
    const rawTitle = String(mix?.rawTitle || mix?.title || "").trim();
    const lead = rawTitle.split("|")[0].trim();
    const collection = String(mix?.collection || "").trim();
    const published = new Date(mix?.published || "");
    if (!/^[A-Za-z0-9_-]{11}$/.test(id) ||
        mix?.contentType !== "long-mix" ||
        Number(mix?.durationSeconds || 0) < 600 ||
        !lead || EXCLUDED.test(rawTitle) ||
        !Object.hasOwn(COLLECTION_LABELS, collection) ||
        !Number.isFinite(published.getTime()) || published > now) return [];
    const dateLocal = localDateKey(published, timeZone);
    if (dateLocal < bounds.start || dateLocal > bounds.end) return [];
    return [{
      artist: "NextGen Sessions",
      artistSlug: "",
      title: lead,
      genre: COLLECTION_LABELS[collection],
      contentType: "long-mix",
      artistUrl: "/mixes/",
      releaseUrl: "/mixes/",
      dateLocal,
      dateLabel: formatScheduleDate(published, timeZone),
      longDate: formatScheduleLong(published, timeZone),
      timeLocal: "",
      releaseAt: published.toISOString(),
      status: "live",
      image: "/api/release-image?id=" + encodeURIComponent(id) + "&size=card",
      source: "mix-catalogue",
    }];
  });
}
