# GearKoala V30 — server-side listing resolver

Supersedes V28.

## Link ingestion
- Adds `/api/resolve-listing` Vercel serverless resolver.
- Source-aware handling for GovPlanet, GovDeals and HiBid.
- Reads OpenGraph/meta tags, JSON-LD structured data and visible text.
- GovPlanet fallback can identify known make/model from publicly exposed title/URL even if detail fetch is blocked.
- Price is never invented. If the marketplace does not expose it, the UI asks for price or screenshot.
- Existing URL-slug fallback remains as the last fallback.

## Deployment
- Includes `vercel.json` for the resolver.
- This version should be deployed as a Vercel project rather than opened only as local static files, because `/api/resolve-listing` needs server-side execution.
- Best long-term deployment path: Git repository connected to the existing Vercel project; pushes then create automatic deployments.

## V30 source expansion
- Adds Nextdoor, Reddit/local communities, estate & moving sales, and community classifieds to the Local Resale source universe.
- These are discovery/asking-market sources by default, not verified sold comps.
- Login-gated/community sources are designed for user-submitted URL/text/screenshot ingestion rather than unauthorized scraping.
- Scout ticker stays category-level rather than listing every local source.


V31: Source-safety language added. Facebook Marketplace, Nextdoor, Reddit, and community classifieds are explicitly user-submitted unless an authorized collection method is available. Added non-affiliation/data-partnership disclaimer and clearer evidence/expanding/user-submitted statuses.
