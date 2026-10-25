import { describe, expect, it } from "vitest";
import type { Expense } from "@/types";
import {
  buildMerchantIndex,
  dedupeDrafts,
  fingerprint,
  normalizeMerchant,
  suggestCategoryId,
} from "@/lib/categorization";

const TS = "2026-01-01T00:00:00.000Z";
function exp(over: Partial<Expense>): Expense {
  return {
    id: over.id ?? "e",
    date: over.date ?? "2026-01-10",
    amount: over.amount ?? 10,
    currency: "USD",
    categoryId: over.categoryId ?? "cat",
    description: over.description ?? "",
    payee: over.payee,
    tags: [],
    createdAt: TS,
    updatedAt: TS,
  };
}

describe("normalizeMerchant", () => {
  it("strips digits, symbols, and noise tokens", () => {
    expect(normalizeMerchant("SQ *COFFEE BAR 1234")).toBe("coffee bar");
    expect(normalizeMerchant("AMZN Mktp US*2A3B4")).toBe("amzn mktp us");
    expect(normalizeMerchant("POS PURCHASE NETFLIX.COM")).toBe("netflix com");
  });
});

describe("buildMerchantIndex / suggestCategoryId", () => {
  const expenses = [
    exp({ payee: "Netflix.com", categoryId: "subs" }),
    exp({ payee: "Netflix.com", categoryId: "subs" }),
    exp({ payee: "Whole Foods Market", categoryId: "groceries" }),
  ];
  const index = buildMerchantIndex(expenses);

  it("learns the majority category per merchant", () => {
    expect(suggestCategoryId("NETFLIX.COM", index)).toBe("subs");
    expect(suggestCategoryId("Whole Foods Market #221", index)).toBe("groceries");
  });

  it("returns null for unknown merchants", () => {
    expect(suggestCategoryId("Some Random Shop", index)).toBeNull();
  });

  it("matches on a contained merchant key", () => {
    expect(suggestCategoryId("WHOLE FOODS", index)).toBe("groceries");
  });
});

describe("fingerprint / dedupeDrafts", () => {
  it("treats same date+amount+merchant as a duplicate", () => {
    const a = { date: "2026-01-10", amount: 4.5, description: "SQ *COFFEE 99" };
    const b = { date: "2026-01-10", amount: 4.5, description: "COFFEE" };
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it("removes duplicates against existing and within the batch", () => {
    const existing = new Set([fingerprint({ date: "2026-01-01", amount: 100, payee: "Rent" })]);
    const drafts = [
      { date: "2026-01-01", amount: 100, payee: "RENT" }, // dup vs existing
      { date: "2026-02-01", amount: 50, payee: "Gym" },
      { date: "2026-02-01", amount: 50, payee: "Gym" }, // dup within batch
    ];
    const { unique, duplicates } = dedupeDrafts(drafts, existing);
    expect(unique).toHaveLength(1);
    expect(duplicates).toBe(2);
  });
});
