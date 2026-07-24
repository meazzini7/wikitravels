import "server-only";
import { askGemini } from "./gemini";
import { LOCALE_GEMINI_NAME, type Locale } from "../i18n/config";
import type { ArticleTranslation } from "../types";

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

interface OriginalArticleContent {
  title: string;
  contentHtml: string;
  metaTitle: string;
  metaDescription: string;
}

// Traduce un articolo on-demand (solo quando qualcuno lo apre in una lingua
// per cui non esiste ancora una traduzione salvata). Due chiamate separate
// invece di una sola in JSON: il contenuto HTML è lungo e pieno di
// virgolette negli attributi, che romperebbero facilmente un JSON.parse.
export async function translateArticleContent(
  original: OriginalArticleContent,
  locale: Locale
): Promise<ArticleTranslation> {
  const languageName = LOCALE_GEMINI_NAME[locale];

  const metaPrompt = `Traduci in ${languageName} questi testi brevi di un articolo di viaggio. Rispondi ESATTAMENTE in questo formato, una riga per campo, senza aggiungere altro testo:
TITLE: <titolo tradotto>
META_TITLE: <meta title tradotto>
META_DESCRIPTION: <meta description tradotta>

Testi originali:
TITLE: ${original.title}
META_TITLE: ${original.metaTitle}
META_DESCRIPTION: ${original.metaDescription}`;

  const htmlPrompt = `Traduci in ${languageName} SOLO il testo leggibile del seguente HTML di un articolo di viaggio, mantenendo ESATTAMENTE la stessa struttura: stessi tag, stessi attributi, stessi link, stesso ordine, nessuna sezione aggiunta o rimossa. Non aggiungere commenti, markdown o testo extra: rispondi SOLO con l'HTML tradotto.

${original.contentHtml}`;

  const [metaRaw, contentHtmlRaw] = await Promise.all([
    askGemini(metaPrompt, { retryOn429: false }),
    askGemini(htmlPrompt, { retryOn429: false }),
  ]);

  const title = metaRaw.match(/TITLE:\s*(.+)/i)?.[1]?.trim() || original.title;
  const metaTitle = metaRaw.match(/META_TITLE:\s*(.+)/i)?.[1]?.trim() || original.metaTitle;
  const metaDescription = metaRaw.match(/META_DESCRIPTION:\s*(.+)/i)?.[1]?.trim() || original.metaDescription;
  const contentHtml = stripCodeFence(contentHtmlRaw);

  if (contentHtml.length < 200) {
    throw new Error(`Traduzione del contenuto troppo corta o vuota (${contentHtml.length} caratteri)`);
  }

  return { title, contentHtml, metaTitle, metaDescription };
}
