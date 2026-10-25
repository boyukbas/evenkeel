import { PageHeader } from "@/components/layout";
import { PreferencesCard } from "./PreferencesCard";
import { CategoriesCard } from "./CategoriesCard";
import { DataBackupCard } from "./DataBackupCard";
import { AboutCard } from "./AboutCard";

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Preferences, categories, and your data — all stored privately on this device."
      />
      <div className="mx-auto max-w-4xl space-y-6">
        <PreferencesCard />
        <CategoriesCard />
        <DataBackupCard />
        <AboutCard />
      </div>
    </div>
  );
}
