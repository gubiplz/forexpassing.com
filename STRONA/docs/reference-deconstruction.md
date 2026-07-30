# Reference Deconstruction — Motion-Design Language

**Reference:** `~/Downloads/MGMTForex - Let us teach you about trading.mp4` (+ its 12-scene technical
description). This doc captures *why the reference feels good* and maps each mechanic to where v2
reproduces it, so future edits preserve the language instead of drifting back to a slideshow.

## The five mechanics that make it read as "premium motion design"

1. **One persistent anchor object, not a deck of slides.**
   The reference keeps a single central card/graphic alive and *morphs its contents* rather than
   cutting between full-screen layouts. Continuity of the object = perceived production value.
   → v2: `GlassCard` + `CardInner` live unbroken across scenes 1–9; the **slide-morph engine**
   glides the old panel out left while the new one enters from the right (`CardInner.tsx`).

2. **Bright, airy, low-contrast canvas with colored light.**
   Light base, soft radial glows that *move*, accents that shift with the emotional beat — never a
   flat background.
   → v2: `Background.tsx` breathing radial washes + per-scene **mood cross-fade** (`MOODS` in
   `theme.ts`). Pain = rose, attention = indigo, success = green, urgency = amber.

3. **Kinetic typography that pops, not fades.**
   Lines arrive with a spring (translateY + scale + opacity) and stagger, positioned *around* the
   anchor (above/below), so type and graphic share the frame.
   → v2: `KineticText.tsx` on `SPRING_POP`; each scene overlay places 1–2 short claim-lines.

4. **Spring physics + high frame rate = "smooth".**
   Everything eases on spring curves; nothing moves linearly; 60 fps removes stutter.
   → v2: 60 fps composition; role-tuned `SPRING`, `SPRING_POP`, `SPRING_GLIDE`.

5. **VO-first pacing with lead-in and tail.**
   The visual establishes a beat slightly *before* the narrator speaks, and holds briefly after.
   → v2: `LEAD_IN` (10 f) before each VO, `TAIL` (18 f) after; VO mounted at `voStart(i)`.
   Scene length is *derived from the measured VO* — the film is cut to the voice, not the reverse.

## Structural mapping (reference 12 beats → v2 12 scenes)

The reference arc is: **promise → problem → introduce solution → what it is / isn't → how it works
(demonstrated) → proof → offer → scarcity → CTA.** v2 follows the same spine, specialized to the AI
Risk Officer:

| Beat role | Reference | v2 scene |
|---|---|---|
| Promise / hook | the dream being sold | 1 illusion (`CandleRise`) |
| Problem | it doesn't work that way | 2 reality (`CandleBreak`) |
| Root cause / stakes | why it fails | 3 rootcause (`RiskMargin`) |
| Introduce solution | meet the product | 4 meet (`LogoReveal`) |
| Disambiguate ("what it is") | not X, but Y | 5 notthis (`NotThis`) |
| Mechanism demo #1 | how it works | 6 check (`PreTradeCheck`) |
| Mechanism demo #2 | the output | 7 verdict (`VerdictTriad`) |
| Mechanism demo #3 / differentiator | the "wow" guardrail | 8 guardian (`GuardianBlock`) |
| Value / price anchor | what it's worth | 9 price (`PriceHero`) |
| Proof | testimonials / results | 10 payouts (`PayoutsFinale`) |
| Scarcity | limited availability | 11 scarcity (`ScarcityFinale`) |
| CTA | the button | 12 cta (`CtaFinale`) |

## Deliberate divergences from the reference

- **Palette is ours, not theirs.** Same *brightness and air*, but v2 uses Forex Passing-adjacent
  blues/greens and keeps the wordmark, so it reads as the brand's ad — not a clone.
- **Card lifts away for the finale.** The reference stays card-centric; v2 promotes scenes 10–12 to
  **full-frame** so proof / scarcity / CTA hit harder (the close should feel bigger than the body).
- **No fabricated claims.** Where a generic ad might promise returns, v2's money beat is an explicit
  *value anchor* ($450 → $49) and the payout scene carries a compliance disclaimer.

## How to verify a re-render against the reference

1. Render: `npm run remotion:render`.
2. Spot-check beats with stills: `npx remotion still AIRiskOfficerExplainer /tmp/fNNN.png --frame=NNN`
   at the mid-points of each window (see the timing table in `explainer-v2-spec.md`).
3. Check the five mechanics above are present in motion (open `npm run remotion:studio` and scrub the
   boundaries: 341 / 1135 / 2706 / 3066 — morph-out, mood shifts, card hand-off to finale).
