import "server-only";

interface AskGeminiOptions {
  // Le chiamate secondarie (punteggi, meta SEO) degradano comunque a
  // default in caso di errore: farle riprovare su 429 spreca solo quota
  // preziosa sul piano gratuito senza un vero beneficio. Il contenuto
  // principale dell'articolo, invece, deve poter riprovare.
  retryOn429?: boolean;
  // Modello da usare al posto di quello standard (più leggero e veloce).
  model?: string;
  // 0 = niente "ragionamento" interno: risposta più veloce, utile quando
  // c'è un limite di tempo stretto (le route cron durano al massimo 60s).
  thinkingBudget?: number;
  // Interrompe la chiamata dopo questo tempo (errore, così il chiamante può
  // ripiegare su un altro modello).
  timeoutMs?: number;
}

// Il limite gratuito di gemini-2.5-flash è per RPD (richieste AL GIORNO,
// non al minuto): 20/giorno, esaurito dai test ripetuti durante lo
// sviluppo (confermato dalla pagina "Limite di frequenza" di Google AI
// Studio). gemini-2.5-flash-lite ha una quota giornaliera separata e
// intatta sullo stesso account: la usiamo finché quella di flash non si
// resetta (a mezzanotte ora del Pacifico).
const MODEL = "gemini-2.5-flash-lite";

// In precedenza qualsiasi errore (chiave mancante, modello non valido,
// contenuto bloccato dai filtri di sicurezza, quota esaurita...) veniva
// ignorato in silenzio restituendo una stringa vuota: gli articoli
// venivano pubblicati comunque, ma completamente vuoti. Ora ogni
// fallimento genera un errore esplicito che risale fino alla risposta
// dell'endpoint cron.
export async function askGemini(
  prompt: string,
  options: AskGeminiOptions = {},
  isRetry = false
): Promise<string> {
  const { retryOn429 = true, model = MODEL, thinkingBudget, timeoutMs } = options;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY non impostata");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(thinkingBudget !== undefined ? { generationConfig: { thinkingConfig: { thinkingBudget } } } : {}),
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

  if (!res.ok) {
    const message: string = data?.error?.message ?? `Gemini ha risposto con status ${res.status}`;
    const isRateLimit = res.status === 429;
    const isOverloaded = res.status === 503 || /overload|high demand/i.test(message);
    if ((isRateLimit || isOverloaded) && retryOn429 && !isRetry) {
      const match = message.match(/retry in ([\d.]+)s/i);
      const waitSeconds = match ? Math.min(45, parseFloat(match[1]) + 3) : isOverloaded ? 8 : 20;
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      return askGemini(prompt, options, true);
    }
    throw new Error(`Chiamata Gemini fallita: ${message}`);
  }

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Contenuto bloccato dai filtri Gemini: ${blockReason}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Risposta Gemini senza contenuto testuale: ${JSON.stringify(data).slice(0, 300)}`);
  }

  return text;
}
