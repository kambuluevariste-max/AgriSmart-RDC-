import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  CalendarDays,
  Camera,
  CloudSun,
  Coins,
  Compass,
  GraduationCap,
  HelpCircle,
  MapPin,
  NotebookPen,
  Search,
  Shield,
  ShoppingBag,
  Sprout,
  Tractor,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import {
  DAILY_AGRI_TIPS,
  PRODUCT_CATEGORIES,
  REFERENCE_MARKET_PRICES,
  ROLE_META,
} from '../data/drcData';
import { t } from '../i18n/translations';
import type {
  AppIdentityState,
  AppSection,
  LanguageCode,
  Product,
  UserProfile,
  WeatherData,
} from '../types/agrismart';
import { ResilientImage, UserAvatar } from './Logo';

interface DashboardHomeProps {
  profile: UserProfile;
  language: LanguageCode;
  isOnline: boolean;
  isPrimaryAdmin?: boolean;
  appIdentity?: AppIdentityState;
  products: Product[];
  onNavigate: (section: AppSection, searchPrefill?: string, categoryPrefill?: string) => void;
  onSelectProduct: (product: Product) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  profile,
  language,
  isOnline,
  isPrimaryAdmin = false,
  appIdentity,
  products,
  onNavigate,
  onSelectProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string>('');
  const [weatherLoading, setWeatherLoading] = useState(false);

  const tipIndex = new Date().getDate() % DAILY_AGRI_TIPS.length;
  const roleInfo = ROLE_META[profile.role] || ROLE_META.agriculteur;

