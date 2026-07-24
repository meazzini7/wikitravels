import type { InterestScores } from "../interests";
import type { TripType } from "../trip-types";

export interface DemoStop {
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
  pois: { name: string; rating: number }[];
}

export interface DemoTrip {
  slug: string;
  authorUid: string;
  authorDisplayName: string;
  title: string;
  tripType: TripType;
  costEuro: number;
  visibility: "public";
  startDate: string;
  endDate: string;
  scores: InterestScores;
  coverQuery: string;
  stops: DemoStop[];
}

// Viaggi di esempio verosimili (con autori inventati) per popolare Feed e
// Classifica al lancio, cosi i primi visitatori trovano subito dei
// contenuti da guardare invece di un portale vuoto. Coordinate e punti di
// interesse sono reali; autori e date sono fittizi.
export const DEMO_TRIPS: DemoTrip[] = [
  {
    slug: "demo-firenze-toscana",
    authorUid: "demo-marco-rossi",
    authorDisplayName: "Marco Rossi",
    title: "Weekend a Firenze e dintorni",
    tripType: "coppia",
    costEuro: 600,
    visibility: "public",
    startDate: "2026-05-02",
    endDate: "2026-05-05",
    scores: { avventura: 2, cultura: 9, religione: 3, divertimento: 5, natura: 4, sport: 2 },
    coverQuery: "Florence Tuscany skyline",
    stops: [
      {
        name: "Firenze, Toscana",
        lat: 43.7696,
        lng: 11.2558,
        countryCode: "it",
        pois: [
          { name: "Duomo di Santa Maria del Fiore", rating: 9 },
          { name: "Galleria degli Uffizi", rating: 9 },
          { name: "Ponte Vecchio", rating: 8 },
        ],
      },
      {
        name: "Siena, Toscana",
        lat: 43.3188,
        lng: 11.3308,
        countryCode: "it",
        pois: [
          { name: "Piazza del Campo", rating: 9 },
          { name: "Duomo di Siena", rating: 8 },
        ],
      },
      {
        name: "San Gimignano, Toscana",
        lat: 43.4674,
        lng: 11.0431,
        countryCode: "it",
        pois: [{ name: "Torri medievali", rating: 8 }],
      },
    ],
  },
  {
    slug: "demo-portogallo-zaino",
    authorUid: "demo-giulia-bianchi",
    authorDisplayName: "Giulia Bianchi",
    title: "Zaino in spalla in Portogallo",
    tripType: "solo",
    costEuro: 900,
    visibility: "public",
    startDate: "2026-04-10",
    endDate: "2026-04-18",
    scores: { avventura: 7, cultura: 8, religione: 2, divertimento: 6, natura: 5, sport: 4 },
    coverQuery: "Lisbon Portugal street",
    stops: [
      {
        name: "Lisbona, Portogallo",
        lat: 38.7223,
        lng: -9.1393,
        countryCode: "pt",
        pois: [
          { name: "Torre di Belém", rating: 8 },
          { name: "Mosteiro dos Jerónimos", rating: 9 },
          { name: "Alfama", rating: 8 },
        ],
      },
      {
        name: "Porto, Portogallo",
        lat: 41.1579,
        lng: -8.6291,
        countryCode: "pt",
        pois: [
          { name: "Ribeira", rating: 9 },
          { name: "Livraria Lello", rating: 7 },
        ],
      },
      {
        name: "Sintra, Portogallo",
        lat: 38.8029,
        lng: -9.3817,
        countryCode: "pt",
        pois: [
          { name: "Palácio da Pena", rating: 9 },
          { name: "Quinta da Regaleira", rating: 9 },
        ],
      },
    ],
  },
  {
    slug: "demo-islanda-on-the-road",
    authorUid: "demo-alessandro-ferrari",
    authorDisplayName: "Alessandro Ferrari",
    title: "On the road in Islanda",
    tripType: "amici",
    costEuro: 2200,
    visibility: "public",
    startDate: "2026-06-15",
    endDate: "2026-06-23",
    scores: { avventura: 9, cultura: 4, religione: 1, divertimento: 5, natura: 10, sport: 6 },
    coverQuery: "Iceland landscape waterfall",
    stops: [
      {
        name: "Reykjavik, Islanda",
        lat: 64.1466,
        lng: -21.9426,
        countryCode: "is",
        pois: [{ name: "Hallgrímskirkja", rating: 7 }],
      },
      {
        name: "Vik, Islanda",
        lat: 63.4186,
        lng: -19.006,
        countryCode: "is",
        pois: [{ name: "Spiaggia nera di Reynisfjara", rating: 9 }],
      },
      {
        name: "Jökulsárlón, Islanda",
        lat: 64.0784,
        lng: -16.23,
        countryCode: "is",
        pois: [{ name: "Laguna dei ghiacciai", rating: 10 }],
      },
    ],
  },
  {
    slug: "demo-maldive-luna-di-miele",
    authorUid: "demo-francesca-colombo",
    authorDisplayName: "Francesca Colombo",
    title: "Luna di miele alle Maldive",
    tripType: "coppia",
    costEuro: 3500,
    visibility: "public",
    startDate: "2026-03-01",
    endDate: "2026-03-08",
    scores: { avventura: 3, cultura: 2, religione: 1, divertimento: 7, natura: 9, sport: 5 },
    coverQuery: "Maldives overwater bungalow",
    stops: [
      {
        name: "Malé, Maldive",
        lat: 4.1755,
        lng: 73.5093,
        countryCode: "mv",
        pois: [{ name: "Moschea del Venerdì", rating: 6 }],
      },
      {
        name: "Maafushi, Maldive",
        lat: 3.9415,
        lng: 73.4903,
        countryCode: "mv",
        pois: [
          { name: "Spiaggia bikini", rating: 9 },
          { name: "Snorkeling con gli squali", rating: 9 },
        ],
      },
    ],
  },
  {
    slug: "demo-patagonia-trekking",
    authorUid: "demo-luca-romano",
    authorDisplayName: "Luca Romano",
    title: "Trekking in Patagonia",
    tripType: "amici",
    costEuro: 3000,
    visibility: "public",
    startDate: "2026-11-05",
    endDate: "2026-11-16",
    scores: { avventura: 10, cultura: 3, religione: 1, divertimento: 4, natura: 9, sport: 8 },
    coverQuery: "Patagonia mountains glacier",
    stops: [
      {
        name: "El Calafate, Argentina",
        lat: -50.3379,
        lng: -72.2648,
        countryCode: "ar",
        pois: [{ name: "Ghiacciaio Perito Moreno", rating: 10 }],
      },
      {
        name: "Torres del Paine, Cile",
        lat: -50.9423,
        lng: -73.4068,
        countryCode: "cl",
        pois: [{ name: "Trekking delle Torri", rating: 10 }],
      },
      {
        name: "Ushuaia, Argentina",
        lat: -54.8019,
        lng: -68.303,
        countryCode: "ar",
        pois: [
          { name: "Canale di Beagle", rating: 8 },
          { name: "Parco Nazionale Tierra del Fuego", rating: 8 },
        ],
      },
    ],
  },
  {
    slug: "demo-puglia-enogastronomico",
    authorUid: "demo-chiara-ricci",
    authorDisplayName: "Chiara Ricci",
    title: "Tour enogastronomico in Puglia",
    tripType: "famiglia",
    costEuro: 800,
    visibility: "public",
    startDate: "2026-08-10",
    endDate: "2026-08-15",
    scores: { avventura: 3, cultura: 7, religione: 3, divertimento: 8, natura: 5, sport: 3 },
    coverQuery: "Puglia Italy trulli",
    stops: [
      {
        name: "Bari, Puglia",
        lat: 41.1171,
        lng: 16.8719,
        countryCode: "it",
        pois: [
          { name: "Basilica di San Nicola", rating: 7 },
          { name: "Bari Vecchia", rating: 8 },
        ],
      },
      {
        name: "Alberobello, Puglia",
        lat: 40.7845,
        lng: 17.2378,
        countryCode: "it",
        pois: [{ name: "Trulli", rating: 9 }],
      },
      {
        name: "Polignano a Mare, Puglia",
        lat: 40.9963,
        lng: 17.2196,
        countryCode: "it",
        pois: [{ name: "Centro storico a picco sul mare", rating: 9 }],
      },
      {
        name: "Lecce, Puglia",
        lat: 40.3515,
        lng: 18.175,
        countryCode: "it",
        pois: [
          { name: "Basilica di Santa Croce", rating: 8 },
          { name: "Anfiteatro romano", rating: 7 },
        ],
      },
    ],
  },
  {
    slug: "demo-praga-low-cost",
    authorUid: "demo-davide-marino",
    authorDisplayName: "Davide Marino",
    title: "Weekend low cost a Praga",
    tripType: "solo",
    costEuro: 350,
    visibility: "public",
    startDate: "2026-02-14",
    endDate: "2026-02-16",
    scores: { avventura: 3, cultura: 8, religione: 2, divertimento: 6, natura: 2, sport: 2 },
    coverQuery: "Prague old town",
    stops: [
      {
        name: "Praga, Repubblica Ceca",
        lat: 50.0755,
        lng: 14.4378,
        countryCode: "cz",
        pois: [
          { name: "Ponte Carlo", rating: 9 },
          { name: "Castello di Praga", rating: 9 },
          { name: "Orologio Astronomico", rating: 8 },
        ],
      },
    ],
  },
  {
    slug: "demo-marocco-avventura",
    authorUid: "demo-sara-greco",
    authorDisplayName: "Sara Greco",
    title: "In giro per il Marocco",
    tripType: "amici",
    costEuro: 1100,
    visibility: "public",
    startDate: "2026-09-20",
    endDate: "2026-09-28",
    scores: { avventura: 8, cultura: 9, religione: 4, divertimento: 5, natura: 5, sport: 3 },
    coverQuery: "Marrakech Morocco souk",
    stops: [
      {
        name: "Marrakech, Marocco",
        lat: 31.6295,
        lng: -7.9811,
        countryCode: "ma",
        pois: [
          { name: "Piazza Jemaa el-Fna", rating: 9 },
          { name: "Giardino Majorelle", rating: 8 },
          { name: "Souk", rating: 8 },
        ],
      },
      {
        name: "Fes, Marocco",
        lat: 34.0181,
        lng: -5.0078,
        countryCode: "ma",
        pois: [
          { name: "Medina di Fes el Bali", rating: 9 },
          { name: "Concerie Chouara", rating: 7 },
        ],
      },
      {
        name: "Merzouga, Marocco",
        lat: 31.0801,
        lng: -4.0133,
        countryCode: "ma",
        pois: [
          { name: "Dune di Erg Chebbi", rating: 9 },
          { name: "Notte in tenda berbera", rating: 9 },
        ],
      },
    ],
  },
  {
    slug: "demo-new-york-capodanno",
    authorUid: "demo-matteo-bruno",
    authorDisplayName: "Matteo Bruno",
    title: "Capodanno a New York",
    tripType: "amici",
    costEuro: 2000,
    visibility: "public",
    startDate: "2025-12-28",
    endDate: "2026-01-02",
    scores: { avventura: 4, cultura: 6, religione: 1, divertimento: 9, natura: 2, sport: 3 },
    coverQuery: "New York City skyline",
    stops: [
      {
        name: "New York, USA",
        lat: 40.7128,
        lng: -74.006,
        countryCode: "us",
        pois: [
          { name: "Times Square", rating: 8 },
          { name: "Central Park", rating: 8 },
          { name: "Statua della Libertà", rating: 7 },
        ],
      },
    ],
  },
  {
    slug: "demo-cammino-di-santiago",
    authorUid: "demo-elena-gallo",
    authorDisplayName: "Elena Gallo",
    title: "Cammino di Santiago",
    tripType: "solo",
    costEuro: 500,
    visibility: "public",
    startDate: "2026-05-20",
    endDate: "2026-05-27",
    scores: { avventura: 4, cultura: 5, religione: 9, divertimento: 2, natura: 6, sport: 7 },
    coverQuery: "Camino de Santiago path",
    stops: [
      {
        name: "Sarria, Spagna",
        lat: 42.777,
        lng: -7.4143,
        countryCode: "es",
        pois: [{ name: "Tappa iniziale del Cammino", rating: 8 }],
      },
      {
        name: "Santiago de Compostela, Spagna",
        lat: 42.8805,
        lng: -8.5456,
        countryCode: "es",
        pois: [{ name: "Cattedrale di Santiago", rating: 10 }],
      },
    ],
  },
  {
    slug: "demo-bali-sportiva",
    authorUid: "demo-simone-conti",
    authorDisplayName: "Simone Conti",
    title: "Vacanza sportiva a Bali",
    tripType: "coppia",
    costEuro: 1600,
    visibility: "public",
    startDate: "2026-07-01",
    endDate: "2026-07-10",
    scores: { avventura: 6, cultura: 4, religione: 3, divertimento: 6, natura: 8, sport: 7 },
    coverQuery: "Bali rice terrace",
    stops: [
      {
        name: "Ubud, Indonesia",
        lat: -8.5069,
        lng: 115.2625,
        countryCode: "id",
        pois: [
          { name: "Risaie di Tegallalang", rating: 9 },
          { name: "Tempio delle Scimmie", rating: 7 },
        ],
      },
      {
        name: "Canggu, Indonesia",
        lat: -8.6478,
        lng: 115.1385,
        countryCode: "id",
        pois: [
          { name: "Spiaggia di Batu Bolong", rating: 8 },
          { name: "Surf", rating: 8 },
        ],
      },
      {
        name: "Nusa Penida, Indonesia",
        lat: -8.7276,
        lng: 115.5444,
        countryCode: "id",
        pois: [{ name: "Kelingking Beach", rating: 10 }],
      },
    ],
  },
  {
    slug: "demo-sicilia-famiglia",
    authorUid: "demo-valentina-de-luca",
    authorDisplayName: "Valentina De Luca",
    title: "Sicilia in famiglia",
    tripType: "famiglia",
    costEuro: 1200,
    visibility: "public",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    scores: { avventura: 3, cultura: 8, religione: 3, divertimento: 6, natura: 7, sport: 3 },
    coverQuery: "Sicily Italy coast",
    stops: [
      {
        name: "Palermo, Sicilia",
        lat: 38.1157,
        lng: 13.3615,
        countryCode: "it",
        pois: [
          { name: "Mercato del Capo", rating: 8 },
          { name: "Cattedrale di Palermo", rating: 7 },
        ],
      },
      {
        name: "Cefalù, Sicilia",
        lat: 38.04,
        lng: 14.0225,
        countryCode: "it",
        pois: [{ name: "Spiaggia e Duomo", rating: 8 }],
      },
      {
        name: "Taormina, Sicilia",
        lat: 37.8525,
        lng: 15.289,
        countryCode: "it",
        pois: [{ name: "Teatro Antico", rating: 9 }],
      },
      {
        name: "Siracusa, Sicilia",
        lat: 37.0755,
        lng: 15.2866,
        countryCode: "it",
        pois: [
          { name: "Ortigia", rating: 9 },
          { name: "Orecchio di Dionisio", rating: 7 },
        ],
      },
    ],
  },
  {
    slug: "demo-giappone-cultura",
    authorUid: "demo-andrea-barbieri",
    authorDisplayName: "Andrea Barbieri",
    title: "Alla scoperta del Giappone",
    tripType: "solo",
    costEuro: 2500,
    visibility: "public",
    startDate: "2026-04-01",
    endDate: "2026-04-10",
    scores: { avventura: 4, cultura: 10, religione: 4, divertimento: 5, natura: 5, sport: 2 },
    coverQuery: "Kyoto Japan temple",
    stops: [
      {
        name: "Tokyo, Giappone",
        lat: 35.6762,
        lng: 139.6503,
        countryCode: "jp",
        pois: [
          { name: "Shibuya Crossing", rating: 8 },
          { name: "Tempio Senso-ji", rating: 8 },
        ],
      },
      {
        name: "Kyoto, Giappone",
        lat: 35.0116,
        lng: 135.7681,
        countryCode: "jp",
        pois: [
          { name: "Fushimi Inari", rating: 9 },
          { name: "Kinkaku-ji", rating: 9 },
        ],
      },
      {
        name: "Osaka, Giappone",
        lat: 34.6937,
        lng: 135.5023,
        countryCode: "jp",
        pois: [
          { name: "Castello di Osaka", rating: 8 },
          { name: "Dotonbori", rating: 8 },
        ],
      },
    ],
  },
  {
    slug: "demo-umbria-spirituale",
    authorUid: "demo-federica-fontana",
    authorDisplayName: "Federica Fontana",
    title: "Weekend spirituale in Umbria",
    tripType: "coppia",
    costEuro: 250,
    visibility: "public",
    startDate: "2026-03-20",
    endDate: "2026-03-22",
    scores: { avventura: 1, cultura: 7, religione: 9, divertimento: 2, natura: 4, sport: 1 },
    coverQuery: "Assisi Italy hills",
    stops: [
      {
        name: "Assisi, Umbria",
        lat: 43.0707,
        lng: 12.6197,
        countryCode: "it",
        pois: [{ name: "Basilica di San Francesco", rating: 10 }],
      },
      {
        name: "Orvieto, Umbria",
        lat: 42.7186,
        lng: 12.1088,
        countryCode: "it",
        pois: [{ name: "Duomo di Orvieto", rating: 9 }],
      },
    ],
  },
  {
    slug: "demo-kenya-safari",
    authorUid: "demo-riccardo-villa",
    authorDisplayName: "Riccardo Villa",
    title: "Safari in Kenya",
    tripType: "amici",
    costEuro: 2800,
    visibility: "public",
    startDate: "2026-10-05",
    endDate: "2026-10-13",
    scores: { avventura: 9, cultura: 3, religione: 1, divertimento: 4, natura: 10, sport: 4 },
    coverQuery: "Kenya safari savanna",
    stops: [
      {
        name: "Nairobi, Kenya",
        lat: -1.2921,
        lng: 36.8219,
        countryCode: "ke",
        pois: [{ name: "Nairobi National Park", rating: 7 }],
      },
      {
        name: "Masai Mara, Kenya",
        lat: -1.4061,
        lng: 35.0058,
        countryCode: "ke",
        pois: [{ name: "Safari fotografico", rating: 10 }],
      },
    ],
  },
];
