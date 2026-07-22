import "server-only";

interface AskGeminiOptions {
  // Le chiamate secondarie (punteggi, meta SEO) degradano comunque a
  // default in caso di errore: farle riprovare su 429 spreca solo quota
  // preziosa sul piano gratuito senza un vero beneficio. Il contenuto
  // principale dell'articolo, invece, deve poter riprovare.
  retryOn429?: boolean;
}

const PRIMARY_MODEL = "gemini-2.5-flash";
// Se il modello principale è limitato/sovraccarico, ritentiamo con un
// modello diverso: la quota gratuita è tracciata per modello, quindi ha
// buone probabilità di avere ancora margine anche quando il primo è
// esaurito.
const FALLBACK_MODEL = "gemini-2.0-flash";

async function callGemini(prompt: string, model: string): Promise<{ res: Response; data: any }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY non impostata");
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    }
  );
  const data = await res.json();
  return { res, data };
}

function extractText(data: any): string | null {
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// In precedenza qualsiasi errore (chiave mancante, modello non valido,
// contenuto bloccato dai filtri di sicurezza, quota esaurita...) veniva
// ignorato in silenzio restituendo una stringa vuota: gli articoli
// venivano pubblicati comunque, ma completamente vuoti. Ora ogni
// fallimento genera un errore esplicito che risale fino alla risposta
// dell'endpoint cron.
export async function askGemini(
  prompt: string,
  { retryOn429 = true }: AskGeminiOptions = {},
  model: string = PRIMARY_MODEL,
  isRetry = false
): Promise<string> {
  const { res, data } = await callGemini(prompt, model);

  if (!res.ok) {
    const message: string = data?.error?.message ?? `Gemini ha risposto con status ${res.status}`;
    // 429 = quota superata; 503/"high demand" = modello temporaneamente
    // sovraccarico lato Google. In entrambi i casi ritentiamo UNA volta,
    // passando al modello di riserva invece di ripetere sulla stessa
    // quota (probabilmente ancora esaurita subito dopo).
    const isRateLimit = res.status === 429;
    const isOverloaded = res.status === 503 || /overload|high demand/i.test(message);
    if ((isRateLimit || isOverloaded) && retryOn429 && !isRetry) {
      const match = message.match(/retry in ([\d.]+)s/i);
      const waitSeconds = isOverloaded ? 8 : match ? Math.min(15, parseFloat(match[1]) + 2) : 15;
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      const fallbackModel = model === PRIMARY_MODEL ? FALLBACK_MODEL : model;
      return askGemini(prompt, { retryOn429 }, fallbackModel, true);
    }
    throw new Error(`Chiamata Gemini fallita (modello ${model}): ${message}`);
  }

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Contenuto bloccato dai filtri Gemini: ${blockReason}`);
  }

  const text = extractText(data);
  if (!text) {
    throw new Error(`Risposta Gemini senza contenuto testuale: ${JSON.stringify(data).slice(0, 300)}`);
  }

  return text;
}
