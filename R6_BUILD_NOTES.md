# ClaimPulse Investor Dashboard R6 — build notes

**Built from:** `Marketting updated/ClaimPulse_Investor_Dashboard_R5 (1).xlsx`
**Output:** `00 Main Workings/ClaimPulse_Investor_Dashboard_R6.xlsx`
**Date:** 28 August 2026

Edits were made at XML level, so all 17 sheets, 11 charts, the drawing and the
embedded image survive untouched. `calcChain.xml` was dropped and
`fullCalcOnLoad` set, so Excel rebuilds every cached result on open.

## Verified after a forced recalculation

| | R5 | **R6** |
|---|---|---|
| Gross annual benefit, Base | 39.80 | **34.852** |
| Net annual benefit, Base | 35.90 | **30.951** |
| Payback, steady state | 3.31 mo | **3.835 mo** |
| Payback from kickoff | 18.47 mo | **20.073 mo** |
| 3-year NPV at 12% | 61.16 | **51.065** |
| Combined ratio, Motor OD | 1.148 pp | **1.148 pp** (unchanged, deliberately) |
| Marketing total, MARKETTING F51 | 8.73 shown against 106.9m | **8.728 Cr on 87.28m** |
| Model integrity | 9 checks failing | **ALL 24 CHECKS PASS** |
| `W-60` stakeholder check | −16.33 at Base | **0.000 on all three plans** |

Capacity redeployed (W-22a): 6.648 / 16.619 / 22.159.
Marketing investment (W-23a): −1.746 / −5.237 / −8.728.
Scenario S1: 30.103 / 30.951 / 32.053. S2 L1 returns the live figure exactly.
Part K2 frequency: 2.82% on the GI Council basis, 5.79% on the team basis.

## Where this build differs from the changelog

1. **Frequency reconciliation is Part K2 at rows 236–241**, not rows 161–165.
   Inserting five rows mid-sheet would have renumbered everything below and
   every cross-sheet reference into it. It is appended instead, and the Part K
   note at C160 points to it.
2. **Sheet 8 `I19:I21` were hardcoded numbers in R5**, not formulas. They are
   now the same live payback formula as `I22:I31` (`IFERROR(..., 9999)` with
   `NA()` as the inner no-payback branch), so they flex with the rebuilt
   `G19:G21` instead of standing at the old 17.06 / 16.84 / 16.57.
3. **`J19:J21` were also rebuilt** — not in the changelog, but they carried the
   same defect as `G19:G21`: they banked an inline labour saving into the
   expense ratio and read 2.51 / 2.58 / 2.68 pp against a 1.148 pp headline.
   They now use the R6 treatment and correctly show 1.148 pp at every green-lane
   level, because auto-settlement share does not move the combined ratio when
   labour is not claimed.
4. **Summary Part 1B has one free row, not two.** Capacity and marketing are
   carried as a single line, H-25a *"plus: capacity redeployed, net of marketing
   investment"*. IC-02 still tests the full `31:38` range on Sheet 3.
5. **Cost Architecture: the live re-point is `D28:D33` / `E28:E33`**, the value
   and share columns (the changelog said C). They are `TEXT()` formulas so the
   3-decimal presentation is preserved. `B36` (the ceiling sentence) is now
   formula-built too: variable 2.086 Cr / 53.5%, fixed 1.815 Cr / 46.5%.

## Still open — unchanged from the changelog

1. **33.23 Cr cannot be reproduced.** Capacity at Base is 16.62; net of
   marketing, 11.38. Supply the derivation or drop the figure.
2. **B-29 = 0.70 is a placeholder** and is now the largest Tier 4 input
   (Sheet 1, D294). It needs a stated basis or a pilot gate.
3. **B-31 = TEAM** (D296). Flip to `GICOUNCIL` and Part K2 W-106 goes BELOW BAND.
4. **B-30 = NO** (D295). At `YES` the commission line dominates the whole plan.
5. **Expense-ratio treatment** (Sheet 3 H84) is conservative. Reversing adds
   roughly 1.0 pp to the Motor OD combined ratio. Business decision, not a fix.
6. **Sheet 3 Part L** still runs the pre-R6 engine (43.31 Cr, 16.84 mo, 2.58 pp)
   and contradicts Part C. Do not quote from it. The Sheet 8 intro note now says so.
7. **Sheet 8 Parts C and D** are still hardcoded off the pre-R6 engine
   (38.62 / 15.95 Cr, "Rs 17.58 Cr", "Rs 1.41 Cr"). Not touched.
8. **Sheet 12 Parts D and F** still carry 26.19/claim and 245,820 claims.
9. **The deck is stale** wherever it quotes a rupee figure — slides 8 to 11.
