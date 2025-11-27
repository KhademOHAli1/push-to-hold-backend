1. Database schema (relational sketch)
Assume PostgreSQL, snake_case, UUIDs as primary keys.
1.1 Users & auth
You’ll have 3 main “roles”: consumer, company_rep, admin.
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('consumer', 'company_rep', 'admin')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE user_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id),
  display_name    TEXT,
  locale          TEXT, -- 'de-DE', 'en-GB', etc.
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false
);
For company reps, we link them to companies via a separate mapping:
CREATE TABLE company_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  company_id      UUID NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('rep', 'legal', 'admin')),
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

1.2 Core entities: company, brand, product
Companies
This is the legal entity that gets the democracy status.
CREATE TABLE companies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  official_name       TEXT NOT NULL,
  display_name        TEXT,          -- optional short/brand name
  country_code        CHAR(2) NOT NULL, -- 'DE', 'AT', etc.
  sector              TEXT,          -- free text or FK to sectors table
  size_bracket        TEXT,          -- e.g. 'SME', 'large', etc.
  website_url         TEXT,
  hq_address          TEXT,
  democracy_status    TEXT NOT NULL 
                      CHECK (democracy_status IN ('green', 'yellow', 'red')),
  democracy_score     INTEGER,       -- 0-100, optional
  status_reason_short TEXT,          -- 1–2 sentence summary for UI
  last_review_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE company_external_ids (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  system           TEXT NOT NULL, -- 'opencorporates', 'handelsregister', etc.
  external_id      TEXT NOT NULL,
  UNIQUE (system, external_id)
);
Brands
Many products → one brand → one main company.
CREATE TABLE brands (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  company_id      UUID REFERENCES companies(id),
  website_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, company_id)
);
You could model multi-company brand ownership via a join table if needed, but for consumer goods it’s usually 1→1 in practice.
Products (GTINs)
CREATE TABLE products (
  gtin              VARCHAR(14) PRIMARY KEY, -- EAN-13 etc.
  name              TEXT,
  brand_id          UUID REFERENCES brands(id),
  category          TEXT,
  source_system     TEXT,      -- 'openfoodfacts', 'openproductfacts', 'manual'
  source_product_id TEXT,      -- id in that system
  image_url         TEXT,
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
If you sometimes need to override the brand→company mapping for specific products (e.g. private labels), add:
CREATE TABLE product_company_overrides (
  gtin           VARCHAR(14) PRIMARY KEY REFERENCES products(gtin) ON DELETE CASCADE,
  company_id     UUID NOT NULL REFERENCES companies(id),
  reason         TEXT,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

1.3 Democracy index: pledges, evidence, status history
Pledge definitions & signatures
You want versioned pledge text, so a company can be marked as having signed v1.0, v1.1 etc.
CREATE TABLE pledges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version         TEXT NOT NULL,     -- '1.0', '1.1', etc.
  title           TEXT NOT NULL,
  body_markdown   TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE company_pledges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pledge_id           UUID NOT NULL REFERENCES pledges(id),
  status              TEXT NOT NULL 
                      CHECK (status IN ('pending_review', 'approved', 'rejected', 'withdrawn')),
  signed_at           TIMESTAMPTZ NOT NULL,
  approved_at         TIMESTAMPTZ,
  signatory_name      TEXT,
  signatory_role      TEXT,
  pledge_doc_url      TEXT,          -- uploaded PDF or similar
  created_by_user_id  UUID REFERENCES users(id), -- company_rep
  reviewed_by_user_id UUID REFERENCES users(id), -- admin/editor
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, pledge_id, status) -- or tighter business rule
);
Evidence (sources for your status)
You can normalize “source” and “evidence” or keep them in one table; I’ll keep them unified:
CREATE TABLE company_evidence (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type              TEXT NOT NULL 
                    CHECK (type IN (
                      'pledge', 'company_statement', 'news_article',
                      'court_decision', 'gov_report', 'association_membership',
                      'donation_record', 'other'
                    )),
  title             TEXT NOT NULL,    -- short description
  source_url        TEXT,
  source_name       TEXT,             -- e.g. 'Tagesschau', 'Bundesanzeiger'
  source_date       DATE,             -- when event happened
  collected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by_user_id  UUID REFERENCES users(id),
  impact            INTEGER,          -- e.g. +5, -10 (weighting for scoring)
  notes_markdown    TEXT,
  is_public         BOOLEAN NOT NULL DEFAULT true, -- some internal only
  is_disputed       BOOLEAN NOT NULL DEFAULT false,
  dispute_notes     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
Status history (audit trail of green/yellow/red)
CREATE TABLE company_status_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  previous_status   TEXT NOT NULL CHECK (previous_status IN ('green', 'yellow', 'red')),
  new_status        TEXT NOT NULL CHECK (new_status IN ('green', 'yellow', 'red')),
  reason_markdown   TEXT,
  evidence_ids      UUID[],        -- optional list of evidence IDs
  changed_by_user_id UUID NOT NULL REFERENCES users(id),
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

1.4 Company questions & correction requests
Public questions → aggregated for companies
You probably don’t want raw free‑text from every user exposed 1:1. So:
CREATE TABLE question_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT UNIQUE NOT NULL, -- 'stance_on_extremist_cooperation'
  text           TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE company_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id    UUID REFERENCES question_templates(id),
  question_text  TEXT NOT NULL,  -- could be derived from template
  status         TEXT NOT NULL 
                  CHECK (status IN ('pending', 'answered', 'dismissed')),
  answer_markdown TEXT,
  answered_by_user_id UUID REFERENCES users(id),
  aggregated_count INTEGER NOT NULL DEFAULT 1, -- "this has been asked X times"
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_question_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id    UUID REFERENCES question_templates(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
Correction / appeal
CREATE TABLE company_correction_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submitted_by_user_id UUID NOT NULL REFERENCES users(id),
  status            TEXT NOT NULL 
                    CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  subject           TEXT NOT NULL,
  description_markdown TEXT NOT NULL, -- company’s view
  related_evidence_ids UUID[],
  related_status_change_id UUID REFERENCES company_status_history(id),
  resolution_markdown TEXT,
  resolved_by_user_id UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

1.5 Scans, follows & analytics
Store as little identifiable data as possible.
CREATE TABLE scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id), -- nullable for anonymous
  gtin            VARCHAR(14) NOT NULL REFERENCES products(gtin),
  company_id      UUID, -- denormalized for analytics convenience
  app_platform    TEXT, -- 'ios', 'android', 'web'
  country_code    CHAR(2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON scans (company_id, created_at);
Followers:
CREATE TABLE company_follows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

1.6 Audit log (optional but nice)
CREATE TABLE audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  UUID REFERENCES users(id),
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      UUID,
  payload_json   JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

2. API endpoints (REST-ish design)
Base path: /api/v1/…
 Responses JSON unless otherwise noted.
I’ll group them as:
Public / App (no auth or light auth)


Company Portal (auth, role = company_rep)


Admin / Internal (auth, role = admin)



2.1 Public / App API
Auth (for consumers & company reps)
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /auth/login request:
{
  "email": "alice@example.org",
  "password": "supersecret"
}
Response (example JWT-based):
{
  "token": "jwt-token-here",
  "user": {
    "id": "…",
    "email": "alice@example.org",
    "role": "consumer"
  }
}

Scan & resolution
1) Resolve GTIN & democracy status
GET /api/v1/scan/{gtin}
Response:
{
  "gtin": "4001234567890",
  "product": {
    "name": "Bio Joghurt Natur",
    "brand": {
      "id": "…",
      "name": "ExampleBrand"
    }
  },
  "company": {
    "id": "…",
    "display_name": "Example Company GmbH",
    "official_name": "Example Company GmbH & Co. KG",
    "democracy_status": "green",
    "democracy_score": 92,
    "status_reason_short": "Signed democracy pledge v1.0, no conflicts found.",
    "last_review_at": "2025-04-01T12:34:56Z"
  }
}
2) Record scan event
POST /api/v1/scans
Authorization: Bearer <token> (optional)

