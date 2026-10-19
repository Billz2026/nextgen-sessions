#!/usr/bin/env node
// Real Chromium smoke test; this catches CSS regressions a source-only test misses.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const site = process.env.NGS_PREVIEW_ORIGIN || "http://127.0.0.1:8765";
const browser = await chromium.launch({ headless: true });
const pages = [
  { width: 390, height: 844, label: "mobile" },
  { width: 360, height: 780, label: "small mobile" },
  { width: 1280, height: 850, label: "desktop" },
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
    await page.close();
  }
} finally {
  await browser.close();
}
