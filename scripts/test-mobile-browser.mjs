#!/usr/bin/env node
// Real Chromium smoke test; this catches CSS regressions a source-only test misses.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const site = process.env.NGS_PREVIEW_ORIGIN || "http://127.0.0.1:8765";
const browser = await chromium.launch({ headless: true });
const pages = [
  { width: 390, height: 844, label: "mobile" },
  { width: 360, height: 780, label: "small mobile" },
  { width: 768, height: 900, label: "tablet / unfolded phone" },
  { width: 1280, height: 850, label: "desktop" },
  { width: 1920, height: 1080, label: "widescreen" },
];

try {
  for (const viewport of pages) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    await page.goto(site + "/artists/dean-lawson/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.locator(".site-header.ngs-nav-ready").waitFor({ timeout: 12000 });

    const card = page.locator(".discography-card").first();
    const art = card.locator(".discography-art");
    const artBox = await art.boundingBox();
    const bodyBox = await card.locator(".discography-card-body").boundingBox();
    const frame = page.locator('#featured-release iframe[src*="y_gADQbXSho"]');
    assert.ok(artBox && artBox.width > 160 && artBox.height > 80, viewport.label + ": cover artwork must have visible dimensions");
    assert.ok(bodyBox && artBox.y + artBox.height <= bodyBox.y + 3, viewport.label + ": cover artwork cannot overlap song text");
    assert.equal(await art.evaluate(el => getComputedStyle(el).display), "block", viewport.label + ": artwork anchor must be a block");
    assert.ok(await frame.count(), viewport.label + ": embedded video must be present");
    assert.ok(await page.locator('script[src^="/site-metrics.js"]').count(), viewport.label + ": mobile navigation runtime must load");

    const actions = await card.locator(".discography-card-actions a").all();
    const bounds = await card.boundingBox();
    assert.ok(bounds, viewport.label + ": release card must have layout bounds");
    for (const action of actions) {
      const rect = await action.boundingBox();
      assert.ok(rect && rect.width > 75 && rect.height >= 38, viewport.label + ": buttons must have tappable dimensions");
      assert.ok(rect.x >= bounds.x - 2 && rect.x + rect.width <= bounds.x + bounds.width + 2,
        viewport.label + ": release buttons must fit inside the card");
    }

    if (viewport.width < 980) {
      const menu = page.locator(".nav-toggle");
      assert.ok(await menu.isVisible(), viewport.label + ": hamburger navigation must be visible");
      await menu.click();
      assert.ok(await page.locator(".site-header.is-menu-open").count(), viewport.label + ": mobile navigation must open");
      await menu.click();
      assert.equal(await page.locator(".site-header.is-menu-open").count(), 0, viewport.label + ": mobile navigation must close");
    }

    await card.locator('a[href="#featured-release"]').first().click();
    assert.equal(new URL(page.url()).hash, "#featured-release", viewport.label + ": Play Here must reach embedded video");
    console.log("PASS: " + viewport.label + " (" + viewport.width + "px) artist artwork, navigation, buttons, and video");
    await page.goto(site + "/", { waitUntil: "domcontentloaded" });
    await page.locator("#featuredArtistGrid .featured-artist-card").first().waitFor();
    assert.equal(await page.locator("#featuredArtistGrid .featured-artist-card").count(), 6);
    assert.equal(await page.locator("#allArtistsLink").textContent(), "Explore all artists");
    assert.ok(await page.locator("#releases").evaluate(el => el.compareDocumentPosition(document.querySelector("#featured-artists")) & Node.DOCUMENT_POSITION_FOLLOWING), "Recent releases must precede featured artists");
    assert.equal(await page.locator("#new-this-week").count(), 0);
    assert.equal(await page.locator("#releaseGrid .release-card").count(), 6);
    await page.locator("[data-ngs-conversion=home]").waitFor();
    assert.ok(await page.locator("#releases").evaluate(el => el.nextElementSibling?.id === "featured-artists"), "Featured artists must immediately follow latest releases");
    assert.ok(await page.locator("#featured-artists").evaluate(el => el.nextElementSibling?.id === "mixes"), "Mixes must immediately follow featured artists");
    assert.ok(await page.locator("#genres").evaluate(el => el.nextElementSibling?.dataset.ngsConversion === "home"), "Follow section must immediately follow genres");
    assert.ok(await page.locator("#mixes").evaluate(el => el.nextElementSibling?.id === "genres"), "Mixes must precede genres");
    assert.equal(await page.locator("#genres .genre").count(), 8);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), viewport.label + ": homepage overflow");
    assert.equal(await page.locator(".hero-brand h1 span").count(), 3);
    assert.equal(await page.locator(".hero-brand .button").count(), 1);
    assert.equal(await page.locator(".hero-social-links a").count(), 3);
    const socialCards = await page.locator(".hero-social-links a").all();
    const socialBounds = await Promise.all(socialCards.map(card => card.boundingBox()));
    for (const rect of socialBounds) {
      assert.ok(rect && rect.height >= 90 && rect.width >= 75, viewport.label + ": social cards must have prominent tap targets");
      assert.ok(Math.abs(rect.width - socialBounds[0].width) <= 2 && Math.abs(rect.height - socialBounds[0].height) <= 2 && Math.abs(rect.y - socialBounds[0].y) <= 2, viewport.label + ": social cards must share equal size and alignment");
    }
    assert.deepEqual(await page.locator(".hero-social-action").allTextContents(), ["Subscribe →", "Follow →", "Follow →"]);
    if (viewport.width >= 1100) {
      const social = await page.locator(".hero-brand-social").boundingBox();
      const media = await page.locator(".hero .media-shell").boundingBox();
      assert.ok(Math.abs(social.y + social.height - media.y - media.height) <= 3, viewport.label + ": brand and video bottoms must align; " + JSON.stringify({social,media}));
    }
    assert.ok(await page.locator(".hero-brand-gold").isVisible());
    assert.equal(await page.locator("#heroLatestLink").count(), 0);
    assert.ok(await page.locator("#latestArtist").isVisible(), "Latest artist or content label must be visible");
    assert.equal(await page.locator("#latestGenre").count(), 1, "Latest genre field must remain available");
    assert.equal(await page.locator("#latestWatchLink svg").count(), 1);
    const playIcon = await page.locator("#latestVideoPlay .video-play-icon").boundingBox();
    assert.ok(playIcon && playIcon.width >= 64 && Math.abs(playIcon.width - playIcon.height) < 2, viewport.label + ": play button must be prominent and circular");
    const hero = await page.locator("main > .hero").boundingBox();
    const player = await page.locator("#latestVideoFrame").boundingBox();
    assert.ok(hero && player && Math.abs(player.width / player.height - 16 / 9) < .03, viewport.label + ": latest video must retain 16:9");
    assert.ok(player.width / hero.width >= (viewport.width >= 1100 ? .60 : .97), viewport.label + ": latest player must occupy the intended layout width");
    if (viewport.width >= 1920) assert.ok(hero.width >= 1400 && player.width >= 850, "Widescreen layout must use available space");
    const columns = await page.locator("#featuredArtistGrid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    assert.equal(columns, viewport.width <= 520 ? 1 : viewport.width <= 980 ? 2 : 3);
    await page.goto(site + "/artists/", { waitUntil: "domcontentloaded" });
    await page.locator("#artistGenre").selectOption("us-drill");
    await page.waitForFunction(() => document.querySelector("#rosterCount").textContent.includes("found"));
    assert.ok(await page.locator('#artistRosterGrid a[href="/artists/brix-knox/"]').count());
    await page.locator("#artistSearch").fill("no-such-artist-xyz");
    assert.ok(await page.locator(".roster-empty").isVisible());
    await page.locator("#artistReset").click();
    assert.equal(await page.locator("#rosterCount").textContent(), "All artists");
    assert.ok(await page.locator("#artistRosterGrid .artist-roster-card").count() >= 36);
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth, viewport: window.innerWidth,
      elements: [...document.querySelectorAll("body *")].filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.right > window.innerWidth + 2 && getComputedStyle(el).visibility !== "hidden";
      }).slice(0, 12).map(el => ({tag:el.tagName, className:String(el.className), right:Math.round(el.getBoundingClientRect().right)}))
    }));
    assert.ok(overflow.width <= overflow.viewport + 2, viewport.label + ": artist directory overflow " + JSON.stringify(overflow));
    await page.goto(site + "/releases/", {waitUntil:"domcontentloaded"});
    await page.waitForFunction(() => document.querySelector("#releaseYear option[value='2026']") && document.querySelectorAll("#releaseArchiveGrid article").length === 24);
    await page.locator("#loadMoreReleases").click();
    assert.equal(await page.locator("#releaseArchiveGrid article").count(),48);
    await page.locator('[data-filter="US Drill"]').click();
    assert.ok(await page.locator("#releaseArchiveGrid article").count() >= 1);
    assert.ok((await page.locator(".archive-release-genre").allTextContents()).every(x=>x==="US Drill"));
    await page.locator("#releaseSearch").fill("no-such-track-xyz");
    assert.ok(await page.locator("#releaseArchiveEmpty").isVisible());
    await page.locator("#clearReleaseFilters").click();
    await page.locator("#releaseYear").selectOption("2026");
    await page.locator("#releaseSort").selectOption("oldest");
    assert.ok(await page.locator("#releaseArchiveGrid article").count() > 0);
    await page.locator("[data-archive-play]").first().click();
    assert.equal(await page.locator(".archive-release-player").count(),1);
    await page.locator("[data-archive-play]").first().click();
    assert.equal(await page.locator(".archive-release-player").count(),1);
    await page.locator("[data-archive-close]").click();
    assert.equal(await page.locator(".archive-release-player").count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+2),viewport.label+": archive overflow");
    await page.close();
  }
} finally {
  await browser.close();
}
