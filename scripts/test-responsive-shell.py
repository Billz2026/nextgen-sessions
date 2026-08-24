#!/usr/bin/env python3
"""Regression checks for NextGen Sessions responsive shell and current legal copy."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

mobile_js = (ROOT / "mobile-nav.js").read_text(encoding="utf-8")
mobile_css = (ROOT / "mobile-nav.css").read_text(encoding="utf-8")
metrics = (ROOT / "site-metrics.js").read_text(encoding="utf-8")
privacy = (ROOT / "privacy" / "index.html").read_text(encoding="utf-8")
error_page = (ROOT / "404.html").read_text(encoding="utf-8")
artists = (ROOT / "artists" / "index.html").read_text(encoding="utf-8")
submit = (ROOT / "submit.html").read_text(encoding="utf-8")

# Mobile navigation must remain a real menu rather than the old horizontal-scroll fallback.
for label in ("Home", "Artists", "Releases", "Genres", "Mixes", "About", "Submit", "YouTube"):
    assert f"label: '{label}'" in mobile_js, f"Mobile navigation missing {label}"
assert "key === 'genres'" in mobile_js, "Mobile Genres active-state detection is missing"
assert "label: 'Featured'" not in mobile_js, "Old Featured-only mobile navigation has returned"
assert "@media(max-width:980px)" in mobile_css, "Mobile navigation breakpoint is missing"
assert ".nav-toggle" in mobile_css, "Mobile menu toggle styling is missing"
assert "body.ngs-menu-open{overflow:hidden}" in mobile_css, "Mobile menu body lock is missing"
assert ".nav-backdrop" in mobile_css, "Mobile menu backdrop is missing"

# Shared runtime must activate the mobile shell and normalize the premium footer.
assert "/mobile-nav.css?v=" in metrics, "Shared runtime no longer loads mobile navigation styles"
assert "/mobile-nav.js?v=" in metrics, "Shared runtime no longer loads mobile navigation script"
assert "standardizeFooter" in metrics, "Canonical footer standardization is missing"
for href in (
    "/artists/",
    "/releases/",
    "/genres/",
    "/mixes/",
    "/submit.html",
    "/privacy/",
    "https://www.youtube.com/@NextGenSessions",
    "https://www.tiktok.com/@nextgensessions",
    "https://www.instagram.com/next.gensessions/",
    "mailto:contact@nextgensessions.com",
):
    assert href in metrics, f"Canonical footer missing {href}"

# 404 must remain fully accessible and inherit the responsive runtime.
assert '<meta name="viewport"' in error_page, "404 page lost its mobile viewport"
assert 'class="skip-link"' in error_page, "404 page lost its skip link"
assert 'id="main-content"' in error_page, "404 page main landmark is missing"
assert '/site-metrics.js' in error_page, "404 page is not covered by responsive/global runtime"
assert 'href="/genres/"' in error_page, "404 static navigation is missing Genres"

# Privacy copy must describe the current DM/email submission workflow, not the retired form.
assert "Instagram DM or email" in privacy, "Privacy page does not describe current submission channels"
assert "does not collect or store an artist-submission form" in privacy, "Privacy page does not explicitly retire the old form"
for stale in ("Cloudflare Turnstile", "transactional email provider sends the confirmation", "The form is protected"):
    assert stale not in privacy, f"Retired submission-system copy remains in Privacy: {stale}"
assert "Last updated:</strong> 24 August 2026" in privacy, "Privacy update date is stale"

# Artist landing copy and shell should reflect the current 33-profile system.
assert "Explore 33 NextGen Sessions artists" in artists, "Artist count/copy is stale"
assert "Open any artist profile" in artists, "Artist landing still describes the old partial-profile model"
assert "Published profile pages open directly" not in artists, "Old artist-profile wording remains"
assert 'href="/genres/"' in artists, "Artists static navigation is missing Genres"

# Submit should be usable and complete even before shared JavaScript enhancement runs.
assert '<meta name="viewport"' in submit, "Submit page lost its mobile viewport"
assert 'href="/genres/"' in submit, "Submit static navigation is missing Genres"
assert 'aria-current="page" href="/submit.html"' in submit, "Submit active navigation state is missing"
for href in ("/artists/", "/releases/", "/genres/", "/mixes/", "/privacy/", "mailto:contact@nextgensessions.com"):
    assert href in submit, f"Submit static footer missing {href}"
assert '/site-metrics.js' in submit, "Submit page lost shared responsive runtime"

print("Responsive shell QA passed: navigation, footer, 404, Privacy, Artists and Submit")
