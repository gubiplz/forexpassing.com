// Podpisy pod plakatami — SKŁADANE Z DANYCH, nigdy wpisywane ręcznie.
//
// Używa ich i wysyłka (send.js), i edycja już opublikowanych postów (edit.js).
// Wcześniej liczby stały tu wklepane na sztywno; przy odświeżaniu raz w
// tygodniu skończyłoby się to plakatem z jednego tygodnia i tekstem z innego.
//
// Podpisy niosą jednak nie tylko liczby, ale i ZDANIA O TYCH LICZBACH —
// „every single month in the green", „drawdown still under 4%", „an account
// that has more than doubled". Żadnego z nich nie da się wygenerować, a każde
// może przestać być prawdą po kolejnej dołożonej sesji. Dlatego sprawdzamy je
// asercjami: automat ma się wywalić i nie ruszyć kanału, a nie po cichu
// opublikować kłamstwo pod logo firmy.
const LINK = 'https://forexpassing.com/past-performance';
const TAIL = `Check it yourself 👇\n${LINK}\n\n➡️ Message @fxpassingadmin if you have any questions`;

const ORDER = ['low', 'balanced', 'scaling', 'high'];
const LIMIT = 1024;

/** „+117.17%" → 117.17, „3.76%" → 3.76. */
function num(s) {
  const v = Number(String(s).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(v)) throw new Error(`nie liczba: "${s}"`);
  return v;
}

function sprawdz(warunek, opis) {
  if (!warunek) throw new Error(`podpis przestał być prawdziwy: ${opis}`);
}

/**
 * @param {Record<string, any>} p profile z track-data.json
 * @returns {Record<string, string>} podpis per profil
 */
function buildCaptions(p) {
  for (const id of ORDER) {
    sprawdz(p[id], `brak profilu "${id}" w danych`);
    // Wszystkie cztery podpisy chwalą się miesiącami na plusie.
    const najgorszy = Math.min(...p[id].months.map((m) => m.v));
    sprawdz(najgorszy > 0, `${id}: miesiąc na minusie (${najgorszy}%), a podpis mówi „every single month in the green"`);
  }
  sprawdz(num(p.balanced.maxDrawdown) < 4, `balanced: drawdown ${p.balanced.maxDrawdown}, a podpis mówi „still under 4%"`);
  sprawdz(num(p.balanced.totalReturn) > num(p.low.totalReturn), 'balanced: podpis mówi „faster growth than Low Risk"');
  sprawdz(num(p.high.totalReturn) > 100, `high: zwrot ${p.high.totalReturn}, a podpis mówi „more than doubled"`);
  sprawdz(
    ORDER.every((id) => id === 'high' || num(p.high.totalReturn) > num(p[id].totalReturn)),
    'high: podpis mówi „the highest return of all our settings"',
  );
  sprawdz(p.high.consistency < 100, 'high: podpis mówi „yes, there are red weeks"');

  const captions = {
    low: `📊 This is what Low Risk looks like at Forex Passing.

No promises. Just numbers — public, tracked session by session over ${p.low.weeks} weeks across ${p.low.trades} trades.

✅ Win Rate: ${p.low.winRate}
✅ Profit Factor: ${p.low.profitFactor}
✅ Max Drawdown: ${p.low.maxDrawdown}
✅ Avg Monthly Return: ${p.low.avgMonthly}
✅ Total Return: ${p.low.totalReturn}

Starting balance of $100,000 — grown consistently, month after month, with a clean upward equity curve and every single month in the green.

This is our Low Risk setting. Not our aggressive one. Not our best month cherry-picked. Our standard, everyday low risk performance — the setting most funded accounts run on.

${TAIL}`,

    balanced: `📊 This is what Balanced looks like at Forex Passing.

Same tracker. Same ${p.balanced.weeks} weeks. ${p.balanced.trades} trades. No edits.

✅ Win Rate: ${p.balanced.winRate}
✅ Profit Factor: ${p.balanced.profitFactor}
✅ Max Drawdown: ${p.balanced.maxDrawdown}
✅ Avg Monthly Return: ${p.balanced.avgMonthly}
✅ Total Return: ${p.balanced.totalReturn}

More aggression. More growth. Still a clean upward equity curve with every single month closing in the green.

This is our default setting — the exact numbers the performance widget on our site has always shown. Faster growth than Low Risk, with drawdown still under 4%.

${TAIL}`,

    scaling: `📊 This is what the Scaling Route looks like at Forex Passing.

Built for clients who want steady, compounding growth — starts small and steps size up as the account grows, without the volatility of higher risk settings.

✅ Win Rate: ${p.scaling.winRate}
✅ Profit Factor: ${p.scaling.profitFactor}
✅ Max Drawdown: ${p.scaling.maxDrawdown}
✅ Avg Monthly Return: ${p.scaling.avgMonthly}
✅ Total Return: ${p.scaling.totalReturn}
✅ Best Trade: ${p.scaling.bestTrade}
✅ Worst Trade: ${p.scaling.worstTrade}
✅ Consistency Score: ${p.scaling.consistency}/100

${p.scaling.weeks} weeks. ${p.scaling.trades} trades. A clean, upward equity curve that barely dips — with every single month in the green.

An ${p.scaling.consistency} consistency score doesn't happen by accident. This is a system built to protect your account first and grow it second.

${TAIL}`,

    high: `📊 This is what High Risk looks like at Forex Passing.

Not for everyone — but if you want maximum growth and can handle the ride, the numbers speak for themselves.

✅ Win Rate: ${p.high.winRate}
✅ Profit Factor: ${p.high.profitFactor}
✅ Max Drawdown: ${p.high.maxDrawdown}
✅ Avg Monthly Return: ${p.high.avgMonthly}
✅ Total Return: ${p.high.totalReturn}

✅ R:R Ratio: ${p.high.riskReward}
✅ Best Trade: ${p.high.bestTrade}
✅ Worst Trade: ${p.high.worstTrade}
✅ Consistency Score: ${p.high.consistency}/100

${p.high.weeks} weeks. ${p.high.trades} trades. The highest return of all our settings — an account that has more than doubled.

Yes, there are red weeks. That's the trade-off for +${Math.round(num(p.high.totalReturn))}% in ${p.high.weeks} weeks. If you understand the risk — this is it.

${TAIL}

❕ This is the OFFICIAL Forex Passing channel. Our only admin is @fxpassingadmin; anyone else is a scam. Stay safe.`,
  };

  for (const id of ORDER) {
    sprawdz(captions[id].length <= LIMIT, `${id}: podpis ma ${captions[id].length} znaków (limit ${LIMIT})`);
  }
  return captions;
}

module.exports = { buildCaptions, ORDER, LINK, TAIL, LIMIT };
