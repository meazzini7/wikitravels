import "server-only";
import { GoogleAuth } from "google-auth-library";
import { loadCredential } from "../firebase-admin";

// Legge i dati di Google Analytics 4 (Data API) riusando il service account
// già configurato per Firebase Admin: serve solo (1) abilitare la "Google
// Analytics Data API" nel progetto Google Cloud, (2) aggiungere l'email del
// service account come Visualizzatore nella proprietà GA4, (3) impostare
// GA4_PROPERTY_ID su Vercel. Nessun nuovo segreto da gestire.

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export interface GaReportRequest {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  dimensionFilter?: unknown;
  orderBys?: unknown[];
  limit?: number;
}

export interface GaReportRow {
  dimensions: string[];
  metrics: number[];
}

export class GaNotConfiguredError extends Error {
  constructor() {
    super("GA4_PROPERTY_ID non configurata su Vercel.");
    this.name = "GaNotConfiguredError";
  }
}

function getPropertyId(): string | null {
  const digits = (process.env.GA4_PROPERTY_ID ?? "").replace(/\D/g, "");
  return digits || null;
}

export function isGaConfigured(): boolean {
  return getPropertyId() !== null;
}

// L'email del service account non è un segreto (è un indirizzo, non una
// chiave): si mostra nel pannello admin così non serve andarla a cercare.
export function getServiceAccountEmail(): string | null {
  try {
    return loadCredential().clientEmail ?? null;
  } catch {
    return null;
  }
}

let cachedAuth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (cachedAuth) return cachedAuth;
  const cred = loadCredential();
  cachedAuth = new GoogleAuth({
    credentials: { client_email: cred.clientEmail, private_key: cred.privateKey },
    scopes: [SCOPE],
  });
  return cachedAuth;
}

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return e.response?.data?.error?.message ?? e.message ?? "Errore sconosciuto";
}

export async function runGaReport(request: GaReportRequest): Promise<GaReportRow[]> {
  const propertyId = getPropertyId();
  if (!propertyId) throw new GaNotConfiguredError();

  try {
    const client = await getAuth().getClient();
    const res = await client.request<{
      rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
    }>({
      url: `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      method: "POST",
      data: request,
    });
    return (res.data.rows ?? []).map((row) => ({
      dimensions: (row.dimensionValues ?? []).map((d) => d.value),
      metrics: (row.metricValues ?? []).map((m) => Number(m.value) || 0),
    }));
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}
