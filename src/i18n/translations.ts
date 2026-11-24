import type { LanguageCode } from '../types/agrismart';

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  fr: 'Français',
  ln: 'Lingala',
  sw: 'Kiswahili',
  kg: 'Kikongo',
  lua: 'Tshiluba',
};

interface TranslationPack {
  slogan: string;
  startBtn: string;
  next: string;
  skip: string;
  login: string;
  register: string;
  navHome: string;
  navMarket: string;
  navPublish: string;
  navMessages: string;
  navProfile: string;
  modulesMenu: string;
  welcomeGreeting: string;
  searchPlaceholder: string;
  offlineBanner: string;
  onlineReady: string;
  quickActions: string;
  recentProducts: string;
  referencePrices: string;
  tipOfDayTitle: string;
}

export const TRANSLATIONS: Record<LanguageCode, TranslationPack> = {
  fr: {
    slogan: 'La technologie au service de l’agriculture congolaise',
    startBtn: 'Commencer',
    next: 'Suivant',
    skip: 'Passer',
    login: 'Se connecter',
    register: 'Créer un compte',
    navHome: 'Accueil',
    navMarket: 'Marché',
    navPublish: 'Publier',
    navMessages: 'Messages',
    navProfile: 'Profil',
    modulesMenu: 'Tous les modules',
    welcomeGreeting: 'Bonjour',
    searchPlaceholder: 'Rechercher manioc, maïs, semences, tracteur...',
    offlineBanner: 'Mode hors connexion — Données locales et file de synchronisation actives.',
    onlineReady: 'Connecté',
    quickActions: 'Accès rapide',
    recentProducts: 'Produits récemment publiés',
    referencePrices: 'Prix indicatifs des marchés (RDC)',
    tipOfDayTitle: 'Conseil agricole du jour',
  },
  ln: {
    slogan: 'Teknolozi mpo na kosalisa bilanga ya Kongo',
    startBtn: 'Kobanda',
    next: 'Landá',
    skip: 'Koleka',
    login: 'Kokɔta',
    register: 'Kofungola kɔnti',
    navHome: 'Ndako',
    navMarket: 'Zando',
    navPublish: 'Kotia na zando',
    navMessages: 'Bansango',
    navProfile: 'Profil',
    modulesMenu: 'Bisaleli nyonso',
    welcomeGreeting: 'Mbote',
    searchPlaceholder: 'Koluka nsongo, masangu, mboto, traktɛrɛ...',
    offlineBanner: 'Ozali na internet te — Makambo ebombami na telefone.',
    onlineReady: 'Internet ezali',
    quickActions: 'Bisaleli ya mbangu',
    recentProducts: 'Biloko ya sika na zando',
    referencePrices: 'Ntalo ya biloko na bazando',
    tipOfDayTitle: 'Toli ya bilanga ya lelo',
  },
  sw: {
    slogan: 'Teknolojia kwa huduma ya kilimo cha Kongo',
    startBtn: 'Anza',
    next: 'Endelea',
    skip: 'Ruka',
    login: 'Ingia',
    register: 'Fungua akaunti',
    navHome: 'Nyumbani',
    navMarket: 'Soko',
    navPublish: 'Tangaza',
    navMessages: 'Ujumbe',
    navProfile: 'Wasifu',
    modulesMenu: 'Moduli zote',
    welcomeGreeting: 'Jambo',
    searchPlaceholder: 'Tafuta muhogo, mahindi, mbegu, trekta...',
    offlineBanner: 'Hali ya nje ya mtandao — Data ya ndani inatumika.',
    onlineReady: 'Mtandaoni',
    quickActions: 'Ufikiaji wa haraka',
    recentProducts: 'Mazao mapya sokoni',
    referencePrices: 'Bei elekezi za masoko (DRC)',
    tipOfDayTitle: 'Ushauri wa kilimo wa leo',
  },
  kg: {
    slogan: 'Teknolozi mu sadisa kisalu kia bilanga mu Kongo',
    startBtn: 'Yantika',
    next: 'Landa',
    skip: 'Vioka',
    login: 'Kota',
    register: 'Zibula konti',
    navHome: 'Nzo',
    navMarket: 'Zandu',
    navPublish: 'Sonika',
    navMessages: 'Nsangu',
    navProfile: 'Profil',
    modulesMenu: 'Bisalu biakaka',
    welcomeGreeting: 'Mbote',
    searchPlaceholder: 'Sosa mayaka, masa, nkeni, kamio...',
    offlineBanner: 'Kena internet ko — Masolo mabumbilu mu telefone.',
    onlineReady: 'Internet yikele',
    quickActions: 'Bisalu ya nswalu',
    recentProducts: 'Bima biampa mu zandu',
    referencePrices: 'Ntalu za zandu (RDC)',
    tipOfDayTitle: 'Ndongi ya bilanga ya lumbu',
  },
  lua: {
    slogan: 'Teknoloji bua kukuatshisha budimi bua mu Kongo',
    startBtn: 'Tuadija',
    next: 'Tungunuka',
    skip: 'Pita',
    login: 'Buela',
    register: 'Kangula konte',
    navHome: 'Ku nzubu',
    navMarket: 'Tshisalu',
    navPublish: 'Teka',
    navMessages: 'Mikenji',
    navProfile: 'Profil',
    modulesMenu: 'Midimu yonso',
    welcomeGreeting: 'Moyo',
    searchPlaceholder: 'Keba tshombe, mabele, ntete, mashinyi...',
    offlineBanner: 'Kakuena internet to — Bintu mbilama mu telefone.',
    onlineReady: 'Internet udi',
    quickActions: 'Midimu ya lubilu',
    recentProducts: 'Bintu bipia-bipia mu tshisalu',
    referencePrices: 'Mushinga wa bisalu (RDC)',
    tipOfDayTitle: 'Dijingulula dia budimi dia lelu',
  },
};

export function t(lang: LanguageCode, key: keyof TranslationPack): string {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.fr[key];
}
