# raylrode.com

Landing page for Raylrode: plain HTML with self-hosted fonts and no build step.
`api/contact.js` is a Vercel serverless function that emails contact form
enquiries through Resend (resend.com). Nothing is stored.

## Deploy as its own Vercel project from this repo

- Root Directory: `raylrode-site`
- Framework Preset: Other (no build command)
- Environment variables:
  - `RESEND_API_KEY`: API key from Resend
  - `CONTACT_TO`: the inbox that receives enquiries
  - `CONTACT_FROM` (optional): a sender on a domain verified in Resend, e.g.
    `Raylrode <hello@raylrode.com>`. Without it, Resend's test sender is used,
    which only delivers to the email address the Resend account was created with.
- Domains: `raylrode.com`, `www.raylrode.com`

Before launch, fill in the highlighted `[...]` placeholders in the About section.
