// ISO 3166-1 alpha-2 codes for sovereign states plus a few widely used territories. Names come from Intl at runtime.
export const ISO = "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW".split(" ");
export const ISO_SET = new Set([...ISO, "PNTS"]);

export function regionName(code: string): string {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch { return code; }
}

export function countryList() {
  return ISO.map(c => ({ code: c, name: regionName(c) })).sort((a, b) => a.name.localeCompare(b.name));
}

export const PREFER_NOT = "Prefer not to say";
export const AGES = ["18–24", "25–34", "35–44", "45–54", "55–64", "65+"];
export const GENDERS = ["Woman", "Man", "Non-binary", "Another identity"];
