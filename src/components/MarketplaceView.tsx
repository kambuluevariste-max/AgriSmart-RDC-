import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  Heart,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import {
  DRC_PROVINCES,
  INPUT_CATEGORIES,
  PRODUCT_CATEGORIES,
} from '../data/drcData';
import type {
  CurrencyCode,
  ModerationStatus,
  Product,
  UserProfile,
} from '../types/agrismart';
import { ResilientImage } from './Logo';

interface MarketplaceViewProps {
  mode: 'harvest' | 'input';
  profile: UserProfile;
  products: Product[];
  favorites: string[];
  initialSearch?: string;
  initialCategory?: string;
  selectedProduct: Product | null;
  onSelectProduct: (p: Product | null) => void;
  onToggleFavorite: (id: string) => void;
  onPublishProduct: (input: Omit<Product, 'id' | 'ownerId' | 'sellerName' | 'moderationStatus'>) => Promise<void>;
  onUpdateStatus: (productId: string, status: ModerationStatus) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onPlaceOrder: (product: Product, quantity: number, deliveryAddress: string, mobileMoneyOperator?: 'M-Pesa' | 'Airtel Money' | 'Orange Money', mmPhone?: string) => Promise<void>;
  onStartChat: (sellerId: string, sellerName: string) => void;
  onReportListing: (product: Product, reason: string) => Promise<void>;
  openPublishInitially?: boolean;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  mode,
  profile,
  products,
  favorites,
  initialSearch = '',
  initialCategory = '',
  selectedProduct,
  onSelectProduct,
  onToggleFavorite,
  onPublishProduct,
  onUpdateStatus,
  onDeleteProduct,
  onPlaceOrder,
  onStartChat,
  onReportListing,
  openPublishInitially = false,
}) => {
  const categories = mode === 'input' ? INPUT_CATEGORIES : PRODUCT_CATEGORIES;
  const [viewMode, setViewMode] = useState<'browse' | 'publish' | 'mine'>(
    openPublishInitially ? 'publish' : 'browse'
  );
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [provinceFilter, setProvinceFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Order modal state
  const [orderQty, setOrderQty] = useState('1');
  const [deliveryAddress, setDeliveryAddress] = useState(`${profile.city}, ${profile.province}`);
  const [mmOperator, setMmOperator] = useState<'M-Pesa' | 'Airtel Money' | 'Orange Money'>('M-Pesa');
  const [mmPhone, setMmPhone] = useState(profile.phone || '+243 ');
  const [useMobileMoney, setUseMobileMoney] = useState(true);
  const [orderFeedback, setOrderFeedback] = useState('');

  // Report state
  const [reportReason, setReportReason] = useState('');
  const [showReportBox, setShowReportBox] = useState(false);

  // Publish form state
  const [pubKind, setPubKind] = useState<'harvest' | 'input'>(mode);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(categories[0]);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('CDF');
  const [unit, setUnit] = useState('Sac 50 kg');
  const [quantityAvailable, setQuantityAvailable] = useState('10');
  const [province, setProvince] = useState(profile.province || 'Kinshasa');
  const [city, setCity] = useState(profile.city || 'Kinshasa');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.kind !== mode) return false;
      if (p.moderationStatus !== 'published' && p.ownerId !== profile.uid) return false;
      if (onlyFavorites && !favorites.includes(p.id)) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (provinceFilter && p.province !== provinceFilter) return false;
      if (maxPrice && p.price > Number(maxPrice)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.province.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [products, mode, profile.uid, onlyFavorites, favorites, categoryFilter, provinceFilter, maxPrice, search]);

  const myListings = products.filter((p) => p.ownerId === profile.uid);

  const similarProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return products
      .filter(
        (p) =>
          p.id !== selectedProduct.id &&
          p.moderationStatus === 'published' &&
          (p.category === selectedProduct.category || p.province === selectedProduct.province)
      )
      .slice(0, 3);
  }, [products, selectedProduct]);

  const handleSubmitPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    const numPrice = Number(price);
    const numQty = Number(quantityAvailable);
    if (!title.trim() || numPrice < 0 || numQty <= 0) {
      setFeedback('Veuillez vérifier le titre, le prix et la quantité disponible.');
      return;
    }
    setBusy(true);
    try {
      await onPublishProduct({
        kind: pubKind,
        title: title.trim(),
        description: description.trim(),
        category,
        price: numPrice,
        currency,
        unit: unit.trim() || 'kg',
        quantityAvailable: numQty,
        province,
        city: city.trim() || province,
        imageUrl:
          pubKind === 'input'
            ? '/src/assets/images/intro_smart_farming_1795508671990.jpg'
            : '/src/assets/images/produce_maize_cassava_1795508672143.jpg',
      });
      setTitle('');
      setDescription('');
      setPrice('');
      setFeedback('Annonce publiée avec succès.');
      setViewMode('mine');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Erreur lors de la publication.');
    } finally {
      setBusy(false);
    }
  };

  // PRODUCT DETAIL VIEW
  if (selectedProduct) {
    const isFav = favorites.includes(selectedProduct.id);
    const qtyNum = Math.max(1, Number(orderQty) || 1);
    const total = qtyNum * selectedProduct.price;

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            onSelectProduct(null);
            setOrderFeedback('');
            setShowReportBox(false);
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#168447] min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au catalogue</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5 min-h-[260px]">
            <ResilientImage
              src={selectedProduct.imageUrl}
              alt={selectedProduct.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {selectedProduct.category} · {selectedProduct.city}, {selectedProduct.province} ·{' '}
                  {selectedProduct.moderationStatus === 'published' ? 'Disponible' : selectedProduct.moderationStatus}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-[#263238]">{selectedProduct.title}</h1>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(selectedProduct.id)}
                aria-label="Ajouter aux favoris"
                className={`p-3 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  isFav ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="flex flex-wrap items-baseline gap-4 bg-[#F5F7F5] rounded-2xl p-4">
              <div>
                <span className="text-2xl font-bold font-mono tabular-nums text-[#168447]">
                  {selectedProduct.price.toLocaleString('fr-FR')} {selectedProduct.currency}
                </span>
                <span className="text-sm text-slate-600"> / {selectedProduct.unit}</span>
              </div>
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                Stock : {selectedProduct.quantityAvailable} {selectedProduct.unit}
              </span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {selectedProduct.description || 'Produit agricole local vérifié par le vendeur.'}
            </p>

            <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Vendeur / Fournisseur</p>
                <p className="text-sm font-bold text-[#263238]">{selectedProduct.sellerName}</p>
                {selectedProduct.sellerPhone && (
                  <p className="text-xs font-mono text-slate-600">{selectedProduct.sellerPhone}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onStartChat(selectedProduct.ownerId, selectedProduct.sellerName)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#1976D2] text-[#1976D2] hover:bg-blue-50 font-semibold text-sm px-4 py-2.5 min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Contacter le vendeur</span>
              </button>
            </div>

            {/* Order Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setOrderFeedback('');
                try {
                  await onPlaceOrder(
                    selectedProduct,
                    qtyNum,
                    deliveryAddress,
                    useMobileMoney ? mmOperator : undefined,
                    useMobileMoney ? mmPhone : undefined
                  );
                  setOrderFeedback(
                    useMobileMoney
                      ? `Commande enregistrée (${total.toLocaleString('fr-FR')} ${selectedProduct.currency}). Intention ${mmOperator} créée — en attente de configuration API opérateur.`
                      : 'Demande de commande envoyée au vendeur.'
                  );
                } catch (err) {
                  setOrderFeedback(err instanceof Error ? err.message : 'Erreur lors de la commande.');
                } finally {
                  setBusy(false);
                }
              }}
              className="border-t border-slate-200 pt-5 space-y-4"
            >
              <h3 className="text-sm font-bold text-[#263238]">Passer une commande</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Quantité ({selectedProduct.unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, selectedProduct.quantityAvailable)}
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono tabular-nums min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Adresse de livraison</label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
                  />
                </div>
              </div>

              {/* Mobile Money Intention (no PIN stored!) */}
              <div className="rounded-2xl bg-[#F5F7F5] p-4 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#263238] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMobileMoney}
                    onChange={(e) => setUseMobileMoney(e.target.checked)}
                    className="rounded text-[#168447]"
                  />
                  <span>Préparer un paiement Mobile Money (RDC)</span>
                </label>
                {useMobileMoney && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={mmOperator}
                      onChange={(e) => setMmOperator(e.target.value as 'M-Pesa' | 'Airtel Money' | 'Orange Money')}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm min-h-[44px]"
                    >
                      <option value="M-Pesa">M-Pesa (Vodacom)</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="Orange Money">Orange Money</option>
                    </select>
                    <input
                      type="tel"
                      value={mmPhone}
                      onChange={(e) => setMmPhone(e.target.value)}
                      placeholder="Numéro Mobile Money (+243...)"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm min-h-[44px]"
                    />
                    <p className="sm:col-span-2 text-xs text-slate-500">
                      Sécurité : aucun code PIN n’est demandé ni stocké. Statut initial : « En attente de configuration API opérateur ».
                    </p>
                  </div>
                )}
              </div>

              {orderFeedback && (
                <div className="rounded-xl bg-[#E8F5E9] p-3 text-xs font-medium text-[#168447] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{orderFeedback}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#168447] hover:bg-[#126c3a] text-white font-semibold text-sm px-6 py-3 min-h-[48px]"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>
                    Commander · {total.toLocaleString('fr-FR')} {selectedProduct.currency}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportBox(!showReportBox)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 min-h-[44px] px-2"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Signaler l’annonce</span>
                </button>
              </div>
            </form>

            {showReportBox && (
              <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 space-y-2">
                <input
                  type="text"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Motif du signalement (prix erroné, produit non conforme...)"
                  className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!reportReason.trim()) return;
                    await onReportListing(selectedProduct, reportReason.trim());
                    setReportReason('');
                    setShowReportBox(false);
                    setOrderFeedback('Signalement transmis à l’administration.');
                  }}
                  className="rounded-xl bg-red-600 text-white text-xs font-semibold px-4 py-2 min-h-[40px]"
                >
                  Envoyer le signalement
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-[#263238] mb-3">Produits similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {similarProducts.map((sim) => (
                <button
                  key={sim.id}
                  type="button"
                  onClick={() => onSelectProduct(sim)}
                  className="text-left bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-[#168447]"
                >
                  <div className="h-32">
                    <ResilientImage src={sim.imageUrl} alt={sim.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3.5">
                    <p className="text-xs text-slate-500">{sim.province}</p>
                    <p className="text-sm font-bold text-[#263238] truncate">{sim.title}</p>
                    <p className="mt-1 text-sm font-mono font-bold text-[#168447]">
                      {sim.price.toLocaleString('fr-FR')} {sim.currency}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238]">
            {mode === 'input' ? 'Intrants & Équipements Agricoles' : 'Marketplace Agricole RDC'}
          </h1>
          <p className="text-sm text-slate-600">
            {mode === 'input'
              ? 'Semences certifiées, engrais, outils et équipements proposés par les fournisseurs.'
              : 'Achetez et vendez récoltes, produits vivriers et produits d’élevage en direct.'}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setViewMode('browse')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] whitespace-nowrap ${
              viewMode === 'browse' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Catalogue
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mine')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] whitespace-nowrap ${
              viewMode === 'mine' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Mes annonces ({myListings.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setPubKind(mode);
              setViewMode('publish');
            }}
            className={`inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] whitespace-nowrap ${
              viewMode === 'publish' ? 'bg-[#1976D2] text-white' : 'text-[#1976D2]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Publier</span>
          </button>
        </div>
      </div>

      {viewMode === 'publish' && (
        <form onSubmit={handleSubmitPublish} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 max-w-2xl">
          <h2 className="text-lg font-bold text-[#263238]">Publier une nouvelle annonce</h2>
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F7F5] rounded-xl">
            <button
              type="button"
              onClick={() => {
                setPubKind('harvest');
                setCategory(PRODUCT_CATEGORIES[0]);
              }}
              className={`py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
                pubKind === 'harvest' ? 'bg-white text-[#168447] shadow-sm' : 'text-slate-600'
              }`}
            >
              Produit agricole
            </button>
            <button
              type="button"
              onClick={() => {
                setPubKind('input');
                setCategory(INPUT_CATEGORIES[0]);
              }}
              className={`py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
                pubKind === 'input' ? 'bg-white text-[#168447] shadow-sm' : 'text-slate-600'
              }`}
            >
              Intrant / Équipement
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Nom du produit</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Maïs sec blanc du Kasaï"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white min-h-[44px]"
              >
                {(pubKind === 'input' ? INPUT_CATEGORIES : PRODUCT_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Prix</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Devise</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white min-h-[44px]"
                >
                  <option value="CDF">CDF</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Unité de mesure</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Sac 50 kg, kg, litre, unité"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quantité disponible</label>
              <input
                type="number"
                min="1"
                required
                value={quantityAvailable}
                onChange={(e) => setQuantityAvailable(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white min-h-[44px]"
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qualité, récolte, mode de conditionnement..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          {feedback && (
            <p className="text-xs font-medium text-[#168447]">{feedback}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[#168447] hover:bg-[#126c3a] text-white font-semibold text-sm px-6 py-3 min-h-[48px]"
          >
            {busy ? 'Publication...' : 'Publier sur AgriSmart-RDC'}
          </button>
        </form>
      )}

      {viewMode === 'mine' && (
        <div className="space-y-3">
          {myListings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-600">Vous n’avez pas encore publié d’annonce.</p>
              <button
                type="button"
                onClick={() => setViewMode('publish')}
                className="mt-3 rounded-xl bg-[#168447] text-white text-xs font-semibold px-4 py-2.5 min-h-[44px]"
              >
                Créer ma première annonce
              </button>
            </div>
          ) : (
            myListings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <p className="text-xs text-slate-500">
                    {item.category} · {item.province} · Statut :{' '}
                    <span className="font-semibold text-[#168447]">{item.moderationStatus}</span>
                  </p>
                  <h3 className="text-base font-bold text-[#263238]">{item.title}</h3>
                  <p className="text-xs font-mono text-slate-600">
                    {item.price.toLocaleString('fr-FR')} {item.currency} / {item.unit} · Stock : {item.quantityAvailable}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={item.moderationStatus}
                    onChange={(e) => onUpdateStatus(item.id, e.target.value as ModerationStatus)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white min-h-[40px]"
                  >
                    <option value="published">Publié</option>
                    <option value="sold">Vendu</option>
                    <option value="pending">En attente</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onDeleteProduct(item.id)}
                    aria-label="Supprimer l'annonce"
                    className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'browse' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm min-h-[44px]"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm min-h-[44px]"
            >
              <option value="">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm min-h-[44px]"
            >
              <option value="">Toutes provinces</option>
              {DRC_PROVINCES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Prix max"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                aria-label="Filtrer par favoris"
                className={`p-2.5 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  onlyFavorites ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-300 text-slate-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${onlyFavorites ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-600">Aucun produit ne correspond à ces critères.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('');
                  setProvinceFilter('');
                  setMaxPrice('');
                  setOnlyFavorites(false);
                }}
                className="mt-3 text-xs font-semibold text-[#168447] hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((item) => {
                const isFav = favorites.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-[#168447] transition-colors"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onSelectProduct(item)}
                        className="w-full h-44 block text-left"
                      >
                        <ResilientImage
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span>{item.category}</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#1976D2]" />
                            {item.province}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectProduct(item)}
                          className="mt-1 text-left text-base font-bold text-[#263238] hover:text-[#168447] line-clamp-1"
                        >
                          {item.title}
                        </button>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.description}</p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-base font-bold font-mono tabular-nums text-[#168447]">
                          {item.price.toLocaleString('fr-FR')} {item.currency}
                        </p>
                        <p className="text-xs text-slate-500">par {item.unit}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(item.id)}
                          aria-label="Favori"
                          className={`p-2 rounded-xl border min-h-[40px] min-w-[40px] flex items-center justify-center ${
                            isFav ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-500'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProduct(item)}
                          className="rounded-xl bg-[#168447] hover:bg-[#126c3a] text-white text-xs font-semibold px-3.5 py-2.5 min-h-[40px]"
                        >
                          Détails
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
