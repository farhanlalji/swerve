"use client";

import { useEffect, useRef } from "react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

declare global { interface Window { adsbygoogle?: unknown[] } }

/**
 * One banner, shown only on result screens (never beside a dilemma, to avoid priming choices or skewing decision times).
 * With NEXT_PUBLIC_ADSENSE_CLIENT/SLOT set it loads a Google AdSense unit (non-personalised by default);
 * otherwise it shows a house ad for the classroom offer.
 */
export default function AdSlot() {
  const pushed = useRef(false);
  useEffect(() => {
    if (!CLIENT || !SLOT || pushed.current) return;
    pushed.current = true;
    if (!document.querySelector("script[data-adsense]")) {
      const s = document.createElement("script");
      s.async = true; s.dataset.adsense = "1"; s.crossOrigin = "anonymous";
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
      document.head.appendChild(s);
    }
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked by an ad blocker */ }
  }, []);

  if (CLIENT && SLOT) {
    return (
      <aside className="ad" aria-label="Advertisement" style={{ display: "block" }}>
        <ins className="adsbygoogle" style={{ display: "block", minHeight: 50 }} data-ad-client={CLIENT} data-ad-slot={SLOT}
          data-ad-format="horizontal" data-full-width-responsive="true" data-npa="1" />
      </aside>
    );
  }
  return (
    <aside className="ad" aria-label="Advertisement">
      <span className="tag">Ad</span>
      <span className="copy"><b>Run Swerve with your class</b>Live results for seminars and workshops</span>
      <span className="sz">320×50</span>
    </aside>
  );
}
