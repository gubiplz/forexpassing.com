# tg-graphics

Plakaty track record na Telegram: czyta żywy panel z `forexpassing.com/past-performance`,
przerysowuje kwadratowe grafiki i **edytuje** cztery istniejące posty na
[@fx_passingtrackrecord](https://t.me/fx_passingtrackrecord).

Edycja, a nie nowa publikacja — post zachowuje wtedy swoje ID, a więc wyświetlenia
i reakcje. Zbierały się tygodniami i nie ma ich jak przenieść.

## Przebieg

```
node refresh.js          # scrape → shoot → render → edit  (~20 s)
node refresh.js --dry    # wszystko poza zapisem do Telegrama
```

| krok | plik | co robi |
|---|---|---|
| scrape | `scrape.js` | czyta liczby z panelu → `track-data.json` |
| shoot | `shoot2.js` | zrzut widgetu per profil → `shot2-*.png` |
| render | `render2.js` | plakat 1:1 z `template2.html` → `poster2-*.png` |
| edit | `edit.js` | `editMessageMedia` na postach 7–10 |

Do Telegrama pisze wyłącznie ostatni krok, więc wywrotka po drodze zostawia kanał
nietknięty.

`send.js` to narzędzie do **pierwszej** publikacji — nie używać do odświeżania.

## Podpisy

`captions.js` składa je z `track-data.json`. Nie wpisuj liczb ręcznie: plakat i tekst
pochodzą wtedy z różnych dni, a czytelnik widzi jedno i drugie naraz.

Podpisy niosą też zdania o liczbach — „every single month in the green", „drawdown
still under 4%", „an account that has more than doubled". Tych nie da się wygenerować,
a każde może przestać być prawdą po kolejnej dołożonej sesji. Pilnują ich asercje:
przy nieprawdzie przebieg pada i kanał zostaje nietknięty. Gdy któraś zacznie
wywalać automat, **popraw zdanie w szablonie**, nie asercję.

Limit podpisu w Telegramie to 1024 znaki; najdłuższy (high risk) ma ~820.

## Zmienne

| nazwa | gdzie | po co |
|---|---|---|
| `TG_TOKEN` | sekret repo `TELEGRAM_BOT_TOKEN` | bot musi być adminem kanału |
| `TG_CHAT` | opcjonalna | domyślnie `@fx_passingtrackrecord` |

## Harmonogram

Cron Vercela (`20 6 * * 1` w `STRONA/vercel.json`) → `STRONA/api/track-refresh.js`
→ `workflow_dispatch` → `.github/workflows/track-record-refresh.yml`.

Okrężnie, bo harmonogram GitHub Actions na tym repo nie działa (patrz nagłówek
`telegram-spots.yml`), a cron Vercela i `workflow_dispatch` działają oba.

Ręcznie: zakładka **Actions → Track record refresh → Run workflow**.

## Mapowanie postów

`MESSAGES` w `edit.js`: `low → 7`, `balanced → 8`, `scaling → 9`, `high → 10`.
Kolejność z publikacji 2026-08-20. Nie zgadywać — złe ID podmienia treść nie tego
posta, co trzeba.
