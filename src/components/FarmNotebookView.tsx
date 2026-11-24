import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  CloudUpload,
  Plus,
  Sprout,
  Trash2,
  WifiOff,
} from 'lucide-react';
import type { FarmRecord, FarmRecordType } from '../types/agrismart';

interface FarmNotebookViewProps {
  records: FarmRecord[];
  isOnline: boolean;
  isSignedInCloud: boolean;
  onAddRecord: (rec: Omit<FarmRecord, 'id' | 'ownerId'>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onSyncPending: () => Promise<void>;
}

export const FarmNotebookView: React.FC<FarmNotebookViewProps> = ({
  records,
  isOnline,
  isSignedInCloud,
  onAddRecord,
  onDeleteRecord,
  onSyncPending,
}) => {
  const [tab, setTab] = useState<FarmRecordType | 'stats'>('crop');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState('');

  // Form inputs
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Semences');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [areaHa, setAreaHa] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [harvestDate, setHarvestDate] = useState('');
  const [notes, setNotes] = useState('');

  const pendingCount = records.filter((r) => r.pendingSync).length;

  const stats = useMemo(() => {
    let expenses = 0;
    let revenues = 0;
    const monthly: Record<string, { exp: number; rev: number }> = {};

    for (const r of records) {
      const monthKey = (r.date || '2026-11').slice(0, 7);
      if (!monthly[monthKey]) monthly[monthKey] = { exp: 0, rev: 0 };
      if (r.recordType === 'expense') {
        const val = r.amount || 0;
        expenses += val;
        monthly[monthKey].exp += val;
      } else if (r.recordType === 'revenue') {
        const val = r.amount || 0;
        revenues += val;
        monthly[monthKey].rev += val;
      }
    }
    const net = revenues - expenses;
    const months = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    const maxMonthly = Math.max(1, ...months.flatMap(([, m]) => [m.exp, m.rev]));
    return { expenses, revenues, net, months, maxMonthly };
  }, [records]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || tab === 'stats') return;
    await onAddRecord({
      recordType: tab,
      title: title.trim(),
      category: tab === 'expense' || tab === 'revenue' ? category : undefined,
      amount: tab === 'expense' || tab === 'revenue' ? Number(amount) || 0 : undefined,
      quantity: tab === 'crop' || tab === 'stock' ? Number(quantity) || 0 : undefined,
      unit: tab === 'crop' || tab === 'stock' ? unit : undefined,
      areaHa: tab === 'crop' ? Number(areaHa) || 0 : undefined,
      date,
      harvestDate: tab === 'crop' ? harvestDate : undefined,
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setAmount('');
    setQuantity('');
    setAreaHa('');
    setNotes('');
    setSyncMsg(
      isOnline && isSignedInCloud
        ? 'Enregistré et sauvegardé.'
        : 'Enregistré localement hors connexion (en attente de synchronisation).'
    );
  };

  const tabRecords = records.filter((r) => r.recordType === tab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238]">Carnet Agricole & Gestion Financière</h1>
          <p className="text-sm text-slate-600">
            Cultures, dépenses, recettes, stocks et bilan financier utilisables hors connexion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              disabled={!isOnline || !isSignedInCloud}
              onClick={async () => {
                await onSyncPending();
                setSyncMsg('Synchronisation terminée.');
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1976D2] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 min-h-[44px]"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Synchroniser ({pendingCount})</span>
            </button>
          )}
          {!isOnline && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
              <WifiOff className="w-3.5 h-3.5" />
              Hors connexion
            </span>
          )}
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total Recettes</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#168447]">
            {stats.revenues.toLocaleString('fr-FR')} CDF
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total Dépenses</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-700">
            {stats.expenses.toLocaleString('fr-FR')} CDF
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">{stats.net >= 0 ? 'Bénéfice Net' : 'Perte Nette'}</p>
          <p
            className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
              stats.net >= 0 ? 'text-[#168447]' : 'text-red-600'
            }`}
          >
            {stats.net.toLocaleString('fr-FR')} CDF
          </p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-white border border-slate-200 rounded-xl w-fit">
        {(
          [
            { id: 'crop', label: 'Cultures & Parcelles' },
            { id: 'expense', label: 'Dépenses' },
            { id: 'revenue', label: 'Recettes' },
            { id: 'stock', label: 'Stocks' },
            { id: 'stats', label: 'Statistiques' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              if (item.id === 'expense') setCategory('Semences');
              if (item.id === 'revenue') setCategory('Vente de produits');
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === item.id ? 'bg-[#168447] text-white' : 'text-slate-600 hover:text-[#263238]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {syncMsg && (
        <div className="rounded-xl bg-[#E8F5E9] p-3 text-xs font-medium text-[#168447] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncMsg}</span>
        </div>
      )}

      {tab === 'stats' ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#168447]" />
            <h2 className="text-lg font-bold text-[#263238]">Évolution mensuelle (Recettes vs Dépenses)</h2>
          </div>

          {stats.months.length === 0 ? (
            <p className="text-sm text-slate-500">Ajoutez des dépenses et recettes pour visualiser le graphique.</p>
          ) : (
            <div className="space-y-4">
              {stats.months.map(([month, values]) => (
                <div key={month} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[#263238]">{month}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      Recettes : {values.rev.toLocaleString('fr-FR')} · Dépenses : {values.exp.toLocaleString('fr-FR')} CDF
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#168447] rounded-full"
                        style={{ width: `${Math.round((values.rev / stats.maxMonthly) * 100)}%` }}
                      />
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.round((values.exp / stats.maxMonthly) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Record Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 space-y-3.5 h-fit"
          >
            <h2 className="text-base font-bold text-[#263238] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#168447]" />
              <span>
                {tab === 'crop' && 'Nouvelle parcelle / culture'}
                {tab === 'expense' && 'Enregistrer une dépense'}
                {tab === 'revenue' && 'Enregistrer une recette'}
                {tab === 'stock' && 'Mouvement de stock'}
              </span>
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {tab === 'crop' ? 'Culture & Parcelle' : tab === 'stock' ? 'Produit en stock' : 'Libellé'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  tab === 'crop'
                    ? 'Ex. Manioc — Parcelle Sud'
                    : tab === 'expense'
                      ? 'Ex. Achat 2 sacs engrais NPK'
                      : tab === 'revenue'
                        ? 'Ex. Vente 10 sacs maïs'
                        : 'Ex. Maïs sec en entrepôt'
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>

            {(tab === 'expense' || tab === 'revenue') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm min-h-[44px]"
                  >
                    {tab === 'expense' ? (
                      <>
                        <option value="Semences">Semences</option>
                        <option value="Engrais">Engrais</option>
                        <option value="Main-d'œuvre">Main-d'œuvre</option>
                        <option value="Transport">Transport</option>
                        <option value="Location de machines">Location de machines</option>
                        <option value="Autres dépenses">Autres dépenses</option>
                      </>
                    ) : (
                      <>
                        <option value="Vente de produits">Vente de produits</option>
                        <option value="Autres revenus">Autres revenus</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Montant (CDF)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono min-h-[44px]"
                  />
                </div>
              </div>
            )}

            {(tab === 'crop' || tab === 'stock') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {tab === 'crop' ? 'Quantité récoltée' : 'Quantité'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unité</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {tab === 'crop' ? 'Date de semis' : tab === 'stock' ? "Date d'entrée" : 'Date'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
                />
              </div>
              {tab === 'crop' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Superficie (ha)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={areaHa}
                    onChange={(e) => setAreaHa(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono min-h-[44px]"
                  />
                </div>
              ) : tab === 'stock' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date de sortie</label>
                  <input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
                  />
                </div>
              ) : null}
            </div>

            {tab === 'crop' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date prévue de récolte</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Observations</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#168447] hover:bg-[#126c3a] text-white font-semibold text-sm py-3 min-h-[44px]"
            >
              Enregistrer dans mon carnet
            </button>
          </form>

          {/* Records List */}
          <div className="lg:col-span-7 space-y-3">
            {tabRecords.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Sprout className="w-8 h-8 text-[#168447]/60 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Aucune entrée enregistrée dans cet onglet.</p>
              </div>
            ) : (
              tabRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-xs text-slate-500">
                      {rec.date || 'Sans date'}
                      {rec.category ? ` · ${rec.category}` : ''}
                      {rec.pendingSync ? ' · En attente de sync' : ''}
                    </p>
                    <h3 className="text-sm font-bold text-[#263238] mt-0.5">{rec.title}</h3>
                    {rec.amount !== undefined && (
                      <p className="text-sm font-mono font-bold text-[#168447] mt-1">
                        {rec.amount.toLocaleString('fr-FR')} CDF
                      </p>
                    )}
                    {rec.quantity !== undefined && (
                      <p className="text-xs font-mono text-slate-700 mt-1">
                        Quantité : {rec.quantity} {rec.unit}
                        {rec.areaHa ? ` · ${rec.areaHa} ha` : ''}
                      </p>
                    )}
                    {rec.notes && <p className="text-xs text-slate-600 mt-1">{rec.notes}</p>}
                  </div>

                  {confirmDeleteId === rec.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteRecord(rec.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-lg bg-red-600 text-white text-xs font-semibold px-2.5 py-1.5 min-h-[36px]"
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-slate-200 text-xs px-2.5 py-1.5 min-h-[36px]"
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(rec.id)}
                      aria-label="Supprimer"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
