# TravelWorld / WikiTravels — Blueprint di Ricostruzione

Questo documento è il "cervello" del progetto: dallo a Claude Code come prima cosa,
così ha tutto il contesto senza che tu debba rispiegare ogni volta.

---

## 1. Decisione architetturale chiave: Next.js, non Vite

Il progetto attuale (Base44) usa **React + Vite** come Single Page Application.
Per una SPA pura, Google indicizza male le pagine generate lato client — e il tuo
obiettivo (enciclopedia + pubblicità + traffico) **dipende al 100% dalla SEO**.

Quindi la ricostruzione usa:

- **Next.js 14 (App Router)** — permette rendering server-side (SSR) e statico (SSG)
  per gli articoli enciclopedia → Google li vede subito, indicizzazione rapida.
- **Vercel** per l'hosting — è il servizio creato dallo stesso team di Next.js,
  integrazione perfetta con GitHub (ogni push = deploy automatico).
- **Firebase** come backend: Auth, Firestore (database), Storage (immagini).
- Le pagine "social" (profilo, chat, feed) restano client-side (CSR) come oggi,
  quelle "enciclopedia" (articoli) sono SSG/ISR (rigenerate a intervalli, velocissime,
  ottime per SEO e Ads).

## 2. Cosa manteniamo dal progetto Base44

Tutta la logica di business descritta nella scheda tecnica resta valida:
- Match score, Haversine, badge, distribuzione date tappe, wizard viaggio.
- Cambia solo il "dove vivono i dati" (Firestore invece delle entità Base44) e
  il framework frontend (Next.js invece di Vite puro).

## 3. Cosa aggiungiamo: sezione Enciclopedia

Nuova collezione `articles` in Firestore, generata automaticamente:
- 1 articolo al giorno via cron (Vercel Cron Job).
- Rotazione intelligente: prima le mete più cercate (tier 1: Roma, Parigi, Bali...),
  poi mete medie (tier 2), poi di nicchia (tier 3) — così copriamo tanti long-tail
  keyword per intercettare più ricerche Google nel tempo.
- Ogni articolo ha: titolo SEO, meta description, contenuto HTML, immagini (Unsplash),
  7 punteggi interesse (per suggerire trip simili agli utenti), slug univoco.
- Pagine `/enciclopedia` (elenco) e `/enciclopedia/[slug]` (articolo, SSG+ISR).
- Sitemap XML generata automaticamente e aggiornata a ogni nuovo articolo.
- JSON-LD (dati strutturati "Article") in ogni pagina → Google mostra rich snippet.
- Slot pubblicitari (Google AdSense) predisposti nel layout articolo.

## 4. Repository — struttura consigliata

```
wikitravels/
├── app/                        # Next.js App Router
│   ├── (social)/                # gruppo route: profilo, feed, chat, viaggi
│   ├── enciclopedia/
│   │   ├── page.tsx              # elenco articoli
│   │   └── [slug]/page.tsx       # singolo articolo (SSG/ISR)
│   ├── api/
│   │   └── cron/generate-article/route.ts
│   └── sitemap.ts                # sitemap dinamica nativa Next.js
├── lib/
│   ├── firebase-admin.ts         # init Firebase Admin (server)
│   ├── firebase-client.ts        # init Firebase client (browser)
│   └── travel-utils.ts           # Haversine, badge, match score (porta da Base44)
├── scripts/
│   └── generate-article.ts       # generatore articolo (Gemini + Unsplash)
├── .env.example
├── .gitignore
├── vercel.json                   # config cron
└── package.json
```

## 5. Flusso di lavoro consigliato (GitHub + Claude Code + Vercel)

1. Crei una repo vuota su GitHub (es. `wikitravels`).
2. In locale (o direttamente con Claude Code): `git clone`, copi dentro questo scaffold.
3. Rigeneri le chiavi API (vedi avviso sicurezza) e le metti in `.env.local`
   (mai committato — è già in `.gitignore`).
4. Dai a Claude Code il file `CLAUDE_CODE_PROMPT.md` come istruzione iniziale:
   lui costruisce le pagine Next.js, i componenti, la migrazione dati.
5. Colleghi la repo GitHub a Vercel (Import Project) → ogni push su `main` = deploy.
6. Su Vercel aggiungi le stesse variabili d'ambiente di `.env.local`
   (Project Settings → Environment Variables).
7. Il cron su Vercel chiama `/api/cron/generate-article` una volta al giorno da solo.

## 6. Migrazione dati Base44 → Firestore

Vedi `firestore-schema.md` per la mappa completa entità → collezioni.
Se hai già viaggi/utenti reali su Base44, si esportano in JSON e si importano
con uno script una tantum (te lo preparo io/Claude Code quando siamo a quel punto).

## 7. Mobile-first — checklist che Claude Code deve rispettare sempre

- Layout con Tailwind, breakpoint mobile-first (`sm:`, `md:`, `lg:` come aggiunte,
  mai il contrario).
- Bottom navigation fissa su mobile (come già progettato), top navbar su desktop.
- Immagini con `next/image` (lazy loading + dimensioni ottimizzate automatiche).
- Font-size minimo 16px sui form (evita zoom automatico iOS).
- Aree tap minimo 44×44px.
- Test Lighthouse mobile per ogni pagina enciclopedia (obiettivo Performance >90).
