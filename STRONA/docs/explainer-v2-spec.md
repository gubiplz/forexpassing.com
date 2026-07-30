# AI Risk Officer — Explainer v2 (Technical Spec)

**Composition:** `AIRiskOfficerExplainer` · 1920×1080 · **60 fps** · **3868 frames ≈ 64.5 s**
**Source of truth:** `remotion/constants.ts` (everything below is derived from the `SCENES` table)
**Render:** `npm run remotion:render` → `out/air-risk-officer.mp4`
**Studio:** `npm run remotion:studio`

This is a ground-up re-beat of the v7 8-scene explainer into a **12-scene, VO-first** film
that reproduces the *motion-design language* of the reference ad
(`~/Downloads/MGMTForex - Let us teach you about trading.mp4`): a bright, airy canvas, a single
persistent **anchor card** whose contents morph from beat to beat, kinetic typography that pops in
around it, and a full-frame finale.

---

## 1. Look & art direction

A deliberate departure from the dark + lime brand UI. The **only** identity element carried over is
the Forex Passing wordmark (`public/logo.svg`, dark ink — sits perfectly on the light canvas).

| Token group | Value |
|---|---|
| Base canvas | `#f3f7ff` (light blue → white), animated radial "breathing" wash |
| Card surface | frosted white `rgba(255,255,255,0.72)`, 22px blur, blue-tinted shadow |
| Ink / muted | `#0f172a` / `#64748b` / `#94a3b8` |
| Accents | blue `#2563eb`, cyan `#06b6d4`, indigo `#6366f1`, purple `#8b5cf6`, red/rose `#ef4444`/`#f43f5e`, green `#22c55e`/`#16a34a`, amber `#f59e0b`/`#d97706` |
| Type | **Plus Jakarta Sans** (display, 500–800) · **Inter** (body, 400–700) |

**Mood system** (`theme.ts → MOODS`): each scene declares a `mood`; the `Background` cross-fades the
radial core/outer/glow/accent over 22 frames at each scene boundary.

| Mood | Used by | Feel |
|---|---|---|
| `NEUTRAL` | 1, 5, 6, 7 | calm blue |
| `PAIN` | 2, 3 | rose wash |
| `ATTENTION` | 4, 8 | indigo |
| `SUCCESS` | 9, 10 | green |
| `URGENT` | 11, 12 | amber |

---

## 2. Timing model (VO-first)

Each scene's window = `LEAD_IN (10f)` + **measured VO length** + `TAIL (18f)`.
VO clips live in `public/vo/sceneNN.mp3` (ElevenLabs, EN-US male "Eric") and are mounted at
`voStart(i) = boundary + LEAD_IN`, so the visual establishes the beat ~0.17 s before the line lands.
Re-measuring the VO and updating the `vo` column in `constants.ts` re-times the entire film.

| # | key | mood | kind | VO (s / frames) | starts @ | length | window |
|---|---|---|---|---|---|---|---|
| 1 | illusion | NEUTRAL | card | 5.20 / 313 | 0.00 s | 341 f | 0–341 |
| 2 | reality | PAIN | card | 2.97 / 179 | 5.68 s | 207 f | 341–548 |
| 3 | rootcause | PAIN | card | 4.50 / 271 | 9.13 s | 299 f | 548–847 |
| 4 | meet | ATTENTION | card | 4.32 / 260 | 14.12 s | 288 f | 847–1135 |
| 5 | notthis | NEUTRAL | card | 6.13 / 368 | 18.92 s | 396 f | 1135–1531 |
| 6 | check | NEUTRAL | card | 7.24 / 435 | 25.52 s | 463 f | 1531–1994 |
| 7 | verdict | NEUTRAL | card | 3.34 / 201 | 33.23 s | 229 f | 1994–2223 |
| 8 | guardian | ATTENTION | card | 7.57 / 455 | 37.05 s | 483 f | 2223–2706 |
| 9 | price | SUCCESS | card | 5.53 / 332 | 45.10 s | 360 f | 2706–3066 |
| 10 | payouts | SUCCESS | full | 3.81 / 229 | 51.10 s | 257 f | 3066–3323 |
| 11 | scarcity | URGENT | full | 3.44 / 207 | 55.38 s | 235 f | 3323–3558 |
| 12 | cta | URGENT | full | 4.69 / 282 | 59.30 s | 310 f | 3558–3868 |

