import { useNavigate } from "react-router-dom";
import { PiggyBank } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";

interface SavingsBannerProps {
  monthly: number;
  annual: number;
  count: number;
}

export function SavingsBanner({ monthly, annual, count }: SavingsBannerProps) {
  const money = useMoney();
  const navigate = useNavigate();
  if (monthly <= 0) return null;

  return (
    <Card className="flex flex-col gap-4 overflow-hidden border-success/30 bg-success/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
          <PiggyBank className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-lg font-semibold leading-tight">
            You could free up ~<span className="text-success">{money.format(monthly)}</span>/mo
            <span className="text-muted-foreground"> · </span>
            <span className="text-success">{money.format(annual)}</span>/yr
          </p>
          <p className="text-sm text-muted-foreground">
            Across {count} non-essential {count === 1 ? "area" : "areas"} below. Earmark it before it slips away.
          </p>
        </div>
      </div>
      <Button variant="success" className="shrink-0" onClick={() => navigate("/savings")}>
        Turn this into a savings plan
      </Button>
    </Card>
  );
}
