import type { Metadata } from "next";
import Link from "next/link";
import { CONSENT_VERSION } from "@/lib/validate";

export const metadata: Metadata = { title: "Privacy · Swerve" };

// DRAFT: review with your institution's data protection officer before launch, and fill in the contact details.
const CONTACT = process.env.NEXT_PUBLIC_PRIVACY_CONTACT || "[privacy contact email]";

export default function Privacy() {
  return (
    <main className="prose">
      <span className="eyebrow">Consent version {CONSENT_VERSION}</span>
      <h1>Privacy notice</h1>
      <p>Swerve is a research study about how people make moral decisions. This notice explains what we collect and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Your choice on each dilemma, how long you took, and whether you swiped, tapped or used the keyboard.</li>
        <li>Any profile questions you choose to answer: age band, gender, nationality and country of residence. All are optional.</li>
        <li>Your approximate country and region, worked out from your connection when you start. We never store your IP address.</li>
        <li>Your device&apos;s time zone, language setting, and whether it has a touchscreen.</li>
      </ul>
      <p>Your nickname stays on your device and in the challenge links you choose to share. We don&apos;t store it with your answers.</p>
      <h2>Why</h2>
      <p>To study how moral choices vary between people and places. We use your consent as the lawful basis. Results are published only as aggregate statistics.</p>
      <h2>Where it is kept</h2>
      <p>Answers are stored in a database hosted in the UK/EU and are linked only to a random ID, not to your name or email.</p>
      <h2>Your rights</h2>
      <p>You must be 18 or over to take part. You can stop at any time. To ask for your data to be deleted, contact {CONTACT}. Because your answers are linked only to a random ID on your device, include the date and approximate time you played.</p>
      <h2>Advertising</h2>
      <p>If ads are shown, they appear only on results screens and are not personalised.</p>
      <p><Link href="/">Back to Swerve</Link></p>
    </main>
  );
}
