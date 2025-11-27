1. Product essence
Mission:
 Give people in Germany a simple, everyday way to reward companies that actively defend democracy and keep clear distance from right‑wing extremism – starting with a barcode scan.
Core idea vs “Push to Leave”
Push to Leave = “Is this company still doing business in Russia?” – boycott of war sponsors.(Business Insider)


Push to Hold = “Does this company publicly hold the democratic line against extremism?” – positive pressure for clear pro‑democracy commitments.


Traffic light model
🟢 Green – “We stand firm”


Signed your democracy pledge (board or C‑level).


No recent conflicts with the criteria.


🟡 Yellow – “Unclear / silent”


No pledge; no known cooperation with extremist actors.


Or: old/inconclusive signals, under review.


🔴 Red – “Conflicts documented”


Evidence of cooperation / alignment with actors classified as extremist / anti‑constitutional, or clear violations of the pledge.



2. Key user groups & what they want
Consumers


“When I scan, I want a clear signal: green = support, red = reconsider.”


“I want evidence, not hearsay.”


“I want ways to reward good actors (green) and nudge others.”


Employees / jobseekers


“Is my (future) employer clearly pro‑democracy?”


“Can I show my works council / HR concrete info?”


Companies


“We are clearly pro‑democracy; how do we show this in a credible way?”


“If we’re rated badly, how do we respond, correct, and improve?”


Allies (NGOs, media, researchers)


“We need an open, documented dataset and methodology to cite.”



3. Surface 1 – The Consumer App (iOS / Android)
3.1 Core flow: “Scan & See”
1. Scan screen
Big central barcode scanner (camera view).


Optional “type barcode manually” and “search by brand/company”.


2. Result screen (company‑centric)
When a GTIN is resolved to a company via Open Food Facts / Open Products Facts and your mapping:
Top card


Company name & logo.


Traffic light pill:


🟢 “Committed to democracy”


🟡 “No clear stance found yet”


🔴 “Conflicts with democracy criteria”


Mini explainer: “Based on our Democracy Pledge & evidence. Tap to see details.”


Details section


Short text summary:


For green: “Signed our democracy pledge on 2025‑04‑02; no conflicts found.”


For yellow: “No pledge yet. No public commitment or conflict found so far.”


For red: “We documented cooperation with X (extremist actor) on [date]. Under review.”


Sources: 2–5 bullets:


Link to pledge / press release.


Link to coverage (e.g. media articles, official records).


Timestamped.


Action strip


“See all products from this company” (inside app).


“Share this company profile” (link to public web page).


“Ask them to take the pledge” (opens email / social template, but keep neutral: “Please clarify your stance on democracy and extremism”, not targeted political messaging at specific groups).


3.2 Secondary features (still MVP‑friendly)
History: last 20 scanned products.


Favorites: “Follow this company’s stance”; get notified if rating changes.


Category filters: show “Top green brands” in e.g. “Supermarket basics”, “Drogerie”, etc.


3.3 UX philosophy
Positive first: green is the hero state; app feels like “support defenders”, not “hunt enemies”.


Radical transparency: every traffic light is backed by explicit, clickable evidence.


No witch‑hunts: user‑generated “this is red!!” reports never directly set status; they just open a review ticket.



4. Surface 2 – Public Web (for citizens, journalists, NGOs)
Think of this as your public knowledge base + methodology + accountability hub.
4.1 Public company pages
URL shape: /company/{slug}
Header:


Name, logo, sector, HQ country, size bracket.


Traffic light + democracy score summary.


Tabs:


Overview


Status (green/yellow/red), short explanation.


“Last reviewed: [date/time]”.


Pledge status: “Signed / Not signed / Revoked”.


Pledge & statements


Text of the pledge they signed.


Additional self‑published statements they submitted (“Our commitment to democracy”).


Evidence & timeline


Chronological list of events: pledges, controversies, corrections, clarifications.


