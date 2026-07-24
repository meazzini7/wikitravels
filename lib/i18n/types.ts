// Forma comune che ogni dizionario di lingua deve rispettare. Tenuta in un
// file separato (invece di derivarla con `typeof` dal dizionario italiano)
// perché con `as const` i valori diventerebbero literal type identici
// all'italiano, impedendo alle altre lingue di avere testi diversi.
export interface Dictionary {
  common: {
    save: string;
    saving: string;
    saved: string;
    cancel: string;
    back: string;
    next: string;
    loading: string;
    seeAll: string;
    login: string;
    register: string;
    logout: string;
  };
  nav: {
    encyclopedia: string;
    feed: string;
    trips: string;
    leaderboard: string;
    chat: string;
    notifications: string;
    login: string;
    register: string;
    logout: string;
  };
  bottomNav: {
    home: string;
    feed: string;
    notifications: string;
    leaderboard: string;
    trips: string;
    createTrip: string;
    profile: string;
  };
  language: {
    label: string;
  };
  home: {
    welcomeBack: string;
    heroGuestSubtitle: string;
    createTrip: string;
    startTraveling: string;
    exploreTrips: string;
    statPublicTrips: string;
    statCountriesReached: string;
    statTravelers: string;
    exploreFeedTitle: string;
    exploreFeedDesc: string;
    exploreLeaderboardTitle: string;
    exploreLeaderboardDesc: string;
    exploreEncyclopediaTitle: string;
    exploreEncyclopediaDesc: string;
    worldTitle: string;
    worldSubtitle: string;
    communityTripsTitle: string;
    seeAll: string;
    noTripsTitle: string;
    noTripsDescription: string;
    createFirstTrip: string;
    registerCta: string;
    registerCtaSuffix: string;
  };
  enciclopedia: {
    heroTitle: string;
    heroSubtitle: string;
    firstArticleSoon: string;
    recommendedTitle: string;
    relatedTitle: string;
    photoBy: string;
    onUnsplash: string;
    translatingNotice: string;
  };
}
