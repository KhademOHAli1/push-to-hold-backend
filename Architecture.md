1. Databases / data sources we can build on
1.1 Product & barcode data
Open Food Facts (OFF) – for food & many supermarket items
Huge open database of food products with barcode → product info, including brand, images, ingredients.(Open Food Facts)


Public API to fetch a product by barcode (GTIN / EAN‑13 etc.): /api/v0/product/{barcode}.json.(Open Food Facts)


Full data dumps (CSV / JSON / parquet) for offline usage.(Open Food Facts)


Open Products Facts (OPF) – for non‑food everyday products
Sister project to OFF, for cosmetics, cleaning products, etc.(world.openproductsfacts.org)


There is a universal barcode scanning API that routes to the right DB (food / beauty / pet / products) and returns a product with product_type if it exists.(Open Food Facts)


👉 For Edeka/Rewe/Aldi products this is our starting point: scan → ask OFF/OPF → get product name, brand, maybe some label text.

1.2 Company / manufacturer data
OpenCorporates
Open database of >200M companies worldwide with APIs.(api.opencorporates.com)


API lets you search companies by name + jurisdiction and fetch registered details (company number, address, etc.).(PublicAPI)


There is a free “open data” tier for public‑benefit projects, usually via API key.(api.opencorporates.com)


OffeneRegister / German open company data
German register data is mirrored as open data via OffeneRegister.de in cooperation with OpenCorporates.(OffeneRegister.de)


👉 We’ll use Open Food/Products Facts for GTIN → product/brand and OpenCorporates/OffeneRegister for brand owner company info.
 Everything we add on top (democracy index, pledge, evidence) lives in our own Postgres DB.

2. High‑level system architecture
Conceptual picture (text version):
Flutter Apps (Android/iOS)
 Next.js Web (public + portal)
 ⬇️
 API Gateway / Backend (Node + TypeScript)
 ⬇️
 Postgres (our data) + Redis (cache/queues)
 ⬇️
 External APIs: Open Food Facts / Open Products Facts / OpenCorporates
We’ll start with a single backend service (monolith) with clear modules:
Catalog service – GTIN → product → brand → company


Democracy index service – pledge, evidence, status, timelines


Auth & users – consumers, company reps, admins


Company portal API – claim profile, sign pledge, provide answers


Admin / curation – internal UI + APIs


Ingestion workers – regularly sync OFF/OPF and lookup companies via OpenCorporates


Later you could split them into microservices, but we don’t need that complexity for MVP.

3. Backend stack & services
3.1 Tech choices
Language / framework
Node.js + TypeScript


NestJS (highly structured, great for modular domains and OpenAPI)


Alternatives: Fastify/Express + your own layering, but Nest fits well here.


Database
PostgreSQL for:


products (products table)


brands


companies


democracy index (pledges, evidence, status history)


users & auth


scan events & analytics


ORM
Prisma or TypeORM – I’d pick Prisma for TypeScript DX.


Cache & queues
Redis


Caching hot lookups (GTIN → product/company).


Background job queue (BullMQ / custom), e.g., for:


Importing OFF/OPF dumps


OpenCorporates enrichment


Sending emails / notifications


Search
For MVP:


Postgres full‑text search (tsvector) for companies/brands.


Later:


Add Meilisearch or OpenSearch if you need fancy search.


Auth & security
JWT‑based access tokens for Flutter apps.


Cookie‑based sessions (via NextAuth or custom) for the web portal.



3.2 Backend modules (within one NestJS app)
AuthModule


Endpoints: register, login, refresh token, password reset.


Integrates with users table.


CatalogModule


Endpoints:


GET /api/v1/scan/{gtin} – main barcode resolution endpoint.


GET /api/v1/companies/{id} – company profile.


GET /api/v1/companies – list/search.


Logic:


Check local products table.


If unknown:


Call OFF/OPF universal scanning API once, parse JSON and store product+brand.(Open Food Facts)


Map brand → company (by your mapping table).


Cache in Redis.


Background tasks:


Nightly import of OFF/OPF dumps (via worker).


CompanyModule


CRUD for companies (for admin).


Integration with OpenCorporates:


For a new brand owner name, query OpenCorporates API to get legal entity & register number.(api.opencorporates.com)


Store that in companies + company_external_ids.


DemocracyIndexModule


Endpoints:


GET /api/v1/companies/{id}/timeline


GET /api/v1/open-data/companies


Admin endpoints:


Add / edit evidence items.


Change democracy status.


Logic:


Knows how to calculate a score from evidence_items + pledge status.


CompanyPortalModule


Endpoints under /api/v1/company-portal/...:


Claim company profile.


Sign pledge.


Submit official answers & corrections.


AdminModule


Secure area for your team.


Endpoints for:


Reviewing claims


Moderating evidence & responses


Running imports


AnalyticsModule


Endpoints to show:


Scan counts per company.


Follower stats.


Feeds charts in admin & company portal.



3.3 Data ingestion / sync
Product ingestion (OFF/OPF)
Worker (Node or Python, doesn’t matter) that:


