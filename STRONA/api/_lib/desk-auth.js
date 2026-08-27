// Wstęp do panelu leadów. Bez bazy sesji — cała sesja jest w ciasteczku i
// broni jej podpis HMAC.
//
// Powód takiego wyboru: panel to jedna funkcja bezstanowa. Tabela sesji
// oznaczałaby zapytanie do bazy przy każdym kliknięciu i kolejny stan do
// posprzątania, a jedyne, czego naprawdę potrzebujemy, to odpowiedź na pytanie
// „czyje to kliknięcie" — do wpisu w historii leada.
//
// Imię jest ważniejsze niż hasło. Hasło pilnuje wejścia, ale to imię trafia do
// `lead_events.actor`, więc bez niego audyt nie ma o kim mówić i „przecież
// dzwoniłem" znów jest nie do sprawdzenia.
//
// Zmienne środowiskowe:
//   DESK_USERS         — `bartek:haslo1,ania:haslo2`. Pusta = panel zamknięty.
//   DESK_COOKIE_SECRET — klucz podpisu. Zmiana wylogowuje wszystkich.

import { createHmac, randomBytes, timingSafeEqual as nodeSafeEqual } from 'node:crypto';

const COOKIE = 'desk';
const DNI = 7;
const MAX_AGE = DNI * 24 * 3600;

/** Porównanie w stałym czasie także dla różnych długości — Node rzuca przy różnych. */
function rowneSekretnie(a, b) {
  const x = Buffer.from(String(a), 'utf8');
  const y = Buffer.from(String(b), 'utf8');
  if (x.length !== y.length) {
    // Jeden bajt roboty, żeby czas odpowiedzi nie zdradzał, że długość się nie zgadza.
    nodeSafeEqual(x, x);
    return false;
  }
  return nodeSafeEqual(x, y);
}

const podpisz = (dane, sekret) =>
  createHmac('sha256', sekret).update(dane).digest('base64url');

/**
 * Lista kont. Hasło może zawierać dwukropek — dzielimy tylko na pierwszym, bo
 * inaczej `ania:ha:slo` cicho stałaby się kontem z hasłem „ha".
 */
function konta() {
  const mapa = new Map();
  for (const wpis of String(process.env.DESK_USERS ?? '').split(',')) {
    const surowy = wpis.trim();
    if (!surowy) continue;
    const i = surowy.indexOf(':');
    if (i <= 0) continue;
    const imie = surowy.slice(0, i).trim();
    const haslo = surowy.slice(i + 1);
    if (imie && haslo) mapa.set(imie.toLowerCase(), { imie, haslo });
  }
  return mapa;
}

export const panelWlaczony = () => konta().size > 0 && Boolean(process.env.DESK_COOKIE_SECRET);

/**
 * Sprawdzenie loginu. Zwraca nazwę do zapisu w historii albo null.
 *
 * Nieistniejące konto też przechodzi przez porównanie hasła: inaczej zła nazwa
 * wracałaby zauważalnie szybciej niż złe hasło i lista kont dałaby się zgadnąć.
 */
export function sprawdzLogin(imie, haslo) {
  const konto = konta().get(String(imie ?? '').trim().toLowerCase());
  const wzorzec = konto?.haslo ?? randomBytes(24).toString('hex');
  const ok = rowneSekretnie(String(haslo ?? ''), wzorzec);
  return ok && konto ? konto.imie : null;
}

const ciasteczka = (req) =>
  Object.fromEntries(
    String(req.headers.cookie ?? '')
      .split(';')
      .map((c) => {
        const i = c.indexOf('=');
        return i < 0 ? null : [c.slice(0, i).trim(), c.slice(i + 1).trim()];
      })
      .filter(Boolean)
  );

/**
 * Kto klika. Null znaczy „brak sesji albo sesja wygasła" — wołający pokazuje
 * wtedy ekran logowania i nie musi rozróżniać tych przypadków.
 *
 * Data ważności jest częścią podpisanego ładunku, więc przesunięcie jej w
 * ciasteczku unieważnia podpis. Serwer nie musi niczego pamiętać.
 */
export function sesja(req) {
  const sekret = process.env.DESK_COOKIE_SECRET;
  if (!sekret) return null;
  const surowe = ciasteczka(req)[COOKIE];
  if (!surowe) return null;

  const kropka = surowe.lastIndexOf('.');
  if (kropka < 0) return null;
  const dane = surowe.slice(0, kropka);
  if (!rowneSekretnie(surowe.slice(kropka + 1), podpisz(dane, sekret))) return null;

  const [imie64, doKiedy] = dane.split('.');
  if (!imie64 || !(Number(doKiedy) > Date.now())) return null;

  const imie = Buffer.from(imie64, 'base64url').toString('utf8');
  // Konto usunięte z DESK_USERS traci dostęp od razu, a nie po tygodniu.
  return konta().has(imie.toLowerCase()) ? { imie, token: csrf(dane, sekret) } : null;
}

/** Token do formularzy. Wyprowadzony z sesji, więc nie ma czego przechowywać. */
const csrf = (dane, sekret) => podpisz(`csrf:${dane}`, sekret);

export function ustawSesje(res, imie) {
  const sekret = process.env.DESK_COOKIE_SECRET;
  const dane = `${Buffer.from(imie, 'utf8').toString('base64url')}.${Date.now() + MAX_AGE * 1000}`;
  const wartosc = `${dane}.${podpisz(dane, sekret)}`;
  // SameSite=Lax, nie Strict: operator wchodzi do panelu klikając link w karcie
  // na Telegramie, a przy Strict takie wejście przyszłoby bez ciasteczka i
  // pokazałoby ekran logowania komuś, kto jest zalogowany.
  res.setHeader(
    'set-cookie',
    `${COOKIE}=${wartosc}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`
  );
}

export function wyczyscSesje(res) {
  res.setHeader('set-cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}

/** Czy POST przyszedł z naszego formularza. Bez tego cudza strona klika za operatora. */
export const tokenOk = (ses, podany) => Boolean(ses) && rowneSekretnie(String(podany ?? ''), ses.token);
