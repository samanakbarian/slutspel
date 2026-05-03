# 💰 Ekonomisk Intelligens — Feature Spec

*Senast uppdaterad: 2026-05-03*
*Status: PoC — Börjar med årsredovisning 2022/2023*

---

## Vision

> Förvandla torra PDF-årsredovisningar till levande, interaktiva insikter som kopplar kassan till isen.

Ingen annan hockeyplattform gör detta. Vi blir först.

---

## Tre kärnfunktioner

### 1. 🏦 Krigskassan — Spelarbudget-tracker
- Budget-barometer: lönebudget → låst i kontrakt → kvar att spendera
- Kopplad till Silly Season i realtid
- AI-rekommendationer: "Baserat på budgeten bör Löven prioritera en back framför en forward"

### 2. 📊 SHL-Mätaren — Elitlicens-koll
- Traffic lights (🟢🟡🔴) per KPI vs SHL-krav
- Gap-analys med prognos
- AI-besparingsförslag: "Resekostnaderna ökade 40%. Branschsnitt är 25%."

### 3. 🤖 AI-Kassören — Kvartalsrapport för fans
- Betyg 1–5 löv (🍃)
- Executive summary på hockey-svenska
- AI-rekommendationer för ekonomisk hållbarhet

### Bonus: ⚡ Korrelationsmotor — Pengar vs Poäng
- Personalkostnader vs tabellplacering över tid

---

## Teknisk plan

Se fullständig spec i artifact `FEATURE_FINANCIALS.md`.

## PoC-scope
1. Hämta Björklövens årsredovisning 2022/2023
2. Extrahera KPI:er (manuellt eller via AI)
3. Lagra i BigQuery (`dim_financials`)
4. Visa i en enkel frontend-komponent
