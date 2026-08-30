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
| `TG_TOKEN` | sekret repo `TELEGRAM_TRACK_BOT_TOKEN` | bot musi być **adminem** kanału |
| `TG_CHAT` | opcjonalna | domyślnie `@fx_passingtrackrecord` |

To celowo **inny** sekret niż `TELEGRAM_BOT_TOKEN` używany przez `telegram-spots.yml`:
tamten bot jest adminem `@fx_passing`, ale nie kanału track record.

Uwaga na pułapkę: `getChat` na publicznym kanale udaje się każdemu botowi, także
takiemu bez uprawnień. Status sprawdzaj przez `getChatMember`.

## Harmonogram

Odświeżenie odpala **udany deploy produkcyjny**: integracja Vercel↔GitHub wysyła
`deployment_status`, a `.github/workflows/track-record-refresh.yml` łapie z niego
tylko `Production` + `success`.

Nie tydzień, bo tydzień był tu złą jednostką. Seria rośnie w `npm run build`
(pierwszy krok to `STRONA/bin/roll-track-record.mjs`), więc **dane na stronie
zmieniają się wyłącznie przy deployu**. Cotygodniowy cron trafiałby w tygodnie
bez deploya i przesypiał deploye w środku tygodnia — posty rozjeżdżałyby się ze
stroną nawet na sześć dni. Teraz plakat nie ma jak się od niej oderwać.

Efekt uboczny: kilka deployów tego samego dnia da kilka przebiegów, ale
`roll-track-record` dokłada sesje „do dziś", więc liczby wychodzą identyczne,
Telegram odpowiada `message is not modified` i `edit.js` liczy je jako pominięte.
Kanał się nie rusza, a repo jest publiczne, więc minuty Actions są darmowe.

Żeby w cichym tygodniu deploy w ogóle się zdarzył, cotygodniowy scenariusz
w Make uderza POST-em w Deploy Hook Vercela. Build roluje serię
(`STRONA/bin/roll-track-record.mjs`), a jego `deployment_status` wraca tutaj —
więc „X weeks" na stronie i liczby w podpisach ruszają się jednym ruchem.

Harmonogram Actions (`schedule:`) na tym repo nie działa — patrz nagłówek
`telegram-spots.yml`. Nie ma go też po co wracać: deploy jest lepszym sygnałem.

Ręcznie: zakładka **Actions → Track record refresh → Run workflow**.

## Mapowanie postów

`MESSAGES` w `edit.js`: `low → 7`, `balanced → 8`, `scaling → 9`, `high → 10`.
Kolejność z publikacji 2026-08-20. Nie zgadywać — złe ID podmienia treść nie tego
posta, co trzeba.
