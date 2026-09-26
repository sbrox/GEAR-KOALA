# GearKoala

Static fitness-equipment guide and Deal Checker, with two Vercel listing endpoints.

## Reliability policy

Ambiguous identities, accessories, damaged equipment and unverified asking prices cannot produce a whole-equipment purchase recommendation. Valuation evidence and a purchase verdict are separate decisions.

Known equipment with compatible verified sales receives a sale range and median. Three or more distinct sales support a market estimate; one or two are labeled a limited sales reference. Recent observations are preferred where sufficient. Catalog-plus-lot evidence and verified buyer attestations are recognized and labeled; duplicates and contradictory prices are not counted twice. Incomplete condition/date metadata lowers the interpretation rather than erasing all useful sale evidence.

A Grab Score/purchase verdict additionally requires a specific compatible configuration, at least two sources, dated sales within the past year, matching known condition, and a bounded price spread. Family-level, historical, buyer-attested and mixed/unknown-condition pools remain unscored. A retail-only reference is explicitly labeled as a rough heuristic with zero sold comps; it cannot produce a purchase verdict. No database schema or records are changed.

Concept2 Model D / standard RowErg uses exact model → compatible frame/monitor → same-monitor family fallback. Explicit PM3/PM4/PM5, Model E/tall-leg, Dynamic, SkiErg and BikeErg differences are respected. Missing Model D monitor information offers separate configuration choices instead of silently mixing generations. RowErg defaults to its standard PM5 configuration; explicit conflicting equipment remains excluded.

## Listing extraction

`/api/listing` and `/api/resolve-listing` use the same restricted HTTPS extractor in `listing-core.mjs`. It validates DNS destinations and redirects, bounds duration and response size, rejects failed/challenge/catalog pages, and requires one structured Product. Only a current, product-bound USD Offer can suggest a price. Users review the title and enter a confirmed asking price before evaluating. No slug guessing or whole-page dollar scraping is used.

Blocked or unsupported sources require manual entry. Photo identification and Scout remain unavailable. The public GitHub issue link is for feedback; users should not include private data.

## Development and validation

Run `node --test tests/*.cjs tests/*.mjs` and `node --check` on JavaScript sources. A static HTTP server is enough for frontend testing; API testing requires Node/Vercel. No package install is needed for the server built-ins.

Deploy working branches as previews in the existing `gearkoala-v1` Vercel project. Never promote production without explicit approval.

## Operational follow-up

Structured extraction failure logs contain an event and marketplace hostname, not a submitted URL. Client data failures are surfaced and logged. No third-party analytics tracker or persistent usage storage has been added. Set and verify a platform-wide abuse/rate policy and monitoring before public launch; per-function time/size restrictions alone are not distributed rate limiting.