---

## 3. Architecture (the persistent choreography engine)

```
AIRiskOfficerExplainer
├─ Background              (always on; mood arc, breathing radial washes)
├─ GlassCard ▸ CardInner   (persistent for scenes 1–9, then lifts away)
│    └─ slide-morph engine: outgoing panel exits left (−540px),
│       incoming enters from right (+540px), spring-eased, frame-exact
│       at each boundary. Each panel animates on its own scene-local frame.
├─ 12× <Audio> @ voStart(i)         (one VO clip per scene)
└─ 12× <Sequence> overlay
     ├─ scenes 1–9 : KineticText popping in around the card
     └─ scenes 10–12: full-frame finale panels (card already gone)
```

- **The card never re-mounts** across scenes 1–9 — that is what produces the reference's sense of
  one continuous object carrying you through the argument.
- At `CARD_HIDE_FRAME` (= start of scene 10, frame 3066) the card fades + lifts (−120px) + shrinks
  (→0.82) over a ~30-frame window, handing the frame to the finale.
- Springs are role-tuned: `SPRING_POP` (kinetic type/pills), `SPRING_GLIDE` (card slide),
  `SPRING` (general). 60 fps + spring physics = the "smooth" the brief asked for.

---

## 4. Scene-by-scene beat sheet

Each beat = **VO line** (script of record) + **central panel** (the demonstration) + **kinetic
overlay** (the claim). VO and overlay reinforce; the panel illustrates.

> Reconstructed VO script (the lines the `sceneNN.mp3` clips were generated from). The mp3 durations
> are authoritative and already drive the timeline; wording may be fine-tuned without re-timing as
> long as clip length is preserved.

**1 · illusion** — *NEUTRAL · panel `CandleRise`*
VO: "You passed the challenge — follow the rules, hit the targets, and the payouts are supposed to follow."
Panel: rising green candles + glowing up-arrow + 3 green check chips. Overlay (above): **"You passed the challenge."**

**2 · reality** — *PAIN · panel `CandleBreak`*
VO: "But that's almost never how it goes."
Panel: green candles roll over into a red plunge + "Payout never reached". Overlay (above, rose): **"But the payout never comes."**

**3 · rootcause** — *PAIN · panel `RiskMargin`*
VO: "One bad day past your daily loss limit, and the funded account is gone. No margin for error."
Panel: "DAILY LOSS LIMIT" meter fills to 90%, pulsing red sliver, "No margin for error". Overlay (above): **"One bad day past the limit — / the account is gone."**

**4 · meet** — *ATTENTION · panel `LogoReveal`*
VO: "Meet the AI Risk Officer — a discipline layer that sits on top of your trading."
Panel: Forex Passing wordmark → "AI Risk **Officer**" → green **LIVE** pulse. Overlay (below): **"Discipline, enforced on every trade."**

**5 · notthis** — *NEUTRAL · panel `NotThis`*
VO: "It's not a course, it's not signals, and it's not copy-trading. It's a risk layer that watches every position with you."
Panel: 3 rows (A course / Signals / Copy-trading) struck out → blue "A risk layer ✓". Overlay (above): **"So, what is it?"**

**6 · check** — *NEUTRAL · panel `PreTradeCheck`*
VO: "Before you take a trade, it runs the check that matters — your structure, your risk-to-reward, and how much of your daily loss limit is left."
Panel: white "PRE-TRADE CHECK" card, context `NQ · 15m · Long · NY open`, 3 green checks. Overlay (above): **"Every trade gets checked."**