  useEffect(() => {
    if (!isOnline) {
      setWeatherError('Connexion requise pour actualiser la météo locale.');
      return;
    }
    let active = true;
    setWeatherLoading(true);
    setWeatherError('');
    fetch(`/api/weather?province=${encodeURIComponent(profile.province || 'Kinshasa')}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Météo indisponible');
        if (active) setWeather(json);
      })
      .catch((err) => {
        if (active) setWeatherError(err instanceof Error ? err.message : 'Service météo indisponible');
      })
      .finally(() => {
        if (active) setWeatherLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile.province, isOnline]);

  const recentProducts = products.filter((p) => p.moderationStatus === 'published').slice(0, 4);

  const quickModules: { id: AppSection; label: string; icon: React.ReactNode; tone: string }[] = [
    { id: 'notebook', label: 'Carnet agricole', icon: <NotebookPen className="w-5 h-5" />, tone: 'bg-[#E8F5E9] text-[#168447]' },
    { id: 'inputs', label: 'Intrants', icon: <Sprout className="w-5 h-5" />, tone: 'bg-[#E8F5E9] text-[#168447]' },
    { id: 'machinery', label: 'Machines', icon: <Tractor className="w-5 h-5" />, tone: 'bg-blue-50 text-[#1976D2]' },
    { id: 'orders', label: 'Commandes', icon: <Truck className="w-5 h-5" />, tone: 'bg-blue-50 text-[#1976D2]' },
    { id: 'assistant', label: 'AgriSmart IA', icon: <Bot className="w-5 h-5" />, tone: 'bg-[#E8F5E9] text-[#168447]' },
    { id: 'diagnose', label: 'Diagnostic', icon: <Camera className="w-5 h-5" />, tone: 'bg-amber-50 text-amber-700' },
    { id: 'weather', label: 'Météo', icon: <CloudSun className="w-5 h-5" />, tone: 'bg-blue-50 text-[#1976D2]' },
    { id: 'community', label: 'Communauté', icon: <Users className="w-5 h-5" />, tone: 'bg-[#E8F5E9] text-[#168447]' },
    { id: 'funding', label: 'Financement', icon: <Coins className="w-5 h-5" />, tone: 'bg-amber-50 text-amber-700' },
    { id: 'training', label: 'Formations', icon: <GraduationCap className="w-5 h-5" />, tone: 'bg-blue-50 text-[#1976D2]' },
    { id: 'calendar', label: 'Calendrier', icon: <CalendarDays className="w-5 h-5" />, tone: 'bg-[#E8F5E9] text-[#168447]' },
    { id: 'map', label: 'Carte RDC', icon: <Compass className="w-5 h-5" />, tone: 'bg-blue-50 text-[#1976D2]' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Search */}
      <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              aria-label="Ouvrir mon profil"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#168447] shrink-0"
            >
              <UserAvatar photoUrl={profile.photoUrl} name={profile.displayName} size="lg" />
            </button>
            <div>
              <p className="text-xs font-medium text-slate-500">
                {roleInfo.workspaceTitle} · {profile.city}, {profile.province}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#263238]">
                {t(language, 'welcomeGreeting')}, {profile.displayName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                {roleInfo.highlights.map((item, i) => (
                  <React.Fragment key={item}>
                    {i > 0 && <span aria-hidden="true">·</span>}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onNavigate('market', searchTerm);
            }}
            className="flex items-center gap-2 w-full lg:max-w-md"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t(language, 'searchPlaceholder')}
                className="w-full rounded-xl border border-slate-300 bg-[#F5F7F5] pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:border-[#168447] focus:outline-none min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#168447] hover:bg-[#126c3a] text-white font-semibold text-sm px-4 py-2.5 min-h-[44px] whitespace-nowrap shrink-0"
            >
              Chercher
            </button>
          </form>
        </div>
      </section>

      {/* Admin-Only Single-Use App Logo Quick Access */}
      {isPrimaryAdmin && (
        <section className="bg-white rounded-2xl border border-[#1976D2]/30 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1976D2] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#263238]">
                Identité de l&apos;application (Administrateur principal)
              </p>
              <p className="text-xs text-slate-600">
                {appIdentity?.logoChanged
                  ? "Le logo de l'application a déjà été modifié."
                  : "Vous disposez d'un accès unique pour personnaliser le logo officiel d'AgriSmart-RDC."}
              </p>
            </div>
          </div>
          {!appIdentity?.logoChanged && (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="rounded-xl bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold px-4 py-2.5 min-h-[44px] whitespace-nowrap shrink-0 self-start sm:self-center"
            >
              Changer le logo (1 seule fois)
            </button>
          )}
        </section>
      )}

      {/* Weather + Daily Tip + Alert */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Weather Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Météo locale en direct</p>
              <h2 className="text-base font-bold text-[#263238] flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-[#1976D2]" />
                <span>{profile.province}</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('weather')}
              className="text-xs font-semibold text-[#1976D2] hover:underline min-h-[44px] px-2"
            >
              Prévisions 6 j
            </button>
          </div>

          {weatherLoading ? (
            <p className="mt-4 text-sm text-slate-500">Chargement des données météo...</p>
          ) : weather ? (
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold font-mono tabular-nums text-[#263238]">
                  {Math.round(weather.current.temperature_2m)}°C
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Humidité {weather.current.relative_humidity_2m}% · Vent {Math.round(weather.current.wind_speed_10m)} km/h
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-[#168447]">Pluie actuelle</p>
                <p className="text-sm font-mono tabular-nums font-semibold text-[#263238]">
                  {weather.current.precipitation} mm
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-[#F5F7F5] p-3 text-xs text-slate-600">
              {weatherError || 'Données météo en attente de connexion.'}
            </div>
          )}
        </div>

        {/* Tip of the Day */}
        <div className="bg-[#E8F5E9] rounded-2xl border border-[#168447]/15 p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[#168447]">{t(language, 'tipOfDayTitle')}</p>
            <p className="mt-2 text-sm text-[#263238] leading-relaxed">{DAILY_AGRI_TIPS[tipIndex]}</p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('assistant')}
              className="text-xs font-semibold text-[#168447] hover:underline min-h-[40px]"
            >
              Poser une question à AgriSmart Assistant →
            </button>
          </div>
        </div>

        {/* Important Alert & News */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-xs font-semibold">Alertes & Actualités RDC</p>
            </div>
            <p className="mt-2 text-sm font-semibold text-[#263238]">
              Surveillance saisonnière du manioc et du maïs
            </p>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Vérifiez les feuilles dès les 3 premières semaines après levée. Utilisez le module Diagnostic Photo en cas de taches suspectes.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('diagnose')}
              className="text-xs font-semibold text-[#1976D2] hover:underline min-h-[40px]"
            >
              Diagnostiquer une plante
            </button>
            <button
              type="button"
              onClick={() => onNavigate('training')}
              className="text-xs font-medium text-slate-600 hover:underline min-h-[40px]"
            >
              Guides pratiques
            </button>
          </div>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#263238]">{t(language, 'quickActions')}</h2>
          <button
            type="button"
            onClick={() => onNavigate('support')}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-[#168447] min-h-[40px]"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Aide & Support</span>
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {quickModules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => onNavigate(mod.id)}
              className="bg-white hover:border-[#168447] rounded-2xl border border-slate-200 p-3.5 flex flex-col items-center text-center gap-2 transition-colors min-h-[88px]"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.tone}`}>
                {mod.icon}
              </div>
              <span className="text-xs font-semibold text-[#263238] leading-tight">{mod.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Categories Strip */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#263238]">Catégories agricoles</h2>
          <button
            type="button"
            onClick={() => onNavigate('market')}
            className="text-xs font-semibold text-[#168447] hover:underline"
          >
            Tout voir
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onNavigate('market', '', cat)}
              className="px-3.5 py-2 rounded-xl bg-[#F5F7F5] hover:bg-[#E8F5E9] text-xs font-medium text-[#263238] hover:text-[#168447] transition-colors min-h-[40px]"
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Recent Products + Market Prices */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#263238]">{t(language, 'recentProducts')}</h2>
            <button
              type="button"
              onClick={() => onNavigate('market')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#168447]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Ouvrir le marché</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {recentProducts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectProduct(item)}
                className="text-left bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-[#168447] transition-colors flex flex-col"
              >
                <div className="h-36 w-full">
                  <ResilientImage src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      {item.category} · {item.province}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-[#263238] line-clamp-1">{item.title}</h3>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-sm font-bold font-mono tabular-nums text-[#168447]">
                      {item.price.toLocaleString('fr-FR')} {item.currency}
                    </span>
                    <span className="text-xs text-slate-500">/ {item.unit}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Indicative Market Prices */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-[#263238]">{t(language, 'referencePrices')}</h2>
              <p className="text-xs text-slate-500">Repères indicatifs pour orienter vos ventes</p>
            </div>
            <BookOpen className="w-4 h-4 text-[#1976D2]" />
          </div>
          <div className="divide-y divide-slate-100">
            {REFERENCE_MARKET_PRICES.map((row) => (
              <div key={row.crop} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#263238] truncate">{row.crop}</p>
                  <p className="text-xs text-slate-500">
                    {row.province} · {row.trend}
                  </p>
                </div>
                <span className="text-sm font-bold font-mono tabular-nums text-[#168447] whitespace-nowrap">
                  {row.price}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('quiz')}
              className="text-xs font-semibold text-[#1976D2] hover:underline"
            >
              Tester mes connaissances (Quiz)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('publish')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#168447] text-white text-xs font-semibold px-3.5 py-2 min-h-[40px]"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Publier une offre</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
