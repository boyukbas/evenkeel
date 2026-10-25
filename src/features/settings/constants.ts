/** Shared option lists + small helpers for the Settings page. */

/** A handful of common locales for number/date formatting. */
export const COMMON_LOCALES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "it-IT", label: "Italian (Italy)" },
  { value: "nl-NL", label: "Dutch (Netherlands)" },
  { value: "tr-TR", label: "Turkish (Türkiye)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "sv-SE", label: "Swedish (Sweden)" },
  { value: "pl-PL", label: "Polish (Poland)" },
  { value: "ja-JP", label: "Japanese (Japan)" },
  { value: "en-IN", label: "English (India)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-CA", label: "English (Canada)" },
];

export const APP_NAME = "EvenKeel";
export const APP_VERSION = "0.1.0";

/** Local YYYY-MM-DD for backup filenames (built from the device clock). */
export function todayStamp(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
