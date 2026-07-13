# Schema Firestore — mappa da Base44

| Entità Base44 | Collezione Firestore | Note |
|---|---|---|
| `User` (auth) | Firebase Auth | Nativo, non serve collezione |
| `UserProfile` | `users/{uid}` | Stesso doc id dell'utente Auth |
| `Trip` | `trips/{tripId}` | campo `authorId` invece di `author_name` |
| `TripStop` | `trips/{tripId}/stops/{stopId}` | sotto-collezione, niente più FK `trip_id` |
| `Follow` | `follows/{followerId}_{followingId}` | id composito → lettura/scrittura O(1) |
| `ChatMessage` | `chats/{conversationKey}/messages/{msgId}` | conversationKey = id ordinati uniti |
| `Notification` | `users/{uid}/notifications/{notifId}` | sotto-collezione utente |
| — (nuovo) | `articles/{articleId}` | enciclopedia, vedi sotto |

## Nuova collezione: `articles`

```ts
{
  title: string
  slug: string                 // univoco, usato nell'URL
  destination: string          // es. "Roma"
  vibe: string                 // es. "guida segreta"
  contentHtml: string
  coverImageUrl: string
  coverImageCredit: { author: string, link: string }
  scores: {                    // 1-10, usati per il match con gli interessi utente
    avventura: number, natura: number, divertimento: number,
    lusso: number, storia: number, shopping: number, religione: number
  }
  tier: 1 | 2 | 3               // 1 = meta popolare, 3 = nicchia (per rotazione SEO)
  seo: { metaTitle: string, metaDescription: string }
  status: "published" | "draft"
  views: number
  createdAt: Timestamp
}
```

Indice consigliato: `status ASC, createdAt DESC` (per l'elenco enciclopedia)
e `slug ASC` (univocità, già garantita se usi lo slug come document id).

**Suggerimento:** usa lo `slug` come ID del documento stesso (invece di un id
random) — eviti una query per il controllo duplicati ed è più veloce da leggere.
