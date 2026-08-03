// Country dialling codes for the application form's phone field.
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

export const DIAL_CODES: DialCode[] = [
  { iso: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱', min: 8, max: 9 },
  { iso: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿', min: 8, max: 9 },
  { iso: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷', min: 10, max: 11 },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', min: 9, max: 9 },
  { iso: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹', min: 7, max: 13 },
  { iso: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭', min: 8, max: 8 },
  { iso: 'BY', name: 'Belarus', dial: '+375', flag: '🇧🇾', min: 9, max: 9 },
  { iso: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪', min: 8, max: 9 },
  { iso: 'BA', name: 'Bosnia and Herzegovina', dial: '+387', flag: '🇧🇦', min: 8, max: 8 },
  { iso: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷', min: 10, max: 11 },
  { iso: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬', min: 8, max: 9 },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', min: 10, max: 10 },
  { iso: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱', min: 9, max: 9 },
  { iso: 'CN', name: 'China', dial: '+86', flag: '🇨🇳', min: 11, max: 11 },
  { iso: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴', min: 10, max: 10 },
  { iso: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷', min: 8, max: 9 },
  { iso: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾', min: 8, max: 8 },
  { iso: 'CZ', name: 'Czechia', dial: '+420', flag: '🇨🇿', min: 9, max: 9 },
  { iso: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰', min: 8, max: 8 },
  { iso: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬', min: 9, max: 10 },
  { iso: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪', min: 7, max: 8 },
  { iso: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮', min: 6, max: 12 },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', min: 9, max: 9 },
  { iso: 'GE', name: 'Georgia', dial: '+995', flag: '🇬🇪', min: 9, max: 9 },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', min: 6, max: 11 },
  { iso: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', min: 9, max: 9 },
  { iso: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷', min: 10, max: 10 },
  { iso: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰', min: 8, max: 8 },
  { iso: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺', min: 8, max: 9 },
  { iso: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸', min: 7, max: 7 },
  { iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', min: 10, max: 10 },
  { iso: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩', min: 9, max: 12 },
  { iso: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪', min: 7, max: 9 },
  { iso: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱', min: 8, max: 9 },
  { iso: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹', min: 6, max: 11 },
  { iso: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵', min: 9, max: 10 },
  { iso: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴', min: 8, max: 9 },
  { iso: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿', min: 10, max: 10 },
  { iso: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪', min: 9, max: 9 },
  { iso: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼', min: 8, max: 8 },
  { iso: 'LV', name: 'Latvia', dial: '+371', flag: '🇱🇻', min: 8, max: 8 },
  { iso: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧', min: 7, max: 8 },
  { iso: 'LT', name: 'Lithuania', dial: '+370', flag: '🇱🇹', min: 8, max: 8 },
  { iso: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺', min: 8, max: 9 },
  { iso: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾', min: 9, max: 10 },
  { iso: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹', min: 8, max: 8 },
  { iso: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽', min: 10, max: 10 },
  { iso: 'MD', name: 'Moldova', dial: '+373', flag: '🇲🇩', min: 8, max: 8 },
  { iso: 'ME', name: 'Montenegro', dial: '+382', flag: '🇲🇪', min: 8, max: 8 },
  { iso: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦', min: 9, max: 9 },
  { iso: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱', min: 9, max: 9 },
  { iso: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿', min: 8, max: 10 },
  { iso: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', min: 10, max: 10 },
  { iso: 'MK', name: 'North Macedonia', dial: '+389', flag: '🇲🇰', min: 8, max: 8 },
  { iso: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴', min: 8, max: 8 },
  { iso: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲', min: 8, max: 8 },
  { iso: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰', min: 10, max: 10 },
  { iso: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪', min: 9, max: 9 },
  { iso: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭', min: 10, max: 10 },
  { iso: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱', min: 9, max: 9 },
  { iso: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹', min: 9, max: 9 },
  { iso: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦', min: 8, max: 8 },
  { iso: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴', min: 9, max: 9 },
  { iso: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺', min: 10, max: 10 },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦', min: 9, max: 9 },
  { iso: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸', min: 8, max: 9 },
  { iso: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬', min: 8, max: 8 },
  { iso: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰', min: 9, max: 9 },
  { iso: 'SI', name: 'Slovenia', dial: '+386', flag: '🇸🇮', min: 8, max: 8 },
  { iso: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦', min: 9, max: 9 },
  { iso: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷', min: 9, max: 10 },
  { iso: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸', min: 9, max: 9 },
  { iso: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪', min: 7, max: 13 },
  { iso: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭', min: 9, max: 9 },
  { iso: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭', min: 9, max: 9 },
  { iso: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳', min: 8, max: 8 },
  { iso: 'TR', name: 'Türkiye', dial: '+90', flag: '🇹🇷', min: 10, max: 10 },
  { iso: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦', min: 9, max: 9 },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪', min: 8, max: 9 },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', min: 9, max: 10 },
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', min: 10, max: 10 },
  { iso: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳', min: 9, max: 10 },
]

/** Fallback when the browser gives us nothing to go on. */
export const DEFAULT_ISO = 'PL'

export function findDial(iso: string): DialCode {
  return DIAL_CODES.find((c) => c.iso === iso) ?? DIAL_CODES.find((c) => c.iso === DEFAULT_ISO)!
}

/**
 * Best guess at the visitor's country, from the browser's own locale.
 *
 * Deliberately NOT from the edge: the worker in front of this site keeps the
 * visitor's country out of the injected state on purpose, and adding it back
 * for a form default would leak how the classifier sees people.
 */
export function guessIso(): string {
  try {
    const langs = [navigator.language, ...(navigator.languages ?? [])]
    for (const l of langs) {
      const region = l?.split('-')[1]?.toUpperCase()
      if (region && DIAL_CODES.some((c) => c.iso === region)) return region
    }
  } catch {
    // Locale unavailable: the default below is as good a guess as any.
  }
  return DEFAULT_ISO
}

/** Digits only, minus a trunk zero people habitually type in front. */
export function nationalDigits(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '')
}
