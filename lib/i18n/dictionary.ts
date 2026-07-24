import it from "./dictionaries/it";
import en from "./dictionaries/en";
import es from "./dictionaries/es";
import fr from "./dictionaries/fr";
import de from "./dictionaries/de";
import pt from "./dictionaries/pt";
import type { Locale } from "./config";
import type { Dictionary } from "./types";

const DICTIONARIES: Record<Locale, Dictionary> = { it, en, es, fr, de, pt };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? it;
}

export type { Dictionary };
