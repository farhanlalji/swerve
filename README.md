# Swerve

A swipe-based trolley-problem study. Players swipe through 20 balanced dilemmas, get a moral archetype, challenge friends with a link that carries their answers, and can play a 30-card deeper run. Every swipe is saved for research with its decision time.

**Stack:** Next.js 15 (App Router) on Vercel · Supabase Postgres (London region) · self-hosted fonts · optional Google AdSense.

## How it works

| Path | What it is |
| --- | --- |
| `/` | Onboarding → core 20 → profile → deeper dilemmas |
| `/c/<code>` | Challenge link. Shows "<nick> challenged you" with a share preview image, then compares answers |
| `/research` | Researcher view (password: `RESEARCH_KEY`): cell-by-cell results and CSV export |
| `/privacy` | Privacy notice (draft: review before launch) |
| `/api/participants` | Registers a participant and returns a signed token. Country and region come from Vercel's edge headers. The IP is never stored |
| `/api/responses` | Saves swipes in batches. Retries are idempotent |
| `/api/export` | JSON or CSV export for researchers |
| `/api/og` | 1200×630 share image for WhatsApp, iMessage and LinkedIn previews |

**Research design** (`lib/scenarios.ts`):

- **Core:** a 2 × 3 × 3 factorial. Mechanism is lever or push. Lives at stake are 1, 3 or 5 vs 1. The one person is a stranger, a child or a family member. All 18 cells come in a random order, with 2 attention checks.
- **Deeper:** 30 cards with exact quotas (8 push, 10 at 60% risk, 10 where the group ignored warnings) and 2 checks. The score unlocks after 12 cards.
- **Swipe direction:** randomised per player, and recorded so it can be measured.

**Privacy:**

- Profile questions are optional. Nicknames stay on the device and in share links, and are never stored server-side.
- Database tables have row-level security with no public policies. Only the server, using the service role key, can read or write.

## Set up (about 30 minutes)

1. **Supabase.** Create a project in the **London (eu-west-2)** region. In SQL Editor, run `supabase/migrations/0001_init.sql`. Copy the project URL and **service role** key (Settings → API).
2. **Vercel.** Import this GitHub repo and add the environment variables from `.env.example`:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `PARTICIPANT_SECRET`: run `openssl rand -hex 32`
   - `RESEARCH_KEY`: a long password for `/research`
   - `NEXT_PUBLIC_SITE_URL`: e.g. `https://swerve.app`
   - `NEXT_PUBLIC_PRIVACY_CONTACT`: the email for data requests
3. **Domain.** Add your domain in Vercel → Settings → Domains and follow the DNS instructions.
4. **Ads (later).** Once AdSense approves the site, set `NEXT_PUBLIC_ADSENSE_CLIENT` and `NEXT_PUBLIC_ADSENSE_SLOT`. Until then a house ad shows. Ads appear only on results screens, never beside a dilemma.

Note: Vercel's free Hobby plan is for non-commercial use. Move to Pro before turning on ads or selling licences.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
npm test                     # scenario design, scoring, share codes, validation
npm run typecheck && npm run build
```

## Before public launch

- [ ] Review `/privacy` with your data protection contact and fill in the contact email
- [ ] Check whether you need to pay the ICO data protection fee
- [ ] Get ethics approval if results will be published (data collected before approval may not be usable)
- [ ] Soft launch with one class: check completion, attention-check pass rate and share rate
- [ ] Add a "delete my data" request route that uses the participant id stored on the device
