# Importing bank data (with optional AI categorization)

EvenKeel is built to be fed from your **bank export**. The import flow cleans,
categorizes, de-duplicates, and lets you review before anything is saved.

## The fastest path (no AI)

1. Export a CSV from your bank (most exports work as-is).
2. **Expenses → Import CSV**.
3. Pick a **Format** (or leave **Auto-detect**):
   - *EvenKeel template* — `date, amount, category, description, payee, tags, notes`
   - *Bank — single Amount column* — negative amounts are spending; income/refunds skipped
   - *Bank — Debit / Credit columns* — the Debit/Withdrawal column is the expense
4. Paste or choose the file. EvenKeel will:
   - parse dates in ISO, `M/D/Y`, `D/M/Y`, or `D.M.Y`
   - **auto-categorize** each row from your own history (a private merchant→category
     memory it learns as you categorize — nothing leaves your device)
   - **skip duplicates** it has already imported (so monthly re-imports are safe)
   - skip income, refunds, and blank/invalid rows
5. **Review** the table — fix any category (rows marked `auto` were guessed) — then **Import**.

The learning gets better over time: every expense you categorize teaches the
importer, so subsequent imports need fewer corrections.

## The AI-assisted path

If you want an AI to do the first-pass categorization (handy for a big historical
backfill), open **Import CSV → "Categorize with AI first?"** and **Copy prompt**.
It already lists *your* categories. Paste it into your AI of choice, paste your bank
export after it, and bring the returned CSV back into the importer.

> Privacy note: doing this sends your transactions to whatever AI you use.
> EvenKeel itself never uploads anything — but a cloud AI will see what you paste.
> For a fully private setup, prefer a local model (e.g. Ollama) or just rely on the
> built-in learning categorizer above.

The prompt asks the AI to output exactly:

```
date,amount,category,description,payee,tags,notes
```

with spending only (no income/transfers), categories chosen from your list, and a
`recurring` tag on subscription-like charges.

## After importing

- Charges tagged/identified as recurring will surface on **Recurring** as
  suggestions — add them so they're **normalized** (a yearly charge becomes a flat
  monthly figure).
- Re-import next month anytime; duplicates are detected automatically.
- Back up periodically: **Settings → Export backup**.
