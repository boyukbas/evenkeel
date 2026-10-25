import { useMemo } from "react";
import { useSettings } from "@/hooks/useData";
import { formatCompactCurrency, formatCurrency, formatCurrencyWhole } from "@/lib/currency";

/** Currency formatters bound to the user's base currency + locale. */
export function useMoney() {
  const { baseCurrency, locale } = useSettings();
  return useMemo(
    () => ({
      currency: baseCurrency,
      locale,
      format: (n: number) => formatCurrency(n, baseCurrency, locale),
      formatWhole: (n: number) => formatCurrencyWhole(n, baseCurrency, locale),
      formatCompact: (n: number) => formatCompactCurrency(n, baseCurrency, locale),
    }),
    [baseCurrency, locale],
  );
}
