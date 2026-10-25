import { describe, expect, it } from "vitest";
import type { SavingsGoal } from "@/types";
import { accelerateGoal, monthsToComplete } from "./helpers";

const TS = "2026-01-01T00:00:00.000Z";

function goal(over: Partial<SavingsGoal>): SavingsGoal {
  return {
    id: "g1",
    name: "Goal",
    targetAmount: over.targetAmount ?? 1000,
    currentAmount: over.currentAmount ?? 0,
    deadline: null,
    monthlyContribution: over.monthlyContribution ?? null,
    linkedCategoryIds: [],
    status: "active",
    createdAt: TS,
    updatedAt: TS,
  };
}

describe("monthsToComplete", () => {
  it("returns 0 when already funded", () => {
    expect(monthsToComplete(0, 100)).toBe(0);
    expect(monthsToComplete(-50, 100)).toBe(0);
  });
  it("returns null when the rate is zero", () => {
    expect(monthsToComplete(500, 0)).toBeNull();
  });
  it("rounds up partial months", () => {
    expect(monthsToComplete(1000, 300)).toBe(4);
  });
});

describe("accelerateGoal", () => {
  it("shortens the timeline when extra money is redirected", () => {
    const g = goal({ targetAmount: 1200, currentAmount: 0, monthlyContribution: 100 });
    const accel = accelerateGoal(g, 100); // 100 + 100 = 200/mo
    expect(accel.monthsBefore).toBe(12);
    expect(accel.monthsAfter).toBe(6);
    expect(accel.monthsSaved).toBe(6);
  });

  it("handles a goal with no current contribution", () => {
    const g = goal({ targetAmount: 600, currentAmount: 0, monthlyContribution: 0 });
    const accel = accelerateGoal(g, 150);
    expect(accel.monthsBefore).toBeNull();
    expect(accel.monthsAfter).toBe(4);
    expect(accel.monthsSaved).toBe(0);
  });
});
