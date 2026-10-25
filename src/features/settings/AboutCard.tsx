import { Database, DownloadCloud, ShieldCheck } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { APP_NAME, APP_VERSION } from "./constants";

const POINTS = [
  {
    icon: Database,
    title: "Stored locally",
    text: "All your data lives in this browser's IndexedDB on this device. There is no account and no server.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing is uploaded",
    text: "Your expenses never leave your machine unless you choose to export them.",
  },
  {
    icon: DownloadCloud,
    title: "Back up periodically",
    text: "Clearing your browser data wipes everything. Export a backup now and then to stay safe.",
  },
];

export function AboutCard() {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>About & privacy</CardTitle>
          <CardDescription>A private, local-first expense tracker.</CardDescription>
        </div>
        <Badge variant="outline">
          {APP_NAME} {APP_VERSION}
        </Badge>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <h4 className="text-sm font-medium text-foreground">{title}</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
