import "server-only";

// In precedenza qualsiasi errore (chiave mancante, modello non valido,
// contenuto bloccato dai filtri di sicurezza, quota esaurita...) veniva
// ignorato in silenzio restituendo una stringa vuota: gli articoli
// venivano pubblicati comunque, ma completamente vuoti. Ora ogni
// fallimento genera un errore esplicito che risale fino alla risposta
// dell'endpoint cron.
//
// Il piano gratuito di Gemini limita le richieste al minuto: in caso di
// 429 riproviamo una sola volta, aspettando il tempo suggerito da Google
// nel messaggio d'errore (o un default), per non far fallire una
// generazione solo per un rate limit transitorio.
export async function askGemini(prompt: string, isRetry = false): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY non impostata");
  }

  const model = "gemini-2.5-flash";
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

  if (!res.ok) {
    const message: string = data?.error?.message ?? `Gemini ha risposto con status ${res.status}`;
    if (res.status === 429 && !isRetry) {
      const match = message.match(/retry in ([\d.]+)s/i);
      const waitSeconds = match ? Math.min(35, parseFloat(match[1]) + 2) : 20;
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      return askGemini(prompt, true);
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