**7 · verdict** — *NEUTRAL · panel `VerdictTriad`*
VO: "Then it gives you one clear verdict: trade, wait, or no trade."
Panel: 3 pills — **TRADE** (green) / **WAIT** (amber) / **NO TRADE** (rose). Overlay (above): **"One clear verdict. Every time."**

**8 · guardian** — *ATTENTION · panel `GuardianBlock`*
VO: "And when the impulses hit — the revenge trade, dragging your stop, the move that blows the account — it steps in and blocks them, automatically."
Panel: shield + 3 risk rows each struck with a blue **BLOCKED** lock badge + "Handled automatically". Overlay (above): **"When discipline breaks, / it steps in."**

**9 · price** — *SUCCESS · panel `PriceHero`*
VO: "The complete system was valued at four hundred and fifty dollars. Today, it's yours for forty-nine."
Panel: "THE COMPLETE SYSTEM" → "Valued at $450" (red strike) → **$49** green slam + burst ring → "yours today". Overlay (above): **"Here's the deal."**

**10 · payouts** — *SUCCESS · full-frame `PayoutsFinale`*
VO: "Built by traders with real, verified funded payouts."
Full frame: headline "Real, funded **payouts**" + "Real traders. Withdrawals you can verify." + 6 verified payout certificates scrolling R→L + **disclaimer**: *"Individual results shown. Not financial advice. Not a guarantee of future earnings."*

**11 · scarcity** — *URGENT · full-frame `ScarcityFinale`*
VO: "But there's only a limited number of founding seats at this price."
Full frame: "FOUNDING ACCESS" badge, counter ticks **50 → 11 / 50** "founding seats left at **$49**", meter **drains** toward near-empty, "When they're gone, the price goes up. No exceptions."
> The seat number is **not** baked into the VO — it's the on-screen constant `FOUNDING_SEATS` (default 50; the panel shows 78% claimed → 11 left). Change one number to re-key the whole scene.

**12 · cta** — *URGENT · full-frame `CtaFinale`*
VO: "So if you're ready to protect your account, get the AI Risk Officer today."
Full frame: Forex Passing wordmark + shield + "The AI Risk Officer" + "Your discipline, enforced on every trade." + $450→**$49** "founding price" + gradient button **"Get the AI Risk Officer →"** + bobbing down-arrow.

---

## 5. Editable knobs (no code spelunking)

All in `remotion/constants.ts` unless noted:

- `FOUNDING_SEATS` — seat count shown in scene 11 (the VO is generic, so this is safe to change).
- `SCENES[].vo` — per-scene VO frame counts; re-measure the mp3s (`ffprobe`) and update to re-time.
- `LEAD_IN` / `TAIL` — global pre-roll / breathing room per scene.
- `SLIDE` / `MORPH_FRAMES` — card slide distance / transition length.
- `SPRING*` — motion feel.
- Amounts/firms in scene 10 → `PayoutsFinale.tsx` `PAYOUTS[]` (mirrors `public/payouts/*.png`).
- Price anchor `$450 → $49` → `PriceHero.tsx` / `CtaFinale.tsx`.

---

## 6. Compliance & licensing notes

- **No fabricated guarantees / earnings claims.** Hero number is a *value anchor* ($450 → $49), not a
  promised return. Payout scene keeps the disclaimer line on-screen.
- **Real scarcity only.** Scene 11's number is an editable constant — set it to the true seat cap
  before publishing; do not imply a limit that isn't real.
- **ElevenLabs free tier** requires attribution for commercial use — confirm the plan/licensing before
  this goes out as a paid ad (flagged, not a blocker).
- **Off-limits (do not touch):** `src/**`, `workers/**`, `index.html`, `vite.config.ts`,
  `remotion.config.ts` (Cloudflare edge-cloaking is fully decoupled from the Remotion pipeline).
