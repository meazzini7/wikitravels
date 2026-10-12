// Per i pochi punti in cui si compone HTML a mano (es. la pagina di ritorno
// OAuth): ogni valore dinamico va passato da qui, anche se sembra innocuo.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
