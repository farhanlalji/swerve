import type { Metadata } from "next";
import Game from "@/components/Game";
import { decode } from "@/lib/share";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const c = decode(code);
  const title = c ? `${c.nick} challenged you on Swerve` : "Swerve";
  return {
    title,
    description: "Play the same 20 trolley dilemmas and see where you agree.",
    openGraph: { title, description: "Play the same 20 dilemmas and see where you agree.", images: [`/api/og?c=${encodeURIComponent(code)}`] },
    robots: { index: false }
  };
}

export default async function Challenge({ params }: Props) {
  const { code } = await params;
  return <Game challengeCode={code} />;
}