Each entry has:


Type (“Pledge”, “Media report”, “Court ruling”, “Association membership”, etc.)


Source link (media, parliamentary record, company statement).


Impact on traffic light.


Q&A / right‑of‑reply


Public answers from the company to standard questions, e.g.:


“Do you cooperate with AfD or organisations classified as extremist?”


“How do you ensure your lobbying respects democratic principles?”


Time‑stamped.


4.2 Discovery features
Search by company / brand / barcode.


Lists & filters:


“Green supermarket brands”


“Green Mittelstand companies”


“Companies under review”


Methodology section


Plain‑language explanation of:


How GTIN→brand→company works (leveraging Open Food Facts/Open Products Facts etc.).(Open Food Facts)


What counts as “extremist actor” (backed by official classification, e.g. Bundesamt für Verfassungsschutz, not your opinion).


How evidence is weighted.


How appeals work.


4.3 Open data & API
Provide downloadable snapshots (CSV/JSON) of:


Companies.


Democracy status.


Evidence metadata (not full text, just references).


Public API (even if very minimal at first):


GET /v1/company/{id}


GET /v1/scan/{gtin} → returns resolved company + status.



5. Surface 3 – Company Portal (self‑service for firms)
This is where companies claim their profile, sign the pledge, and answer questions – but under your moderation.
5.1 Access & verification
Claim flow:


Company searches for their name.


Choose: “Claim this profile”.


Verify via:


Email to domain (e.g. @company.de), and/or


Upload of official doc, and/or


Manual NGO verification for tricky cases.


5.2 Pledge signing workflow
Wizard‑style flow:


Read pledge – clear, legally vetted, limited in scope:


Commit to democracy, human rights.


No cooperation with actors officially classified as extremist / anti‑constitutional.


Commitment to address future issues if flagged.


Self‑assessment questionnaire


“In the past 3 years, have you…”


Supported campaigns/events of parties or organisations classified as extremist?


Donated to them or their associated structures?


Hosted them on your premises?


Answers must be consistent with public record.


Sign


Named representative (board member, MD, or similar).


Signature date + optional PDF of internal policy (e.g. code of conduct).


Review


You (or a partner NGO) review pledge + evidence before switching to 🟢.


5.3 Managing controversies & corrections
“Disagree with our rating?” flow


Company can submit:


Factual corrections (“We ended membership in Association X on [date]”).


Context (“One manager attended event Y in personal capacity; we’ve since changed policy.”)


You decide:


Keep red but update narrative.


Move yellow → green after concrete steps.


Timeline of interactions shown in public profile (transparency).


5.4 Light analytics (careful with privacy)
Allow companies to see:


Approximate number of scans of their products (aggregated & anonymised).


Trend over time.


This turns consumer attention into a carrot:


“After signing the pledge, scans & positive mentions increased X%” (if true).



6. Data & architecture layer
Under the hood you basically have:
6.1 Product & company resolution
Goal: GTIN → Brand → Legal entity.
You can lean on:
Open Food Facts (food products) – open database with barcodes and rich product data, with an existing API and mobile app code you can reuse.(Open Food Facts)


Open Products Facts (non‑food everyday products) – broader product categories.(world.openproductsfacts.org)


OpenCorporates – open corporate entity database with 200M+ company records from 140+ registries and API access.(opencorporates.com)


Tables (simplified):
Product


gtin (barcode)


name


brand_id


source (OFF, OPF, manual, etc.)


Brand


id, name


primary_company_id


Company


id (internal)


opencorporates_id (or registry id)


official_name


country, sector, size_bracket


democracy_status (green/yellow/red)


democracy_score (optional 0–100)


last_review_at


CompanyEvidence


id, company_id


type (pledge, donation_record, news_article, court_record, etc.)


source_url, source_title


date_of_event


impact (+2, –5, “under review”, etc.)


CompanyPledge


company_id


signed_at


signatory_name, role


