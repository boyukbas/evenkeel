import { useNavigate } from "react-router-dom";
import { Download, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { Brand } from "./Brand";
import { Button } from "@/components/ui";
import { useSettings } from "@/hooks/useData";
import { useThemeStore } from "@/store/theme";
import { promptInstall, usePwaStore } from "@/store/pwa";
import { useCommandPalette } from "@/store/commandPalette";
import { updateSettings } from "@/db/repo";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const settings = useSettings();
  const isDark = useThemeStore((s) => s.isDark);

  const canInstall = usePwaStore((s) => s.deferredPrompt !== null);
  const openPalette = useCommandPalette((s) => s.setOpen);

  const toggleTheme = () => {
    void updateSettings({ theme: isDark ? "light" : "dark" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden">
          <Brand />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => openPalette(true)}
          className="hidden h-9 items-center gap-2 rounded-lg border border-border px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
          <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">⌘K</kbd>
        </button>
        {canInstall && (
          <Button onClick={promptInstall} size="sm" variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Install</span>
          </Button>
        )}
        <Button onClick={() => navigate("/expenses?new=1")} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add expense</span>
        </Button>
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          title={settings.theme === "system" ? "Theme: System" : `Theme: ${settings.theme}`}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}
