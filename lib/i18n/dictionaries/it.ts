import type { Dictionary } from "../types";

// Dizionario di riferimento (italiano). Aggiunto un pezzo alla volta, man
// mano che le pagine vengono collegate al sistema di traduzione.
const it: Dictionary = {
  common: {
    save: "Salva",
    saving: "Salvataggio...",
    saved: "Salvato ✓",
    cancel: "Annulla",
    back: "Indietro",
    next: "Avanti",
    loading: "Caricamento...",
    seeAll: "Vedi tutti",
    login: "Accedi",
    register: "Registrati",
    logout: "Esci",
  },
  nav: {
    encyclopedia: "📖 Enciclopedia",
    feed: "🧭 Feed",
    trips: "🧳 Viaggi",
    leaderboard: "🏆 Classifica",
    chat: "💬 Chat",
    notifications: "Notifiche",
    login: "Accedi",
    register: "Registrati",
    logout: "Esci",
  },
  bottomNav: {
    home: "Home",
    feed: "Feed",
    notifications: "Notifiche",
    leaderboard: "Classifica",
    trips: "Viaggi",
    createTrip: "Crea nuovo viaggio",
  },
  language: {
    label: "Lingua",
  },
  home: {
    welcomeBack: "Bentornato, {name}! Ecco cosa succede nel mondo di WikiTravels oggi.",
    heroGuestSubtitle:
      "Costruisci il tuo prossimo viaggio a bottoni, scopri quelli della community e sfida gli amici a km percorsi. Zero noia, tutto interattivo.",
    createTrip: "✚ Crea un viaggio",
    startTraveling: "🚀 Inizia a viaggiare",
    exploreTrips: "🧭 Esplora viaggi",
    statPublicTrips: "Viaggi pubblici",
    statCountriesReached: "Nazioni raggiunte",
    statTravelers: "Viaggiatori",
    exploreFeedTitle: "Feed",
    exploreFeedDesc: "Viaggi in linea con i tuoi gusti",
    exploreLeaderboardTitle: "Classifica",
    exploreLeaderboardDesc: "Chi ha percorso più km",
    exploreEncyclopediaTitle: "Enciclopedia",
    exploreEncyclopediaDesc: "Guide di destinazione",
    worldTitle: "🗺️ Il mondo di WikiTravels",
    worldSubtitle: "Nazioni colorate in base al numero di viaggi pubblici pubblicati.",
    communityTripsTitle: "✨ Viaggi della community",
    seeAll: "Vedi tutti →",
    noTripsTitle: "Nessun viaggio pubblico ancora",
    noTripsDescription: "Sii il primo a pubblicare un'avventura sulla mappa!",
    createFirstTrip: "✚ Crea il primo viaggio",
    registerCta: "Registrati",
    registerCtaSuffix: "per vedere tappe, mappe e dettagli completi di ogni viaggio.",
  },
  enciclopedia: {
    heroTitle: "📖 Enciclopedia dei viaggi",
    heroSubtitle: "Guide di destinazioni generate e aggiornate ogni giorno, per ispirare il tuo prossimo viaggio.",
    firstArticleSoon: "Il primo articolo arriva a breve",
    recommendedTitle: "🎯 Consigliati per te",
    relatedTitle: "📚 Articoli correlati",
    photoBy: "Foto di",
    onUnsplash: "su Unsplash",
    translatingNotice: "Questo articolo è stato tradotto automaticamente.",
  },
};

export default it;
