import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatScheduleLong,
  formatScheduleTime,
  releaseAtDate,
  sameRelease,
} from "./release-schedule.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));

const index = readJson("search-index.json");
const schedulePayload = readJson("scheduled-releases.json");
const cataloguePayload = readJson("releases.json");
const catalogue = Array.isArray(cataloguePayload.releases) ? cataloguePayload.releases : [];
const schedules = Array.isArray(schedulePayload.releases) ? schedulePayload.releases : [];
const defaultTimezone = schedulePayload.defaultTimezone || "Europe/London";
const now = new Date();

const baseItems = (Array.isArray(index.items) ? index.items : []).filter((item) => item.source !== "release-schedule");
const upcomingItems = [];

for (const item of schedules) {
  if (catalogue.some((release) => sameRelease(release, item))) continue;
  const releaseAt = releaseAtDate(item, defaultTimezone);
  const timeZone = item.timezone || defaultTimezone;
  const status = now >= releaseAt ? "publishing" : "upcoming";
  const time = formatScheduleTime(releaseAt, timeZone);
  upcomingItems.push({
    type: "release",
    title: item.title,
    subtitle: `${item.artist} · ${status === "publishing" ? "Publishing shortly" : "Upcoming"}`,
    description: `${formatScheduleLong(releaseAt, timeZone)} · ${time} UK time. Release page activates after the public catalogue confirms the track.`,
    url: item.artistPath,
    date: releaseAt.toISOString(),
    status,
    source: "release-schedule",
    keywords: [item.artist, item.title, "upcoming", "coming soon", "new release", formatScheduleLong(releaseAt, timeZone)],
  });
}

upcomingItems.sort((a, b) => a.date.localeCompare(b.date));
index.items = [...baseItems, ...upcomingItems];
index.total = index.items.length;
index.counts = {
  ...index.counts,
  releases: index.items.filter((item) => item.type === "release").length,
  upcomingReleases: upcomingItems.length,
};

fs.writeFileSync(path.join(root, "search-index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(`Search schedule enrichment complete: ${upcomingItems.length} upcoming/publishing release(s) indexed.`);
