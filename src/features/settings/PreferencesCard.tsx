import { useEffect, useState } from "react";
import type { ThemePref } from "@/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  SegmentedControl,
  Select,
} from "@/components/ui";
import { useSettings } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { updateSettings } from "@/db/repo";
import { COMMON_CURRENCIES, parseAmount } from "@/lib/currency";
import { toast } from "@/store/toast";
import { COMMON_LOCALES } from "./constants";

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function PreferencesCard() {
  const settings = useSettings();
  const money = useMoney();

  // Local mirror of the budget input so typing feels instant; commit on Save.
  const [budgetInput, setBudgetInput] = useState("");
  useEffect(() => {
    setBudgetInput(settings.monthlyBudget != null ? String(settings.monthlyBudget) : "");
  }, [settings.monthlyBudget]);

  const changeCurrency = async (baseCurrency: string) => {
    await updateSettings({ baseCurrency });
    toast.success("Base currency updated", baseCurrency);
  };

  const changeTheme = async (theme: ThemePref) => {
    await updateSettings({ theme });
    toast.success("Theme updated", `Now using ${theme}`);
  };

  const changeLocale = async (locale: string) => {
    await updateSettings({ locale });
    toast.success("Locale updated", locale);
  };

  const saveBudget = async () => {
    const trimmed = budgetInput.trim();
    if (trimmed === "") {
      await updateSettings({ monthlyBudget: null });
      toast.success("Monthly budget cleared");
      return;
    }
    const parsed = parseAmount(trimmed);
    if (parsed == null || parsed < 0) {
      toast.error("Enter a valid budget amount");
      return;
    }
    await updateSettings({ monthlyBudget: parsed });
    setBudgetInput(String(parsed));
    toast.success("Monthly budget saved", money.format(parsed));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>How money, language, and the interface look.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Base currency"
            hint="Every amount is stored and shown in this currency."
            htmlFor="pref-currency"
          >
            <Select
              id="pref-currency"
              value={settings.baseCurrency}
              onChange={(e) => changeCurrency(e.target.value)}
            >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Locale"
            hint="Controls number and date formatting."
            htmlFor="pref-locale"
          >
            <Select
              id="pref-locale"
              value={settings.locale}
              onChange={(e) => changeLocale(e.target.value)}
            >
              {COMMON_LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Theme" hint="The app applies your choice automatically.">
          <div>
            <SegmentedControl<ThemePref>
              value={settings.theme}
              onChange={changeTheme}
              options={THEME_OPTIONS}
            />
          </div>
        </Field>

        <Field
          label="Monthly budget"
          hint="Compared against your normalized monthly spend, so a lumpy charge doesn't blow a single month. Leave empty for no target."
          htmlFor="pref-budget"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {settings.baseCurrency}
              </span>
              <Input
                id="pref-budget"
                inputMode="decimal"
                placeholder="e.g. 3000"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveBudget();
                }}
                className="pl-12"
              />
            </div>
            <Button type="button" variant="secondary" onClick={saveBudget}>
              Save
            </Button>
          </div>
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">Formatting preview</span>
          <span className="text-base font-semibold tabular-nums text-foreground">
            {money.format(1234.5)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
