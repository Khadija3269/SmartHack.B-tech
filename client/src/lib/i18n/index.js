import { AR } from "./ar.js";
import { FR } from "./fr.js";
import { translateWith } from "./translator.js";

// To add another language: create xx.js with the same keys and register it here.
export const DICTIONARIES = { Arabic: AR, French: FR };

export function translate(language, text) {
  return translateWith(DICTIONARIES[language], text);
}