Downloads updated OFF/OPF dumps regularly.(Open Food Facts)


Parses:


barcode (code)


product name (product_name)


brands (brands)


Normalises brand names and links them to brands table.


Optionally: store nutrition/eco scores for later.


Company enrichment (OpenCorporates)
Another worker that:


Takes brand owner names without a linked company.


Queries OpenCorporates API for each (with country_code=DE).(api.opencorporates.com)


Stores matched entity in companies (official name, company number, jurisdiction).


Links brand → company.


You can throttle requests and respect API limits easily in a worker queue.

4. Flutter apps (Android / iOS)
4.1 Tech setup
Flutter 3+


State management: Riverpod or Bloc (your choice).


Networking: dio or http.


Persistent storage: sqflite or hive for:


auth token


recent scans cache


4.2 App layers
Presentation (Widgets)


Screens:


Scan screen


Result screen


Company detail


History


Settings / Login


Application layer


ScanController / ScanBloc – calls backend /scan/{gtin}.


CompanyController – fetch company detail, timeline, follow/unfollow.


AuthController – login/register/logout.


Data layer


ApiClient (handles HTTP & auth headers).


ProductRepository:


Future<ScanResult> scan(String gtin);


CompanyRepository:


Future<Company> getCompany(String id);


Future<Timeline> getTimeline(String id);


Infrastructure


Barcode scanning plugin on device (e.g. mobile_scanner).


Error handling, retry logic, offline fallback.


4.3 Typical scan flow
User scans barcode → Flutter gets gtin as string.


Flutter calls: GET /api/v1/scan/{gtin}.


Backend resolves product & company from Postgres/Redis/external API.


Flutter displays:


Product name & brand


Company card with democracy traffic light


Actions like “follow company”, “view details”, “report issue”.



5. Next.js web (public + portal)
5.1 Tech setup
Next.js 16+ (App Router)


TypeScript


Styling: Tailwind CSS or another design system


Auth: NextAuth (or custom) backed by the same users table


5.2 Page structure
/ – Landing page, explanation, how it works


/company/[slug] – Public company page:


Uses GET /companies/{id} + /companies/{id}/timeline


Can be rendered via SSR or SSG + revalidation


/explore – Filters for companies: status, sector, country


Uses GET /companies API


/portal – Login / entry for company reps


/portal/companies – list “my companies”


/portal/companies/[id] – dashboard (pledge status, questions, analytics)


/admin – Internal admin dashboard


Only for role=ADMIN users


Connects to /admin/... API endpoints


5.3 Data fetching pattern
Public pages:


Prefer server components + fetch() from your API with revalidation, e.g.:


const res = await fetch(
  `${process.env.API_URL}/api/v1/companies/${id}`,
  { next: { revalidate: 300 } }
);

Portal/admin:


Use NextAuth session on the server to include auth headers when calling backend.



6. How everything talks together (3 core flows)
6.1 Flow 1 – Consumer scans a yoghurt in Rewe
Flutter barcode scanner reads gtin = "4001234567890".


Flutter calls GET /api/v1/scan/4001234567890 (with optional user token).


Backend:


Normalises GTIN.


Checks Redis cache.


If not cached:


Looks up in products table.


If product missing:


Calls OFF/OPF universal scanning API to get product info.(Open Food Facts)


Upserts into products + brands.


Links brand to existing company if known; otherwise, create placeholder company like “Unknown brand owner”.


Fetches company_democracy_status.


Stores a scan_events row.


Returns JSON with product + company + democracy status.


App shows traffic light + short explanation.



6.2 Flow 2 – Company claims profile & signs pledge
Someone from “FrischLand GmbH” goes to /portal in the web app.


They register/login (Next.js + backend auth).


They select their company and submit a claim:


POST /api/v1/company-portal/claims.


Admin sees the claim in /admin:


Verifies via imprint / OffeneRegister / OpenCorporates.(api.opencorporates.com)


Approves via POST /admin/company-claims/{id}/decision.


This creates a company_accounts entry giving the user ROLE=ADMIN for that company.


Company rep goes back to /portal/companies/[id]:


Reads pledge text (from pledge_versions).


Signs pledge via POST /company-portal/companies/{id}/pledges.


Admin reviews; if OK, sets status to ACTIVE and updates company_democracy_status → GREEN.



6.3 Flow 3 – Your curation team imports product data
Nightly, a worker job runs:


Download latest OFF dump / use their incremental export.(Open Food Facts)


Map new barcodes to products.


Extract brands and update brands.


Another job processes brand owners:


For unknown brand owner names, call OpenCorporates API for German jurisdiction.(api.opencorporates.com)


Store matched company into companies.


Admins then curate democracy status & evidence for the top‑scanned companies (from scan_events).



If you want, next I can:
Turn this into a concrete repo layout (folders, services, package.json scripts), or


Sketch NestJS module & controller stubs and Flutter API client interfaces, so you have something you can literally start coding from.