document_url (PDF)


status (active, withdrawn, suspended)


This keeps GTIN resolution separate from your democracy layer, which is important for legal clarity: product data comes from open databases; your classification is your added layer.
6.2 Services (macro‑architecture)
Ingestion service


Periodically pulls new / updated products from Open Food Facts & Open Products Facts via their APIs/exports.


Resolution service


Given a GTIN, resolves the product → brand → company and returns a company ID.


Democracy index API


GET /company/{id} – returns democracy status, evidence, pledge info.


GET /scan/{gtin} – app endpoint (encapsulates resolution + democracy info).


Admin / curation back‑office


Internal UI for editors/legal to:


Add & review evidence.


Approve pledge applications.


Change statuses with required notes.



7. Democracy index: criteria & safeguards
To stay legally robust in Germany/EU, you need:
7.1 Clear, published criteria
Split into 3 buckets:
Positive criteria (for green)


Signed pledge with required level of representation.


No credible evidence of cooperation with extremist actors in X years.


If past issues existed: documented corrective actions.


Neutral criteria (for yellow)


No pledge and no substantial evidence either way.


Or mixed/inconclusive signals: you explicitly state “under review”.


Negative criteria (for red)


Documented cooperation with parties/organisations officially classified as extremist or anti‑constitutional (using official sources, not your classification).


Repeated public statements by the company as a corporate actor undermining democratic order.


Refusal to correct or distance after being confronted with clear evidence.


7.2 Evidence standards
No red status without at least 2 independent reputable sources, unless it's an official government classification / court ruling.


You always:


Link to the original source.


Provide the date of event and date you logged it.


Distinguish facts (“X sponsored an event of organisation Y on date Z”) from your interpretation (“This conflicts with our pledge point 3”).


7.3 Right of reply & correction
Companies can:


Challenge factual errors.


Provide new evidence (e.g. termination of a partnership).


You commit to:


Respond and, if justified, correct within a clear timeframe.


Keep a visible change log to show what changed and why.


7.4 Governance
To increase trust:
Create a small advisory board (legal + academic + civil society) who:


Co‑own the criteria.


Are publicly listed.


Publish a legal & editorial policy that covers:


How you handle threats / legal letters.


How you treat ambiguous cases.


How you avoid partisan bias (stick to constitutional standards, not party politics).



8. MVP slice (what I’d ship first)
You want a thin, end‑to‑end vertical that proves the concept:
Scope


Region: Germany.


Retail context: supermarkets + Drogerien (REWE, Edeka, Aldi, Lidl, dm, Rossmann, etc.).


Product scope: everyday consumer goods with good coverage in Open Food Facts/Products Facts (food, cosmetics, cleaning).


Data


Import a subset of products where you can confidently map brand → company.


Curate ~100–200 high‑visibility companies manually (top FMCG & retail brands).


For these:


Manually research & assign traffic light status.


Collect evidence.


Reach out to a few early‑adopter companies for pledge signing.


Features


Mobile app:


Scan → show company name + simple traffic light + one sentence + “see more” (opens public web page).


Public web:


Company pages for these ~100–200 firms.


Methodology page.


Company portal (very minimal):


Claim profile.


Submit pledge.


Submit corrections.


That’s already enough to let someone stand in a REWE aisle, scan a few yoghurts and detergents, and feel how the app works.

9. Where we can go next together
Next steps I can help you with right away, if you like:
Draft a first version of the democracy pledge (with notes on what a lawyer should look at).


Sketch the database schema and API endpoints in more detail.


Design wireframes for:


The scan result screen.


A public company page.


The pledge signing flow.


But as a conceptual foundation, you now have:
Clear roles for app / public web / company portal.


A structured data & governance model.


A realistic MVP slice that’s politically meaningful but still buildable.


If you tell me which part you want to dive into first (e.g. pledge text, data model, or app UX), I’ll go straight into concrete drafts.

