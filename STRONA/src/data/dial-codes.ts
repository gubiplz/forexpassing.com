// Country dialling codes for the application form's phone field.
//
// The digit ranges live in src/lib/phone-rules.js — ONE table shared with the
// server-side grader (api/_lib/lead-quality.js), because the form now BLOCKS on
// these lengths and a private copy here would mean the form and the grader
// disagreeing about the same number. This file only adds what the browser
// needs on top: names, flags, the time-zone guess and the placeholder.
//
// `min`/`max` are the number of digits in the NATIONAL part, after the dialling
// code and after stripping spaces, dashes and a leading trunk zero. They are
// deliberately a range rather than one figure: most countries run several
// number lengths side by side (mobile against landline, old blocks against new).
//
// This catches a typo — eight digits typed for a nine-digit country, a number
// pasted with half of it missing — and nothing more. It does not know which
// prefixes a carrier actually issues. A real check means libphonenumber, which
// is around 150 KB of metadata and does not belong on a landing page whose whole
// point is loading fast on a phone.
//
// The flag is an emoji regional-indicator pair. Windows ships no flag glyphs and
// renders it as the two letters instead, which is why the country name is always
// next to it rather than instead of it.

import {
  GENERIC, PHONE_DIGITS, boundsFor, nationalDigits, normalizeTelegram, splitDial, TELEGRAM_RE,
} from '../lib/phone-rules.js'

export { boundsFor, nationalDigits, normalizeTelegram, splitDial, TELEGRAM_RE }

export type DialCode = {
  /** ISO 3166-1 alpha-2, also the key used to remember the choice. */
  iso: string
  name: string
  /** With the plus. */
  dial: string
  flag: string
  min: number
  max: number
}

