/**
 * Realistic sample data so the app tells a story on first open: steady monthly
 * costs, lumpy yearly/biyearly insurance (the exact scenario this app is built
 * for), a few subscriptions, and one splurge month.
 */
import type { Category, Expense, RecurringExpense, SavingsGoal } from "@/types";
import { newId, now } from "@/db/database";
import { addMonthsToKey, currentMonthKey, todayISO } from "@/lib/date";

interface SeedBundle {
  expenses: Expense[];
  recurring: RecurringExpense[];
  goals: SavingsGoal[];
}

// A fixed-seed generator (mulberry32), so the demo tells the same story and
// shows the same totals on every fresh install.
let state = 0x5eed;
function random(): number {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}
function rand(min: number, max: number): number {
  return Math.round((min + random() * (max - min)) * 100) / 100;
}
function day(month: string, d: number): string {
  return `${month}-${String(Math.min(28, Math.max(1, d))).padStart(2, "0")}`;
}

export function generateDemoData(categories: Category[], currency: string): SeedBundle {
  const byName = new Map(categories.map((c) => [c.name, c.id]));
  const id = (name: string) => byName.get(name) ?? categories[0].id;
  const ts = now();
  state = 0x5eed;
  const today = todayISO();
  // Twelve months of history, so the dashboard's 12-month trend is full.
  const MONTHS = 12;
  const first = -(MONTHS - 1);
  const start = (d: number) => day(addMonthsToKey(currentMonthKey(), first), d);

  const expenses: Expense[] = [];
  const recurring: RecurringExpense[] = [];
  const goals: SavingsGoal[] = [];

  const baseRec = (over: Partial<RecurringExpense> & Pick<RecurringExpense, "name" | "amount" | "categoryId" | "frequency">): RecurringExpense => ({
    id: newId(),
    currency,
    interval: 1,
    anchorDate: start(1),
    endDate: null,
    amortize: false,
    active: true,
    tags: [],
    createdAt: ts,
    updatedAt: ts,
    ...over,
  });

  // Steady essentials + the flagship lumpy charges. The yearly and half-yearly
  // ones are anchored a year back, so they land as spikes inside the chart while
  // their smoothed share already covers every month shown.
  recurring.push(
    baseRec({ name: "Rent", amount: 1450, categoryId: id("Housing"), frequency: "monthly", anchorDate: start(1) }),
    baseRec({ name: "Internet", amount: 60, categoryId: id("Utilities"), frequency: "monthly", anchorDate: start(5) }),
    baseRec({ name: "Mobile plan", amount: 45, categoryId: id("Utilities"), frequency: "monthly", anchorDate: start(8) }),
    baseRec({ name: "Family life insurance", amount: 1320, categoryId: id("Insurance"), frequency: "annual", amortize: true, anchorDate: day(addMonthsToKey(currentMonthKey(), -14), 14) }),
    baseRec({ name: "Car insurance", amount: 560, categoryId: id("Insurance"), frequency: "semiannual", amortize: true, anchorDate: start(20) }),
    baseRec({ name: "Gym membership", amount: 39, categoryId: id("Entertainment"), frequency: "monthly", anchorDate: start(3) }),
    baseRec({ name: "Netflix", amount: 15.49, categoryId: id("Subscriptions"), frequency: "monthly", anchorDate: start(11) }),
    baseRec({ name: "Spotify", amount: 10.99, categoryId: id("Subscriptions"), frequency: "monthly", anchorDate: start(17) }),
    baseRec({ name: "Cloud storage", amount: 2.99, categoryId: id("Subscriptions"), frequency: "monthly", anchorDate: start(2) }),
    baseRec({ name: "Design software", amount: 119.88, categoryId: id("Subscriptions"), frequency: "annual", amortize: true, anchorDate: day(addMonthsToKey(currentMonthKey(), -13), 9) }),
  );

  const groceryStores = ["Whole Foods", "Trader Joe's", "Aldi", "Costco", "Local Market"];
  const restaurants = ["Sushi Place", "Burger Joint", "Thai Express", "Cafe Nero", "Pizzeria", "Taco Stand"];
  const shops = ["Amazon", "IKEA", "Zara", "Best Buy", "Etsy"];

  const e = (over: Partial<Expense> & Pick<Expense, "date" | "amount" | "categoryId" | "description">): Expense => ({
    id: newId(),
    currency,
    tags: [],
    amortizeMonths: null,
    recurringId: null,
    createdAt: ts,
    updatedAt: ts,
    ...over,
  });

  // Twelve months of discretionary + variable spending.
  for (let i = MONTHS - 1; i >= 0; i--) {
    const m = addMonthsToKey(currentMonthKey(), -i);

    // Groceries — a few trips a month.
    for (let g = 0; g < 4; g++) {
      expenses.push(e({ date: day(m, 3 + g * 7), amount: rand(45, 130), categoryId: id("Groceries"), description: pick(groceryStores), method: "card" }));
    }
    // Dining out.
    for (let d = 0; d < 3; d++) {
      expenses.push(e({ date: day(m, 5 + d * 9), amount: rand(14, 65), categoryId: id("Dining Out"), description: pick(restaurants), method: "card" }));
    }
    // Fuel / transit.
    expenses.push(e({ date: day(m, 6), amount: rand(40, 75), categoryId: id("Transport"), description: "Fuel", method: "card" }));
    expenses.push(e({ date: day(m, 21), amount: rand(40, 75), categoryId: id("Transport"), description: "Fuel", method: "card" }));
    // Electricity (variable).
    expenses.push(e({ date: day(m, 12), amount: rand(55, 120), categoryId: id("Utilities"), description: "Electricity", method: "directdebit" }));
    // Occasional shopping / entertainment.
    if (random() > 0.4) {
      expenses.push(e({ date: day(m, 16), amount: rand(25, 180), categoryId: id("Shopping"), description: pick(shops), method: "card" }));
    }
    if (random() > 0.5) {
      expenses.push(e({ date: day(m, 19), amount: rand(15, 70), categoryId: id("Entertainment"), description: pick(["Cinema", "Concert", "Game", "Books"]), method: "card" }));
    }
    // A health copay now and then.
    if (random() > 0.7) {
      expenses.push(e({ date: day(m, 10), amount: rand(20, 90), categoryId: id("Health"), description: "Pharmacy", method: "card" }));
    }
  }

  // One splurge: a holiday seven months ago (a lumpy, discretionary spike that
  // the normalized view will visibly absorb). Amortized over 12 months.
  const tripMonth = addMonthsToKey(currentMonthKey(), -7);
  expenses.push(
    e({ date: day(tripMonth, 14), amount: 1850, categoryId: id("Travel"), description: "Weekend city break (flights + hotel)", method: "card", amortizeMonths: 12, tags: ["holiday"] }),
  );

  goals.push(
    {
      id: newId(),
      name: "Emergency fund",
      targetAmount: 6000,
      currentAmount: 2400,
      deadline: null,
      monthlyContribution: 300,
      linkedCategoryIds: [id("Dining Out"), id("Subscriptions")],
      note: "Three months of essential expenses.",
      color: "#14b8a6",
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      name: "Japan trip",
      targetAmount: 4500,
      currentAmount: 900,
      deadline: day(addMonthsToKey(currentMonthKey(), 11), 1),
      monthlyContribution: 350,
      linkedCategoryIds: [id("Travel")],
      note: "Two weeks, spring.",
      color: "#ec4899",
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    },
  );

  // Nothing dated in the future: drop this month's one-offs that haven't happened yet.
  return { expenses: expenses.filter((x) => x.date <= today), recurring, goals };
}
