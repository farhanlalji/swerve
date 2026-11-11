import { ImageResponse } from "next/og";
import { decode } from "@/lib/share";
import { coreMetrics } from "@/lib/metrics";

export const runtime = "edge";

/** Share preview: 1200x630 card shown by WhatsApp, iMessage, LinkedIn and others for challenge links. */
export function GET(req: Request) {
  const c = decode(new URL(req.url).searchParams.get("c"));
  const who = c ? c.nick : null;
  const arch = c ? coreMetrics(c.bits).archetype : null;
  const ink = "#1B201D", amber = "#C98A06", ground = "#E9ECE7", steel = "#5F6E7C";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: ground, padding: 72, color: ink, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 6, color: steel }}>SWERVE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1 }}>{who ? `${who} challenged you` : "Would you pull the lever?"}</div>
          <div style={{ display: "flex", fontSize: 40, color: steel }}>{arch ? `They're ${arch}. Are you?` : "20 trolley dilemmas. One swipe each."}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", height: 10, width: 420, background: ink, borderRadius: 5 }} />
          <div style={{ display: "flex", fontSize: 36, color: amber, fontWeight: 700 }}>Swipe to decide</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
