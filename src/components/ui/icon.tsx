import {
  Baby, Banknote, Bike, Book, Briefcase, Bus, Camera, Car, Clapperboard, Coffee,
  CreditCard, Dumbbell, Fuel, Gamepad2, Gift, GraduationCap, HeartPulse, Home,
  Music, PawPrint, Pill, PiggyBank, Pizza, Plane, Plug, Receipt, Repeat,
  ShieldCheck, Shirt, ShoppingBag, ShoppingCart, Smartphone, Stethoscope, Tag,
  Train, Tv, Utensils, Wifi, Wine, Wrench,
} from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Category } from "@/types";

/**
 * Explicit registry of the icons categories can use. Importing them by name
 * (instead of `import * as`) keeps tree-shaking working — pulling ~40 icons
 * rather than the entire lucide set.
 */
const ICON_REGISTRY: Record<string, LucideIcon> = {
  Home, Plug, ShoppingCart, Car, ShieldCheck, HeartPulse, GraduationCap, Baby,
  Utensils, Coffee, Clapperboard, Repeat, Tv, Music, ShoppingBag, Plane, Gift,
  Receipt, Tag, Fuel, Bus, Train, Bike, Dumbbell, PawPrint, Wrench, Smartphone,
  Wifi, Banknote, CreditCard, PiggyBank, Stethoscope, Pill, Shirt, Wine, Pizza,
  Book, Gamepad2, Camera, Briefcase,
};

/** Resolve a category icon by name, falling back to a tag icon. */
export function getLucideIcon(name?: string | null): LucideIcon {
  return (name && ICON_REGISTRY[name]) || Tag;
}

export function DynamicIcon({ name, ...props }: { name?: string | null } & LucideProps) {
  const Icon = getLucideIcon(name);
  return <Icon {...props} />;
}

/** A category's icon tinted with its color in a soft rounded tile. */
export function CategoryIcon({
  category,
  size = "md",
  className,
}: {
  category: Pick<Category, "icon" | "color" | "name">;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = getLucideIcon(category.icon);
  const box = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const glyph = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-lg", box, className)}
      style={{ backgroundColor: `${category.color}22`, color: category.color }}
      aria-hidden
    >
      <Icon className={glyph} />
    </span>
  );
}

/** A curated set of icon names for the category editor picker. */
export const CATEGORY_ICON_CHOICES: string[] = Object.keys(ICON_REGISTRY);
