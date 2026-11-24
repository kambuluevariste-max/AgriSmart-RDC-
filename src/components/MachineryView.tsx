import React, { useState } from 'react';
import { Calendar, CheckCircle2, MapPin, MessageSquare, Plus, Tractor } from 'lucide-react';
import { DRC_PROVINCES, EQUIPMENT_TYPES } from '../data/drcData';
import type {
  BookingStatus,
  CurrencyCode,
  Equipment,
  EquipmentBooking,
  UserProfile,
} from '../types/agrismart';
import { ResilientImage } from './Logo';

interface MachineryViewProps {
  profile: UserProfile;
  equipmentList: Equipment[];
  bookings: EquipmentBooking[];
  onPublishEquipment: (eq: Omit<Equipment, 'id' | 'ownerId' | 'ownerName' | 'moderationStatus'>) => Promise<void>;
  onBookEquipment: (eq: Equipment, startDate: string, days: number) => Promise<void>;
  onUpdateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  onStartChat: (ownerId: string, ownerName: string) => void;
}

export const MachineryView: React.FC<MachineryViewProps> = ({
  profile,
  equipmentList,
  bookings,
  onPublishEquipment,
  onBookEquipment,
  onUpdateBookingStatus,
  onStartChat,
}) => {
  const [tab, setTab] = useState<'list' | 'bookings' | 'publish'>('list');
  const [typeFilter, setTypeFilter] = useState('');
  const [bookingTarget, setBookingTarget] = useState<Equipment | null>(null);
  const [startDate, setStartDate] = useState('2026-12-01');
  const [days, setDays] = useState('2');
  const [feedback, setFeedback] = useState('');

  // Publish machine form
  const [name, setName] = useState('');
  const [equipmentType, setEquipmentType] = useState<string>(EQUIPMENT_TYPES[0]);
  const [dailyRate, setDailyRate] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [province, setProvince] = useState(profile.province || 'Kinshasa');
  const [city, setCity] = useState(profile.city || 'Kinshasa');
  const [description, setDescription] = useState('');

  const visibleEquipment = equipmentList.filter(
    (e) => e.moderationStatus === 'published' && (!typeFilter || e.equipmentType === typeFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238]">Location de Machines Agricoles</h1>
          <p className="text-sm text-slate-600">
            Tracteurs, motoculteurs, motopompes et unités de transformation disponibles en RDC.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setTab('list')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'list' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Machines
          </button>
          <button
            type="button"
            onClick={() => setTab('bookings')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'bookings' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Réservations ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('publish')}
            className={`inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'publish' ? 'bg-[#1976D2] text-white' : 'text-[#1976D2]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Louer ma machine</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl bg-[#E8F5E9] p-3 text-sm text-[#168447] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {tab === 'publish' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onPublishEquipment({
              name: name.trim(),
              equipmentType,
              dailyRate: Number(dailyRate) || 0,
              currency,
              province,
              city: city.trim() || province,
              available: true,
              description: description.trim(),
              imageUrl: '/src/assets/images/agri_tractor_field_1795508673532.jpg',
            });
            setName('');
            setDailyRate('');
            setDescription('');
            setFeedback('Machine publiée pour location.');
            setTab('list');
          }}
          className="bg-white rounded-3xl border border-slate-200 p-6 max-w-2xl space-y-4"
        >
          <h2 className="text-lg font-bold text-[#263238]">Publier un équipement agricole à louer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Nom de la machine</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Motoculteur diesel 15 CV avec remorque"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Type d’équipement</label>
              <select
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm min-h-[44px]"
              >
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tarif / jour</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Devise</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm min-h-[44px]"
                >
                  <option value="USD">USD</option>
                  <option value="CDF">CDF</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm min-h-[44px]"
              >
                {DRC_PROVINCES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Ville / Territoire</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Conditions et description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[#168447] text-white font-semibold text-sm px-6 py-3 min-h-[48px]"
          >
            Publier la machine
          </button>
        </form>
      )}

      {tab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
              Aucune demande de réservation pour le moment.
            </div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-slate-500">
                    Début : {b.startDate} · {b.days} jour(s) · Statut :{' '}
                    <span className="font-semibold text-[#1976D2]">{b.status}</span>
                  </p>
                  <h3 className="text-base font-bold text-[#263238]">{b.equipmentName}</h3>
                  <p className="text-sm font-mono font-bold text-[#168447]">
                    Total estimé : {b.totalAmount.toLocaleString('fr-FR')} {b.currency}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.ownerId === profile.uid && b.status === 'requested' && (
                    <button
                      type="button"
                      onClick={() => onUpdateBookingStatus(b.id, 'confirmed')}
                      className="rounded-xl bg-[#168447] text-white text-xs font-semibold px-3.5 py-2 min-h-[40px]"
                    >
                      Confirmer
                    </button>
                  )}
                  {b.renterId === profile.uid && b.status === 'requested' && (
                    <button
                      type="button"
                      onClick={() => onUpdateBookingStatus(b.id, 'cancelled')}
                      className="rounded-xl border border-red-200 text-red-600 text-xs font-semibold px-3.5 py-2 min-h-[40px]"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'list' && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter('')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[40px] ${
                !typeFilter ? 'bg-[#168447] text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              Tous types
            </button>
            {EQUIPMENT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[40px] ${
                  typeFilter === t ? 'bg-[#168447] text-white' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleEquipment.map((eq) => (
              <div
                key={eq.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-44">
                    <ResilientImage src={eq.imageUrl} alt={eq.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{eq.equipmentType}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#1976D2]" />
                        {eq.city}, {eq.province}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-[#263238]">{eq.name}</h3>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{eq.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Propriétaire : <span className="font-medium text-[#263238]">{eq.ownerName}</span> ·{' '}
                      <span className={eq.available ? 'text-[#168447] font-semibold' : 'text-amber-700'}>
                        {eq.available ? 'Disponible' : 'Occupé'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-base font-bold font-mono tabular-nums text-[#168447]">
                      {eq.dailyRate.toLocaleString('fr-FR')} {eq.currency}
                    </span>
                    <span className="text-xs text-slate-500"> / jour</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onStartChat(eq.ownerId, eq.ownerName)}
                      aria-label="Contacter le propriétaire"
                      className="p-2.5 rounded-xl border border-slate-200 text-[#1976D2] min-h-[40px]"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingTarget(eq)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#168447] text-white text-xs font-semibold px-3.5 py-2.5 min-h-[40px]"
                    >
                      <Tractor className="w-3.5 h-3.5" />
                      <span>Réserver</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Booking Modal */}
      {bookingTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const d = Math.max(1, Number(days) || 1);
              await onBookEquipment(bookingTarget, startDate, d);
              setFeedback(`Demande de réservation envoyée pour ${bookingTarget.name} (${d} jour(s)).`);
              setBookingTarget(null);
              setTab('bookings');
            }}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-[#263238]">Réserver : {bookingTarget.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date de début</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm min-h-[44px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre de jours</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono min-h-[44px]"
                />
              </div>
            </div>
            <p className="text-sm font-mono font-bold text-[#168447]">
              Total estimé : {((Number(days) || 1) * bookingTarget.dailyRate).toLocaleString('fr-FR')}{' '}
              {bookingTarget.currency}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookingTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium min-h-[44px]"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#168447] text-white px-5 py-2.5 text-sm font-semibold min-h-[44px]"
              >
                Envoyer la demande
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
