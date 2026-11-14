# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: hackathon judges reviewing the NASA Space Apps 2026 submission. They arrive from a link, usually with a few minutes, and need to understand what the project is, that it uses real NASA data, and why it matters.

## Product Purpose
Lets a visitor explore where the Sun and Earth sit above the horizon at Moon landing sites, and compare two places for the same dates. Success for this surface: a judge understands the idea and the data in under a minute, then can rotate the Moon, pick a place, and see the numbers without help.

## Positioning
A 3D Moon you rotate and click to pick any place, with the sunlight and Earth-visibility numbers attached to that place, and the method stated next to the numbers.

## Operating Context
- Viewed in a browser on desktop and phone, no account, no setup.
- Judges read the project page first and then open the live site.
- The site is static: HTML, CSS, and vanilla JavaScript modules, with Three.js vendored locally. It runs from a plain web server.

## Capabilities and Constraints
- Data: a cached set of 721 hourly NASA/JPL Horizons samples, 14 Nov to 14 Dec 2026, UTC.
- Model: smooth reference sphere. Terrain, crater shadows, eclipses, radio links, power, and thermal conditions are not calculated.
- Supported dates are limited to the cached range. Out-of-range input is rejected with a message.
- Terminology: "Sun elevation", "Earth elevation", "Site A", "Site B", "above modeled horizon".

## Brand Commitments
- The rotatable 3D Moon stays the main interaction on desktop.
- The two-site comparison (Site A and Site B) stays a core feature.
- The data descriptions, limits, and method notes stay. Marketing wording may be removed (changed by the team on request).

## Evidence on Hand
- `data/horizons-raw.txt`: the full Horizons response.
- `data/ephemeris.json`: the exact query URL, retrieval time, and the 721 samples.
- `SOURCES.md`: NASA sources, model assumptions, and the collaborator-reported validation, which is limited.
- `assets/moon_lro_web.glb`: a team-supplied model whose original NASA source is still being confirmed. Do not state its source as verified.
- No photographs, customer material, or testimonials exist. Do not add any.

## Product Principles
- Numbers come first, and each one is traceable to its source.
- State the limits next to the numbers, not in a footer.
- Judges should be able to act without reading the method notes.
- Keep the Moon interactive. A static picture would lose the point.
