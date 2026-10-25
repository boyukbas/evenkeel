/** Builds a copy-paste prompt that turns a bank export into EvenKeel-ready CSV. */
export function buildAiPrompt(categoryNames: string[]): string {
  const list = categoryNames.join(", ");
  return `Convert the bank transactions below into CSV using EXACTLY this header:
date,amount,category,description,payee,tags,notes

Rules:
- date: YYYY-MM-DD
- amount: a positive number — SPENDING ONLY. Skip income, refunds, and transfers between my own accounts.
- category: choose the closest from EXACTLY this list: ${list}
- description: a short, human label for what it was
- payee: the merchant / counterparty if known, otherwise blank
- tags: add "recurring" for clearly subscription/recurring charges, otherwise blank
- notes: leave blank unless genuinely useful
Output ONLY the CSV (header + one row per transaction), no commentary or code fences.

Transactions:
<paste your bank export here>`;
}
