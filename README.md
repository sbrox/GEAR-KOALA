# GearKoala

Static fitness-equipment guide and Deal Checker, with two Vercel listing endpoints.

## Reliability policy

Uncertainty produces an explicit abstention, not a purchase verdict. Exact identity, compatible configuration and condition, recent traceable USD sales, independent sources and a bounded price spread are required to score. MSRP is retail context only. Family identification is not enough to value a machine.

The present gate requires five distinct eligible sales across at least two sources and sale dates in the past year. It deliberately excludes catalog-only links, missing transaction evidence, unknown condition, parts, damaged items and bundles. It does not repair or merge database records. Sources and eligibility still require ongoing human data QA; passing software tests does not verify a marketplace transaction.

## Listing extraction

`/api/listing` and `/api/resolve-listing` use the same restricted HTTPS extractor in `listing-core.mjs`. It validates DNS destinations and redirects, bounds duration and response size, rejects failed/challenge/catalog pages, and requires one structured Product. Only a current, product-bound USD Offer can suggest a price. Users review the title and enter a confirmed asking price before evaluating. No slug guessing or whole-page dollar scraping is used.

Blocked or unsupported sources require manual entry. Photo identification and Scout remain unavailable. The public GitHub issue link is for feedback; users should not include private data.

## Development and validation

Run `node --test tests/*.cjs tests/*.mjs` and `node --check` on JavaScript sources. A static HTTP server is enough for frontend testing; API testing requires Node/Vercel. No package install is needed for the server built-ins.

Deploy working branches as previews in the existing `gearkoala-v1` Vercel project. Never promote production without explicit approval.

## Operational follow-up

Structured extraction failure logs contain an event and marketplace hostname, not a submitted URL. Client data failures are surfaced and logged. No third-party analytics tracker or persistent usage storage has been added. Set and verify a platform-wide abuse/rate policy and monitoring before public launch; per-function time/size restrictions alone are not distributed rate limiting.