{
  "gtin": "4001234567890",
  "context": {
    "platform": "android",
    "country_code": "DE"
  }
}
Response: 201 Created with scan id.

Company search & details
GET /api/v1/companies?query=nestle&status=green&country=DE&page=1&page_size=20
Response (list):
{
  "items": [
    {
      "id": "…",
      "display_name": "Nestlé Deutschland AG",
      "country_code": "DE",
      "sector": "Food & Beverage",
      "democracy_status": "yellow",
      "democracy_score": 55
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1
}

GET /api/v1/companies/{company_id}
Response (detailed):
{
  "id": "…",
  "official_name": "Example Company GmbH",
  "display_name": "Example Co.",
  "country_code": "DE",
  "sector": "Retail",
  "size_bracket": "large",
  "website_url": "https://example.com",
  "democracy_status": "green",
  "democracy_score": 90,
  "status_reason_short": "Signed pledge, no conflicts.",
  "last_review_at": "2025-04-01T…",
  "pledge": {
    "has_signed": true,
    "pledge_version": "1.0",
    "signed_at": "2025-03-21T…"
  },
  "links": {
    "public_profile_url": "https://pushtohold.de/company/example-co"
  }
}
Evidence and timeline
GET /api/v1/companies/{company_id}/timeline
Response:
{
  "events": [
    {
      "type": "status_change",
      "date": "2025-03-21",
      "details": "Status changed from yellow to green after signing pledge v1.0."
    },
    {
      "type": "pledge",
      "date": "2025-03-20",
      "details": "Signed democracy pledge v1.0",
      "pledge_version": "1.0"
    },
    {
      "type": "evidence",
      "date": "2024-11-01",
      "details": "Joined Alliance for Democracy in Business (NGO X).",
      "evidence_id": "…"
    }
  ]
}
Or if you want raw evidence:
GET /api/v1/companies/{company_id}/evidence
With optional filters type, is_public.

Follow company & history
POST   /api/v1/companies/{company_id}/follow
DELETE /api/v1/companies/{company_id}/follow
GET    /api/v1/me/follows
GET    /api/v1/me/scans

Public questions to companies
User selecting “Ask them to clarify [topic]”:
POST /api/v1/companies/{company_id}/questions
Authorization: Bearer <token>

{
  "template_code": "stance_on_extremist_cooperation"
}
Response: aggregated question created/incremented.
Companies won’t get raw user details; you just bump the aggregated count.

Open data / export
For NGOs, journalists:
GET /api/v1/open-data/companies.csv
GET /api/v1/open-data/companies.json
GET /api/v1/open-data/evidence.csv
(You can require an API key or simple registration.)

2.2 Company Portal API (auth, role = company_rep)
Claim company
POST /api/v1/company-claims
Authorization: Bearer <token>

{
  "company_id": "…",
  "proof_type": "domain_email",
  "proof_value": "alice@company.de"
}
Backend sends verification email, etc.
GET /api/v1/company-claims
List my claims & statuses.
Once claim is verified, you create company_memberships row and allow access.

View & edit company public info (limited)
GET  /api/v1/portal/companies/{company_id}
PATCH /api/v1/portal/companies/{company_id}
PATCH payload could allow:
{
  "public_statement_markdown": "Our stance on democracy and extremism is...",
  "press_contact_email": "press@company.de"
}
This is stored in some company_portal_profile table or directly in companies with admin review.

Sign pledge
GET  /api/v1/pledges/active           # list of available pledge versions
POST /api/v1/companies/{company_id}/pledges
Authorization: Bearer <company_rep token>

{
  "pledge_id": "…",
  "signatory_name": "Dr. Alice Example",
  "signatory_role": "Geschäftsführerin",
  "signed_at": "2025-04-02T10:00:00Z"
}
Response: company_pledges record with status pending_review.

View & answer questions
GET /api/v1/portal/companies/{company_id}/questions?status=pending
Response:
{
  "items": [
    {
      "id": "…",
      "template_code": "stance_on_extremist_cooperation",
      "question_text": "Do you cooperate with parties or organisations officially classified as extremist?",
      "aggregated_count": 23,
      "status": "pending"
    }
  ]
}
Answer:
POST /api/v1/portal/companies/{company_id}/questions/{question_id}/answer
Authorization: Bearer <company_rep token>

{
  "answer_markdown": "We do not and will not cooperate with..."
}

Submit correction / appeal
POST /api/v1/companies/{company_id}/corrections
Authorization: Bearer <company_rep token>

{
  "subject": "Correction regarding claimed association membership",
  "description_markdown": "We have left Association X as of ... see attached proof.",
  "related_evidence_ids": ["…"]
}
Admins then manage status (open, in_review, resolved, …).

2.3 Admin / Internal API (role = admin)
This is your editorial / governance layer.
Manage companies & status
POST /api/v1/admin/companies
PATCH /api/v1/admin/companies/{company_id}
Set/override democracy status:
POST /api/v1/admin/companies/{company_id}/status
Authorization: Bearer <admin token>

{
  "new_status": "red",
  "reason_markdown": "Cooperation with organisation X classified as extremist by...",
  "evidence_ids": ["…", "…"]
}
The handler:
Writes company_status_history row.


Updates companies.democracy_status and status_reason_short.



Manage evidence
POST   /api/v1/admin/companies/{company_id}/evidence
PATCH  /api/v1/admin/evidence/{evidence_id}
DELETE /api/v1/admin/evidence/{evidence_id}
POST payload:
{
  "type": "news_article",
  "title": "Company X sponsors event with organisation Y",
  "source_url": "https://…",
  "source_name": "Serious Newspaper",
  "source_date": "2025-01-31",
  "impact": -10,
  "notes_markdown": "Based on article, they were main sponsor..."
}

Review pledges
GET  /api/v1/admin/company-pledges?status=pending_review
POST /api/v1/admin/company-pledges/{id}/review
Review payload:
{
  "action": "approve",     // or 'reject'
  "review_notes": "Signatory is legit, pledge acceptable."
}
Approving:
Sets pledge status to approved.


Potentially sets company status green + records history entry.



Handle correction requests
GET  /api/v1/admin/corrections?status=open
POST /api/v1/admin/corrections/{id}/resolve
Payload:
{
  "status": "resolved",  // or 'rejected'
  "resolution_markdown": "We updated your profile to reflect that you left Association X..."
}

Admin-only analytics
For your internal dashboard:
GET /api/v1/admin/stats/scans?company_id=...&from=2025-01-01&to=2025-01-31
GET /api/v1/admin/stats/company-status-counts

3. How this ties together at runtime
App scan → /scan/{gtin}
 → DB: products → brand → companies (maybe product_company_overrides)
 → returns company + democracy status + minimal product info.


Public web company page
 → /companies/{id} + /companies/{id}/timeline + /companies/{id}/evidence
 → uses companies, company_status_history, company_evidence, company_pledges.


Company portal
 → Auth as company_rep → company_memberships
 → claim, sign pledge, answer grouped questions, submit corrections.


Admin
 → uses admin endpoints to curate evidence, change statuses, review pledges & corrections.


