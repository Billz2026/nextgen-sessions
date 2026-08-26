export function normalise(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseLocalParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new Error(`releaseLocal must use YYYY-MM-DDTHH:mm[:ss]: ${value}`);
  const [, year, month, day, hour, minute, second = "00"] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
}

function partsInZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function sameParts(left, right) {
  return ["year", "month", "day", "hour", "minute", "second"].every((key) => left[key] === right[key]);
}

export function localScheduleToDate(releaseLocal, timeZone = "Europe/London") {
  const target = parseLocalParts(releaseLocal);
  const targetWallClock = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, target.second);
  let instant = targetWallClock;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = partsInZone(new Date(instant), timeZone);
    const actualWallClock = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const delta = targetWallClock - actualWallClock;
    instant += delta;
    if (!delta) break;
  }

  const result = new Date(instant);
  const roundTrip = partsInZone(result, timeZone);
  if (!sameParts(roundTrip, target)) {
    throw new Error(`releaseLocal does not resolve cleanly in ${timeZone}: ${releaseLocal}`);
  }

  for (const offset of [-7200000, -3600000, 3600000, 7200000]) {
    if (sameParts(partsInZone(new Date(instant + offset), timeZone), target)) {
      throw new Error(`releaseLocal is ambiguous in ${timeZone}: ${releaseLocal}`);
    }
  }

  return result;
}

export function releaseAtDate(item, defaultTimezone = "Europe/London") {
  const timeZone = String(item?.timezone || defaultTimezone || "Europe/London").trim();
  return localScheduleToDate(String(item?.releaseLocal || ""), timeZone);
}

export function localDateKey(date, timeZone = "Europe/London") {
  const parts = partsInZone(date, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function weekBounds(now = new Date(), timeZone = "Europe/London") {
  const key = localDateKey(now, timeZone);
  const [year, month, day] = key.split("-").map(Number);
  const dateOnly = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = dateOnly.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(dateOnly.getTime() - daysFromMonday * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const format = (value) => `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  return { start: format(monday), end: format(sunday) };
}

export function formatScheduleDate(date, timeZone = "Europe/London") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date).toUpperCase();
}

export function formatScheduleLong(date, timeZone = "Europe/London") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatScheduleTime(date, timeZone = "Europe/London") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatWeekLabel(startKey, endKey) {
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  const monthName = (date) => new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(date);
  if (sy === ey && sm === em) return `${sd}–${ed} ${monthName(end)} ${ey}`;
  if (sy === ey) return `${sd} ${monthName(start)}–${ed} ${monthName(end)} ${ey}`;
  return `${sd} ${monthName(start)} ${sy}–${ed} ${monthName(end)} ${ey}`;
}

export function sameRelease(left, right) {
  return normalise(left?.artist) === normalise(right?.artist) && normalise(left?.title) === normalise(right?.title);
}
