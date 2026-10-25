import { describe, expect, it } from "vitest";
import type { Category } from "@/types";
import { autoParse, CSV_PRESETS, parseExpenseCsv, toIsoDate } from "./csvImport";

const cats: Category[] = [
  { id: "other", name: "Other", color: "#000", essential: false, createdAt: "", updatedAt: "" },
  { id: "food", name: "Groceries", color: "#000", essential: true, createdAt: "", updatedAt: "" },
];
const preset = (id: string) => CSV_PRESETS.find((p) => p.id === id)!;

describe("toIsoDate", () => {
  it("passes ISO through", () => expect(toIsoDate("2026-05-01")).toBe("2026-05-01"));
  it("parses mdy", () => expect(toIsoDate("05/14/2026", "mdy")).toBe("2026-05-14"));
  it("parses dmy", () => expect(toIsoDate("14/05/2026", "dmy")).toBe("2026-05-14"));
  it("auto-detects 4-digit-first as ymd", () => expect(toIsoDate("2026/05/14", "auto")).toBe("2026-05-14"));
  it("auto-detects day>12 as dmy", () => expect(toIsoDate("14/05/2026", "auto")).toBe("2026-05-14"));
  it("rejects junk", () => expect(toIsoDate("not a date")).toBeNull());
});

describe("parseExpenseCsv — single amount column", () => {
  it("imports negative amounts as expenses and skips income", () => {
    const text = "Date,Description,Amount\n01/15/2026,Coffee Shop,-4.50\n01/20/2026,Salary,2000.00";
    const r = parseExpenseCsv(text, cats, "USD", preset("generic"));
    expect(r.drafts).toHaveLength(1);
    expect(r.drafts[0].amount).toBe(4.5);
    expect(r.drafts[0].date).toBe("2026-01-15");
    expect(r.drafts[0].description).toBe("Coffee Shop");
    expect(r.skipped).toBe(1);
  });
});

describe("parseExpenseCsv — debit/credit columns", () => {
  it("uses the debit column and ignores credit rows", () => {
    const text = "Date,Description,Debit,Credit\n2026-01-15,Shop,20.00,\n2026-01-16,Refund,,5.00";
    const r = parseExpenseCsv(text, cats, "USD", preset("debit-credit"));
    expect(r.drafts).toHaveLength(1);
    expect(r.drafts[0].amount).toBe(20);
  });
});

describe("evenkeel template + autoParse", () => {
  it("maps categories by name", () => {
    const text = "date,amount,category,description\n2026-03-02,12.00,Groceries,Milk";
    const r = parseExpenseCsv(text, cats, "USD", preset("evenkeel"));
    expect(r.drafts[0].categoryId).toBe("food");
  });

  it("auto picks the preset that yields the most rows", () => {
    const text = "Date,Description,Amount\n03/02/2026,Cafe,-9.00";
    const { preset: chosen, result } = autoParse(text, cats, "USD");
    expect(result.drafts).toHaveLength(1);
    expect(chosen.id).toBe("generic");
  });
});
