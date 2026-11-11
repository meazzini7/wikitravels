// Lettura della struttura di un articolo (HTML generato, vedi
// scripts/generate-article.ts) per mostrarne l'indice e descrivere a Google
// le domande frequenti. Funzioni pure: nessun accesso a rete o database.

export type TocItem = { id: string; text: string };
export type FaqItem = { question: string; answer: string };

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function toPlainText(html: string): string {
  return html
    // I tag "in linea" (grassetto, corsivo, link...) spariscono senza lasciare
    // spazi, altrimenti "<em>Lisbona</em>?" diventerebbe "Lisbona ?".
    .replace(/<\/?(?:b|i|em|strong|a|span|u|small|sup|sub|code|mark)(?:\s[^>]*)?>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// Aggiunge un id a ogni <h2> (per i link dell'indice) e restituisce indice e
// domande frequenti. Le domande sono i <h3> che finiscono con "?" seguiti
// subito da un <p>: così funziona anche sugli articoli tradotti.
export function enhanceArticleHtml(html: string): { html: string; toc: TocItem[]; faq: FaqItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();

  const withIds = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (match, attrs: string | undefined, inner: string) => {
    const text = toPlainText(inner);
    if (!text) return match;
    const existing = attrs?.match(/\sid\s*=\s*["']([^"']+)["']/i)?.[1];
    let id = existing ?? `s-${slugify(text) || "sezione"}`;
    if (!existing) {
      const base = id;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    }
    used.add(id);
    toc.push({ id, text });
    return existing ? match : `<h2${attrs ?? ""} id="${id}">${inner}</h2>`;
  });

  const faq: FaqItem[] = [];
  for (const m of withIds.matchAll(/<h3(?:\s[^>]*)?>([\s\S]*?)<\/h3>\s*<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)) {
    const question = toPlainText(m[1]);
    const answer = toPlainText(m[2]);
    if (question.endsWith("?") && answer) faq.push({ question, answer });
  }

  return { html: withIds, toc, faq };
}

// JSON-LD da inserire in un <script>: "<" va scritto come <, altrimenti un
// testo che contiene "</script>" chiuderebbe il tag e verrebbe eseguito.
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export type ArticleCard = {
  slug: string;
  title: string;
  destination: string;
  vibe: string;
  coverImageUrl: string | null;
  description: string;
};

// Articoli correlati: prima quelli sulla stessa destinazione, poi quelli con
// lo stesso tipo di viaggio, poi i più recenti. `cards` è già ordinato dal più
// recente.
export function pickRelated(cards: ArticleCard[], current: { slug: string; destination: string; vibe: string }, count = 3): ArticleCard[] {
  const others = cards.filter((c) => c.slug !== current.slug);
  const sameDestination = others.filter((c) => c.destination === current.destination);
  const sameVibe = others.filter((c) => c.vibe === current.vibe && c.destination !== current.destination);
  const rest = others.filter((c) => c.destination !== current.destination && c.vibe !== current.vibe);
  return [...sameDestination, ...sameVibe, ...rest].slice(0, count);
}
