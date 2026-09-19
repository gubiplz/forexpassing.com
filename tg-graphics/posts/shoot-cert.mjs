/**
 * Zrzuca certyfikat wyplaty prosto ze strony, ktora widzi klient.
 *
 *   node posts/shoot-cert.mjs <cert_token> <nazwa-pliku>
 *
 * Ta sama zasada co w certshot.py po stronie panelu: nie rysujemy certyfikatu
 * drugi raz, tylko fotografujemy dokument, ktory juz istnieje. Dzieki temu
 * grafika na kanale i dokument pod linkiem nie moga sie rozjechac.
 */
import { chromium } from 'playwright';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TU = dirname(fileURLToPath(import.meta.url));
const [token, nazwa] = process.argv.slice(2);
if (!token || !nazwa) throw new Error('uzycie: shoot-cert.mjs <cert_token> <plik.png>');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 660, height: 660 }, deviceScaleFactor: 2 });
await p.goto(`https://protradersfunding.com/payout/${token}?bare=1`, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(600);

// Sam dokument, bez marginesu strony — na plakacie i tak dostaje wlasny cien.
const karta = p.locator('.cert-card, .cert, article').first();
const cel = (await karta.count()) ? karta : p.locator('body');
await cel.screenshot({ path: resolve(TU, 'assets', nazwa) });

console.log('zapisano', nazwa);
await b.close();
