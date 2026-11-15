import type { Metadata } from "next";
import Link from "next/link";
import { CONSENT_VERSION } from "@/lib/validate";
import DeleteMyData from "@/components/DeleteMyData";

export const metadata: Metadata = { title: "Privacy · Swerve" };

const CONTROLLER = "Farhan Lalji";
const CONTACT = process.env.NEXT_PUBLIC_PRIVACY_CONTACT || "[privacy contact email]";
const UPDATED = "15 November 2026";

export default function Privacy() {
  return (
    <main className="prose">
      <span className="eyebrow">Consent version {CONSENT_VERSION} · Updated {UPDATED}</span>
      <h1>Privacy notice</h1>
      <p>Swerve is a study of how people make moral decisions. It is part of Raylrode (raylrode.com). This notice explains what we collect, why, who we share it with and what you can do about it.</p>

      <h2>Who is responsible</h2>
      <p>The data controller is {CONTROLLER}, trading as Raylrode, in London, United Kingdom. For anything about your data, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Your choice on each dilemma, how long you took, and whether you swiped, tapped or used the keyboard.</li>
        <li>Any profile questions you choose to answer: age band, gender, nationality and country of residence. All are optional.</li>
        <li>Your approximate country and region, worked out from your connection when you start. We never store your IP address.</li>
        <li>Your device&apos;s time zone, language setting, and whether it has a touchscreen.</li>
      </ul>
      <p>We don&apos;t collect your name or email address. Your nickname stays on your device and in the challenge links you choose to share. We don&apos;t store it with your answers. Your answers are linked only to a random ID kept on your device.</p>
      <p>Your choices may reveal your moral or philosophical views. The law treats philosophical beliefs as special category data, so we only collect them with your explicit consent.</p>

      <h2>How we use it</h2>
      <ul>
        <li><b>Research.</b> To study how moral choices vary between people and places. Published results are aggregate statistics only.</li>
        <li><b>Anonymised datasets for partners.</b> We may share or license anonymised datasets to research, education and technology partners, including organisations that build or evaluate AI systems. This may be paid. Before any dataset leaves us, we remove the random ID and reduce location to country level, so no answer can be traced back to you. Partners must agree not to try to identify anyone.</li>
      </ul>
      <p>We never sell or share data that could identify you, and we don&apos;t use your answers for advertising.</p>

      <h2>Lawful basis</h2>
      <p>Your consent (UK GDPR Article 6(1)(a)), and your explicit consent for anything that reveals philosophical beliefs (Article 9(2)(a)). You give it by ticking the box before you start, and you can withdraw it at any time.</p>

      <h2>Who handles it for us</h2>
      <ul>
        <li><b>Supabase</b> stores the data in a database in London.</li>
        <li><b>Vercel</b> hosts the site. Our servers run in London. Vercel is a US company, and any access from outside the UK is covered by UK-approved safeguards.</li>
        <li>If ads are shown, they appear only on results screens, are not personalised, and don&apos;t receive your answers.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>We keep your answers for up to 5 years from when you take part, then delete them. Anonymised datasets already shared with partners can&apos;t be recalled, but they contain nothing that identifies you.</p>

      <h2>Your rights</h2>
      <p>You must be 18 or over to take part. You can stop at any time. You have the right to see the data we hold about you, have it corrected or deleted, and withdraw your consent. The quickest way to delete your answers is the button below, on the device you played on. Otherwise email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> with the date and rough time you played.</p>
      <p>If you&apos;re unhappy with how we handle your data, you can complain to the Information Commissioner&apos;s Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>.</p>

      <h2>Delete my data</h2>
      <DeleteMyData />

      <p><Link href="/">Back to Swerve</Link></p>
    </main>
  );
}
