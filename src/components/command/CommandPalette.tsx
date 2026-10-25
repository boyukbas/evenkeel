import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Download, FileText, Moon, Plus, Search, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav";
import { useThemeStore } from "@/store/theme";
import { useCommandPalette } from "@/store/commandPalette";
import { exportData, updateSettings } from "@/db/repo";
import { downloadFile } from "@/lib/csv";
import { toast } from "@/store/toast";
import { cn } from "@/lib/cn";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

export function CommandPalette() {
  const { open, setOpen, toggle } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.isDark);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcuts: ⌘/Ctrl-K toggles the palette; "n" quick-adds an expense.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      } else if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target) && !useCommandPalette.getState().open) {
        e.preventDefault();
        navigate("/expenses?new=1");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, navigate]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const close = () => setOpen(false);
    const nav = NAV_ITEMS.map((n) => ({
      id: `nav:${n.to}`,
      label: `Go to ${n.label}`,
      icon: n.icon,
      run: () => {
        navigate(n.to);
        close();
      },
    }));
    const actions: Command[] = [
      { id: "add", label: "Add expense", hint: "N", icon: Plus, run: () => { navigate("/expenses?new=1"); close(); } },
      { id: "report", label: "Open monthly report", icon: FileText, run: () => { navigate("/report"); close(); } },
      {
        id: "theme",
        label: `Switch to ${isDark ? "light" : "dark"} theme`,
        icon: isDark ? Sun : Moon,
        run: () => { void updateSettings({ theme: isDark ? "light" : "dark" }); close(); },
      },
      {
        id: "export",
        label: "Export backup (JSON)",
        icon: Download,
        run: async () => {
          const data = await exportData();
          downloadFile("evenkeel-backup.json", JSON.stringify(data, null, 2), "application/json");
          toast.success("Backup exported");
          close();
        },
      },
    ];
    return [...nav, ...actions];
  }, [navigate, isDark, setOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
      <div className="ek-animate-in relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matching commands</li>
          ) : (
            filtered.map((c, i) => (
              <li key={c.id}>
                <button
                  onMouseMove={() => setActive(i)}
                  onClick={() => c.run()}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    i === active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
                  )}
                >
                  <c.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{c.label}</span>
                  {c.hint && <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">{c.hint}</kbd>}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
