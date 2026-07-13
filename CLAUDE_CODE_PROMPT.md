# Istruzioni iniziali per Claude Code

Leggi prima `README-BLUEPRINT.md` e `firestore-schema.md` in questa cartella:
contengono tutto il contesto del progetto.

## Obiettivo
Ricostruire da zero "TravelWorld/WikiTravels", portale social per viaggiatori,
migrando da Base44 a: Next.js 14 (App Router) + Firebase (Auth/Firestore/Storage)
+ Vercel, mantenendo TUTTE le funzionalità già progettate (vedi scheda tecnica
allegata separatamente) e aggiungendo una sezione "Enciclopedia" SEO-first con
generazione automatica giornaliera di articoli.

## Ordine di lavoro consigliato
1. Inizializza il progetto Next.js 14 (TypeScript, App Router, Tailwind, ESLint).
2. Configura Firebase (client + admin SDK) leggendo le chiavi da variabili
   d'ambiente — MAI hardcoded. Usa `.env.example` come riferimento dei nomi.
3. Ricrea i componenti condivisi elencati nella scheda tecnica (Navbar, TripCard,
   WorldMap con react-leaflet, InterestSliders, ecc.) adattati a Next.js.
4. Implementa le pagine social (auth, profilo, viaggi, chat, notifiche,
   leaderboard) collegate a Firestore secondo `firestore-schema.md`.
5. Implementa la sezione enciclopedia:
   - `app/enciclopedia/page.tsx` — elenco con paginazione, SSG + ISR (revalidate 3600s)
   - `app/enciclopedia/[slug]/page.tsx` — articolo, SSG + ISR, JSON-LD Article,
     meta tag SEO dinamici da `generateMetadata`, slot pubblicitari predisposti
   - `app/sitemap.ts` — sitemap nativa Next.js che include tutti gli slug pubblicati
   - `app/robots.ts` — robots.txt che permette il crawling di /enciclopedia
6. Porta lo script `scripts/generate-article.ts` (già presente, da completare)
   e collegalo a `app/api/cron/generate-article/route.ts`, protetto da un
   header segreto (`CRON_SECRET`) così solo Vercel Cron può chiamarlo.
7. Ottimizza tutto mobile-first (vedi checklist nel blueprint).
8. Aggiungi Google Analytics / Search Console verification (placeholder env var).

## Vincoli
- Nessuna chiave API o segreto va mai scritto nel codice: solo `process.env.*`.
- Tutte le pagine enciclopedia devono passare Lighthouse mobile >90 su Performance e SEO.
- Componenti in TypeScript, niente `any` se evitabile.
- Commit piccoli e frequenti con messaggi chiari, così è facile fare rollback.
