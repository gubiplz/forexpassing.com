# @forexpassing/site

Landing page (MOCKUP) pod ebooka Forex Passing. Subdomena docelowa: `forexpassing.com`.

## Uruchomienie

Z roota monorepo:

```bash
npm install                       # instaluje workspace (apps/charts + apps/ebook)
npm run dev -w apps/ebook         # dev server na http://localhost:3005
npm run build -w apps/ebook       # produkcyjny build → apps/ebook/dist/
npm run preview -w apps/ebook     # preview build na :3005
```

Stack: React 19 + Vite 8 + TypeScript 6 (strict). Bez backendu, bez bibliotek UI — inline styles, zgodnie z konwencją Forex Passing.

## Gdzie podmienić placeholdery

- **Cena i checkout link:** `src/constants.ts` → `PRICE_LABEL` i `CHECKOUT_HREF` (obecnie `99 zł` i `#kup`).
- **Headline H1 (3 wersje):** `src/sections/Hero.tsx` — komentarz na górze pliku.
- **Zdjęcie autora + bio:** `src/sections/Author.tsx` (`[FOTO AUTORA]`, `[BIO AUTORA]`, credentials `[X lat]` / `[Y analiz]` / `[Z setupów]`).
- **Testimoniale (6 slotów):** `src/sections/Testimonials.tsx` — każdy slot ma placeholder zdjęcia, cytatu i `@nickname`. Wizualnie oznaczone dashed border + tag "Placeholder".
- **Liczba czytelników w hero ("Czytany przez [X traderów]"):** `src/sections/Hero.tsx` — sekcja AvatarStack.
- **OG image:** `public/og-image.png` (do dodania, ścieżka w `index.html`).
- **Favicon:** `public/favicon.svg` (już jest, generyczny logo-mark MM).

## Struktura

```
src/
├── App.tsx              # kompozycja sekcji
├── main.tsx             # bootstrap React
├── index.css            # globalne base styles (zmienne CSS, reset)
├── constants.ts         # PRICE_LABEL, CHECKOUT_HREF, COLORS, MAX_W
├── hooks.ts             # useScrolled, useMediaQuery
├── components/          # Container, CTAButton, Logo, SectionHeading
└── sections/            # Header, Hero, Problem, Value, Author,
                           Testimonials, NotThis, FAQ, FinalCTA, Footer
```

## Znane TODO

- Podpięcie realnego checkoutu (Stripe / Tpay / Przelewy24) — obecnie wszystkie CTA wskazują `#kup` (anchor do FinalCTA).
- OG image (`public/og-image.png`) do wygenerowania.
- Polityka prywatności + Regulamin — pełne podstrony / linki (obecnie puste `href="#"` w footerze).
- Realne zdjęcia autora i testimoniali — wszystkie sloty wizualnie oznaczone jako placeholdery.