const BASE: Omit<DialCode, 'min' | 'max'>[] = [
  { iso: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { iso: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿' },
  { iso: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { iso: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { iso: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { iso: 'BY', name: 'Belarus', dial: '+375', flag: '🇧🇾' },
  { iso: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { iso: 'BA', name: 'Bosnia and Herzegovina', dial: '+387', flag: '🇧🇦' },
  { iso: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { iso: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬' },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { iso: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { iso: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { iso: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { iso: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷' },
  { iso: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
  { iso: 'CZ', name: 'Czechia', dial: '+420', flag: '🇨🇿' },
  { iso: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { iso: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { iso: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪' },
  { iso: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'GE', name: 'Georgia', dial: '+995', flag: '🇬🇪' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { iso: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { iso: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰' },
  { iso: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺' },
  { iso: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸' },
  { iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { iso: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { iso: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { iso: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { iso: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { iso: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { iso: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴' },
  { iso: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿' },
  { iso: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { iso: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { iso: 'LV', name: 'Latvia', dial: '+371', flag: '🇱🇻' },
  { iso: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧' },
  { iso: 'LT', name: 'Lithuania', dial: '+370', flag: '🇱🇹' },
  { iso: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { iso: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { iso: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹' },
  { iso: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { iso: 'MD', name: 'Moldova', dial: '+373', flag: '🇲🇩' },
  { iso: 'ME', name: 'Montenegro', dial: '+382', flag: '🇲🇪' },
  { iso: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦' },
  { iso: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { iso: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { iso: 'MK', name: 'North Macedonia', dial: '+389', flag: '🇲🇰' },
  { iso: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { iso: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { iso: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { iso: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪' },
  { iso: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { iso: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { iso: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { iso: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { iso: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴' },
  { iso: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { iso: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸' },
  { iso: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { iso: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰' },
  { iso: 'SI', name: 'Slovenia', dial: '+386', flag: '🇸🇮' },
  { iso: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { iso: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { iso: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { iso: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { iso: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { iso: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { iso: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳' },
  { iso: 'TR', name: 'Türkiye', dial: '+90', flag: '🇹🇷' },
  { iso: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { iso: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
]

export const DIAL_CODES: DialCode[] = BASE.map((c) => {
  const [min, max] = PHONE_DIGITS[c.iso] ?? GENERIC
  return { ...c, min, max }
})

export function findDial(iso: string): DialCode | undefined {
  return DIAL_CODES.find((c) => c.iso === iso)
}

/* -------------------------------------------------------------------------- */

/**
 * IANA time zone to country, for the zones that map onto a country in the list
 * above. Only those: a zone resolving to a country we do not carry a dialling
 * code for is the same as not recognising it at all.
 *
 * Countries with several zones list all of them, because the browser reports
 * whichever one the device is set to — an American in Denver never sends
 * "America/New_York".
 */
const ZONE_TO_ISO: Record<string, string> = {
  // Europe
  'Europe/Tirane': 'AL', 'Europe/Vienna': 'AT', 'Europe/Minsk': 'BY', 'Europe/Brussels': 'BE',
  'Europe/Sarajevo': 'BA', 'Europe/Sofia': 'BG', 'Europe/Zagreb': 'HR', 'Europe/Nicosia': 'CY',
  'Asia/Nicosia': 'CY', 'Europe/Prague': 'CZ', 'Europe/Copenhagen': 'DK', 'Europe/Tallinn': 'EE',
  'Europe/Helsinki': 'FI', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE',
  'Europe/Athens': 'GR', 'Europe/Budapest': 'HU', 'Atlantic/Reykjavik': 'IS', 'Europe/Dublin': 'IE',
  'Europe/Rome': 'IT', 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT', 'Europe/Luxembourg': 'LU',
  'Europe/Malta': 'MT', 'Europe/Chisinau': 'MD', 'Europe/Podgorica': 'ME', 'Europe/Amsterdam': 'NL',
  'Europe/Skopje': 'MK', 'Europe/Oslo': 'NO', 'Europe/Warsaw': 'PL', 'Europe/Lisbon': 'PT',
  'Atlantic/Azores': 'PT', 'Atlantic/Madeira': 'PT', 'Europe/Bucharest': 'RO',
  'Europe/Moscow': 'RU', 'Europe/Kaliningrad': 'RU', 'Europe/Samara': 'RU',
  'Asia/Yekaterinburg': 'RU', 'Asia/Novosibirsk': 'RU', 'Asia/Krasnoyarsk': 'RU',
  'Asia/Irkutsk': 'RU', 'Asia/Yakutsk': 'RU', 'Asia/Vladivostok': 'RU', 'Asia/Magadan': 'RU',
  'Asia/Kamchatka': 'RU', 'Europe/Belgrade': 'RS', 'Europe/Bratislava': 'SK',
  'Europe/Ljubljana': 'SI', 'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES',
  'Europe/Stockholm': 'SE', 'Europe/Zurich': 'CH', 'Europe/Istanbul': 'TR', 'Asia/Istanbul': 'TR',
  'Europe/Kyiv': 'UA', 'Europe/Kiev': 'UA', 'Europe/Simferopol': 'UA',
  'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Guernsey': 'GB', 'Europe/Isle_of_Man': 'GB',
  'Europe/Jersey': 'GB',

  // Americas
  'America/Argentina/Buenos_Aires': 'AR', 'America/Argentina/Cordoba': 'AR',
  'America/Argentina/Mendoza': 'AR', 'America/Argentina/Salta': 'AR',
  'America/Argentina/Tucuman': 'AR', 'America/Buenos_Aires': 'AR',
  'America/Sao_Paulo': 'BR', 'America/Bahia': 'BR', 'America/Fortaleza': 'BR',
  'America/Recife': 'BR', 'America/Manaus': 'BR', 'America/Belem': 'BR', 'America/Cuiaba': 'BR',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/Montreal': 'CA',
  'America/St_Johns': 'CA', 'America/Regina': 'CA',
  'America/Santiago': 'CL', 'Pacific/Easter': 'CL', 'America/Bogota': 'CO',
  'America/Mexico_City': 'MX', 'America/Monterrey': 'MX', 'America/Tijuana': 'MX',
  'America/Cancun': 'MX', 'America/Merida': 'MX', 'America/Chihuahua': 'MX',
  'America/Lima': 'PE',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
  'America/Detroit': 'US', 'America/Indiana/Indianapolis': 'US', 'America/Kentucky/Louisville': 'US',
  'America/Boise': 'US', 'Pacific/Honolulu': 'US',

  // Asia and the Middle East
  'Asia/Dubai': 'AE', 'Asia/Bahrain': 'BH', 'Asia/Shanghai': 'CN', 'Asia/Urumqi': 'CN',
  'Asia/Chongqing': 'CN', 'Asia/Tbilisi': 'GE', 'Asia/Hong_Kong': 'HK',
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID', 'Asia/Jerusalem': 'IL', 'Asia/Tel_Aviv': 'IL', 'Asia/Tokyo': 'JP',
  'Asia/Amman': 'JO', 'Asia/Almaty': 'KZ', 'Asia/Aqtobe': 'KZ', 'Asia/Atyrau': 'KZ',
  'Asia/Kuwait': 'KW', 'Asia/Beirut': 'LB', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Kuching': 'MY',
  'Asia/Muscat': 'OM', 'Asia/Karachi': 'PK', 'Asia/Manila': 'PH', 'Asia/Qatar': 'QA',
  'Asia/Riyadh': 'SA', 'Asia/Singapore': 'SG', 'Asia/Seoul': 'KR', 'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN',

  // Africa and Oceania
  'Africa/Algiers': 'DZ', 'Africa/Cairo': 'EG', 'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE',
  'Africa/Casablanca': 'MA', 'Africa/Lagos': 'NG', 'Africa/Johannesburg': 'ZA',
  'Africa/Tunis': 'TN',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU', 'Pacific/Auckland': 'NZ',
}

/**
 * Where the field lands when the device tells us nothing. The offer is written
 * in English and sold mainly into the United States, so a visitor we cannot
 * place is far more likely to be dialling +1 than anything else. It is only a
 * starting point: the two reads below both outrank it.
 */
export const FALLBACK_ISO = 'US'

/**
 * The visitor's likely country, as an ISO code from the table above, falling
 * back to FALLBACK_ISO when neither signal recognises them.
 *
 * Read entirely on the device — no request leaves the page. The worker in front
 * of this site keeps the visitor's country out of the injected state on purpose
 * (see `injectState` in workers/edge.ts), so asking the server is not an option
 * and would not be one worth taking.
 *
 * The time zone is asked first because it reflects where the device thinks it
 * is, which is the question. The locale region is only a fallback: plenty of
 * people run an English system in a country that does not speak it, so it says
 * more about the user's reading habits than their phone number.
 *
 * This only preselects the chip. A traveller or anyone on a VPN gets the wrong
 * flag and changes it with one tap, and nothing downstream assumes it is right.
 * Typing the number with its own +code outranks all of it — see `splitDial`.
 */
export function detectIso(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const byZone = zone ? ZONE_TO_ISO[zone] : undefined
    if (byZone && findDial(byZone)) return byZone
  } catch {
    // Intl unavailable or the zone is unset. Fall through to the locale.
  }
  try {
    for (const tag of [navigator.language, ...(navigator.languages ?? [])]) {
      const region = tag?.split('-')[1]?.toUpperCase()
      if (region && findDial(region)) return region
    }
  } catch {
    // No locale either. The fallback below is as good a guess as there is.
  }
  return FALLBACK_ISO
}

/** The flag artwork for a country, served from our own origin. */
export function flagSrc(iso: string): string {
  return `/flags/${iso.toLowerCase()}.svg`
}

/**
 * A sample number of the right length for the chosen country, grouped in
 * threes: "123 456 789". Ascending digits read as an example at a glance,
 * where a run of the same digit reads as a broken field.
 */
export function samplePlaceholder(digits: number): string {
  const n = '123456789012345'.slice(0, digits)
  const groups: string[] = []
  for (let i = 0; i < n.length; i += 3) groups.push(n.slice(i, i + 3))
  // A trailing single digit looks like a typo; fold it into the group before.
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    groups[groups.length - 2] += groups.pop()
  }
  return groups.join(' ')
}
