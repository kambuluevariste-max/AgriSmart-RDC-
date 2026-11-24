import React, { useEffect, useState } from 'react';
import { BellPlus, CloudRain, CloudSun, Droplets, Wind } from 'lucide-react';
import { DRC_PROVINCES } from '../data/drcData';
import type { WeatherData } from '../types/agrismart';

interface WeatherAlertsViewProps {
  defaultProvince: string;
  isOnline: boolean;
}

export const WeatherAlertsView: React.FC<WeatherAlertsViewProps> = ({
  defaultProvince,
  isOnline,
}) => {
  const [province, setProvince] = useState(defaultProvince || 'Kinshasa');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reminders, setReminders] = useState<{ id: string; text: string; date: string }[]>([
    { id: 'r1', text: 'Vérifier l’humidité des jeunes plants de maïs', date: 'Demain 07:00' },
  ]);
  const [newReminder, setNewReminder] = useState('');

  useEffect(() => {
    if (!isOnline) {
      setError('Hors connexion : impossible d’interroger l’API météo Open-Meteo.');
      setWeather(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    fetch(`/api/weather?province=${encodeURIComponent(province)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Météo indisponible');
        if (active) setWeather(json);
      })
      .catch((err) => {
        if (active) {
          setWeather(null);
          setError(err instanceof Error ? err.message : 'Service météo indisponible');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [province, isOnline]);

  // Compute factual agricultural advisories strictly from real API values
  const advisories: { title: string; detail: string; tone: string }[] = [];
  if (weather) {
    const totalRainNextDays = weather.daily.precipitation_sum.reduce((a, b) => a + b, 0);
    const maxTemp = Math.max(...weather.daily.temperature_2m_max);

    if (totalRainNextDays >= 35) {
      advisories.push({
        title: 'Risque de pluies abondantes',
        detail: `Cumul prévu de ${totalRainNextDays.toFixed(1)} mm sur 6 jours : vérifiez le drainage des parcelles et reportez tout épandage d'engrais foliaire.`,
        tone: 'bg-blue-50 text-[#1976D2]',
      });
    } else if (totalRainNextDays < 5) {
      advisories.push({
        title: 'Temps sec prévu — Vigilance arrosage',
        detail: `Faibles précipitations prévues (${totalRainNextDays.toFixed(1)} mm) : privilégiez le paillage et l’arrosage tôt le matin.`,
        tone: 'bg-amber-50 text-amber-800',
      });
    } else {
      advisories.push({
        title: 'Conditions modérées favorables aux travaux agricoles',
        detail: `Cumul prévu de ${totalRainNextDays.toFixed(1)} mm : fenêtre adaptée pour le sarclage, le buttage et les semis selon votre calendrier provincial.`,
        tone: 'bg-[#E8F5E9] text-[#168447]',
      });
    }

    if (maxTemp >= 33) {
      advisories.push({
        title: 'Températures maximales élevées',
        detail: `Pointes jusqu’à ${Math.round(maxTemp)}°C : évitez le repiquage en plein soleil.`,
        tone: 'bg-amber-50 text-amber-800',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238]">Météo & Alertes Agricoles</h1>
          <p className="text-sm text-slate-600">
            Données météorologiques réelles fournies par Open-Meteo pour les 26 provinces de la RDC.
          </p>
        </div>

        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium min-h-[44px]"
        >
          {DRC_PROVINCES.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} ({p.city})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
          Chargement des prévisions réelles pour {province}...
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-2xl border border-amber-200 p-6 text-sm text-amber-800">
          <p className="font-semibold">Données météo indisponibles</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && weather && (
        <>
          <div className="bg-white rounded-3xl border border-slate-200 p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Température ({weather.city})</p>
              <p className="mt-1 text-3xl font-bold font-mono tabular-nums text-[#263238] flex items-center gap-2">
                <CloudSun className="w-6 h-6 text-[#168447]" />
                {Math.round(weather.current.temperature_2m)}°C
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Précipitations</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#1976D2] flex items-center gap-2">
                <CloudRain className="w-5 h-5" />
                {weather.current.precipitation} mm
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Humidité relative</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#263238] flex items-center gap-2">
                <Droplets className="w-5 h-5 text-[#1976D2]" />
                {weather.current.relative_humidity_2m}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Vitesse du vent</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#263238] flex items-center gap-2">
                <Wind className="w-5 h-5 text-slate-500" />
                {Math.round(weather.current.wind_speed_10m)} km/h
              </p>
            </div>
          </div>

          {/* 6-day Forecast */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-[#263238] mb-3">Prévisions sur 6 jours</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {weather.daily.time.map((day, idx) => (
                <div key={day} className="rounded-xl bg-[#F5F7F5] p-3 text-center">
                  <p className="text-xs font-medium text-slate-600">{day}</p>
                  <p className="mt-1 text-base font-bold font-mono tabular-nums text-[#263238]">
                    {Math.round(weather.daily.temperature_2m_min[idx])}° /{' '}
                    {Math.round(weather.daily.temperature_2m_max[idx])}°
                  </p>
                  <p className="mt-1 text-xs font-mono text-[#1976D2]">
                    {weather.daily.precipitation_sum[idx]} mm ({weather.daily.precipitation_probability_max[idx]}%)
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Source : {weather.source}</p>
          </div>

          {/* Agricultural Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advisories.map((adv) => (
              <div key={adv.title} className={`rounded-2xl p-5 ${adv.tone}`}>
                <h3 className="text-sm font-bold">{adv.title}</h3>
                <p className="mt-1 text-xs leading-relaxed">{adv.detail}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Personal Watering & Harvest Reminders */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-bold text-[#263238]">Rappels d’arrosage et de récolte</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newReminder.trim()) return;
            setReminders((prev) => [
              { id: String(Date.now()), text: newReminder.trim(), date: 'Rappel actif' },
              ...prev,
            ]);
            setNewReminder('');
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newReminder}
            onChange={(e) => setNewReminder(e.target.value)}
            placeholder="Ex. Arroser pépinière tomates demain matin"
            className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm min-h-[44px]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#168447] text-white text-xs font-semibold px-4 py-2 min-h-[44px]"
          >
            <BellPlus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </form>
        <div className="divide-y divide-slate-100">
          {reminders.map((r) => (
            <div key={r.id} className="py-2.5 flex items-center justify-between text-sm">
              <span>{r.text}</span>
              <span className="text-xs text-slate-500">{r.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
