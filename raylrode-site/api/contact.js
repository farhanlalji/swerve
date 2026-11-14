// Contact form handler for raylrode.com (Vercel serverless function).
// Sends each enquiry by email through Resend. Nothing is stored.
//
// Environment variables (set in Vercel, never in this repo):
//   RESEND_API_KEY  required: API key from resend.com
//   CONTACT_TO      required: the inbox that receives enquiries
//   CONTACT_FROM    optional: verified sender, e.g. "Raylrode <hello@raylrode.com>".
//                   Defaults to Resend's test sender, which can only deliver to the
//                   email address the Resend account was created with.

const INTERESTS = new Set([
  "Social project", "Education", "Intelligence systems / AI",
  "Data or research licensing", "Partnership or investment", "Something else"
]);
const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const MIN_FILL_MS = 3000; // faster than this is almost certainly a bot

const oneLine = (v, max) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const json = (status, body) => Response.json(body, { status });

export function validate(body, now = Date.now()) {
  const f = {
    name: oneLine(body.name, 100),
    email: oneLine(body.email, 200),
    org: oneLine(body.org, 150),
    interest: oneLine(body.interest, 60),
    message: String(body.message ?? "").replace(/\r\n/g, "\n").trim().slice(0, 5000),
    consent: body.consent === "yes" || body.consent === true
  };
  // Bots: a filled honeypot, or a form submitted too quickly. Pretend it worked.
  const t = Number(body.t);
  if (oneLine(body.website, 200) || (t && now - t < MIN_FILL_MS)) return { spam: true };

  if (!f.name) return { error: "Please add your name." };
  if (!EMAIL.test(f.email)) return { error: "Please check your email address." };
  if (!INTERESTS.has(f.interest)) return { error: "Please choose what you're interested in." };
  if (f.message.length < 10) return { error: "Please add a short message." };
  if (!f.consent) return { error: "Please tick the box so we can reply to you." };
  return { fields: f };
}

export function buildEmail(f) {
  return {
    subject: `Raylrode enquiry: ${f.interest} from ${f.name}`.slice(0, 200),
    text: [
      `Name: ${f.name}`,
      `Email: ${f.email}`,
      `Organisation: ${f.org || "(not given)"}`,
      `Interested in: ${f.interest}`,
      "",
      f.message,
      "",
      "Sent from the contact form on raylrode.com. Reply to this email to answer them directly."
    ].join("\n")
  };
}

export async function POST(request) {
  const type = request.headers.get("content-type") || "";
  const isJson = type.includes("application/json");
  let body;
  try {
    body = isJson ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return json(400, { error: "That didn't come through properly." });
  }

  // Without JavaScript the browser posts the form directly: answer with a redirect back to the page.
  const done = (status, payload) => isJson ? json(status, payload)
    : status === 200 ? Response.redirect(new URL("/?sent=1#contact", request.url), 303)
    : new Response(`${payload.error} Please go back and try again.`, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

  const v = validate(body ?? {});
  if (v.spam) return done(200, { ok: true });
  if (v.error) return done(400, { error: v.error });

  const key = process.env.RESEND_API_KEY, to = process.env.CONTACT_TO;
  if (!key || !to) {
    console.error("contact: RESEND_API_KEY or CONTACT_TO is not set");
    return done(500, { error: "The form isn't set up yet." });
  }

  const { subject, text } = buildEmail(v.fields);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || "Raylrode website <onboarding@resend.dev>",
      to: [to], reply_to: v.fields.email, subject, text
    })
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));

  if (!res.ok) {
    console.error("contact: Resend failed", res.status, await res.text());
    return done(502, { error: "We couldn't send that just now." });
  }
  return done(200, { ok: true });
}
