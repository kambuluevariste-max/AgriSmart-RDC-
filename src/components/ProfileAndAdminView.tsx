import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Lock,
  LogOut,
  Pencil,
  Settings,
  Shield,
  Smartphone,
  Star,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { DRC_PROVINCES, FAQ_ITEMS, ROLE_META, SEED_DIRECTORY_ACTORS } from '../data/drcData';
import { LANGUAGE_LABELS } from '../i18n/translations';
import { compressImageFile, saveProfileImageToFirestore } from '../lib/imageUtils';
import type {
  ActorReview,
  AppIdentityState,
  LanguageCode,
  ModerationStatus,
  NotificationItem,
  Product,
  SupportTicket,
  UserProfile,
} from '../types/agrismart';
import { AgriSmartLogo, PWAInstallButton, UserAvatar } from './Logo';

interface ProfileAndAdminViewProps {
  initialTab: 'profile' | 'settings' | 'notifications' | 'support' | 'admin';
  profile: UserProfile;
  isAdminUser: boolean;
  isPrimaryAdmin: boolean;
  appIdentity: AppIdentityState;
  onChangeAppLogo: (logoDataUrl: string) => Promise<void>;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onSignOut: () => Promise<void>;
  onBack: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  reviews: ActorReview[];
  onAddReview: (rev: Omit<ActorReview, 'id' | 'authorName' | 'createdAt'>) => void;
  tickets: SupportTicket[];
  onSubmitTicket: (subject: string, details: string) => Promise<void>;
  onResolveTicket: (ticketId: string) => Promise<void>;
  allProducts: Product[];
  onAdminModerateProduct: (productId: string, status: ModerationStatus) => Promise<void>;
  ordersCount: number;
  farmRecordsCount: number;
}

export const ProfileAndAdminView: React.FC<ProfileAndAdminViewProps> = ({
  initialTab,
  profile,
  isAdminUser,
  isPrimaryAdmin,
  appIdentity,
  onChangeAppLogo,
  language,
  onChangeLanguage,
  onUpdateProfile,
  onSignOut,
  onBack,
  notifications,
  onMarkAllRead,
  reviews,
  onAddReview,
  tickets,
  onSubmitTicket,
  onResolveTicket,
  allProducts,
  onAdminModerateProduct,
  ordersCount,
  farmRecordsCount,
}) => {
  const [tab, setTab] = useState<'profile' | 'settings' | 'notifications' | 'support' | 'admin'>(
    initialTab
  );

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Profile editing
  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl || '');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [province, setProvince] = useState(profile.province);
  const [city, setCity] = useState(profile.city);
  const [sector, setSector] = useState(profile.sector || '');
  const [activityType, setActivityType] = useState(profile.activityType || '');
  const [description, setDescription] = useState(profile.description || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Admin App Logo Identity state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [logoSuccess, setLogoSuccess] = useState('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Review form
  const [targetId, setTargetId] = useState(SEED_DIRECTORY_ACTORS[0].uid);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Support form
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [supportMsg, setSupportMsg] = useState('');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileErr('');
    setProfileMsg('');
    setPhotoBusy(true);
    try {
      const base64DataUrl = await saveProfileImageToFirestore(file, {
        uid: profile.uid,
        canWriteFirestore: profile.authProvider === 'firebase',
      });
      setPhotoUrl(base64DataUrl);
      await onUpdateProfile({ photoUrl: base64DataUrl });
      setProfileMsg('Photo de profil mise à jour.');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la photo.');
    } finally {
      setPhotoBusy(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setProfileErr('');
    setProfileMsg('');
    setPhotoBusy(true);
    try {
      setPhotoUrl('');
      await onUpdateProfile({ photoUrl: '' });
      setProfileMsg('Photo supprimée. Avatar par défaut rétabli.');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSelectAppLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (appIdentity.logoChanged || !isPrimaryAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    setLogoSuccess('');
    setLogoBusy(true);
    try {
      const compressed = await compressImageFile(file, {
        maxDim: 256,
        maxDataUrlChars: 180000,
        preferPng: true,
      });
      setLogoPreview(compressed);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Erreur lors du chargement du logo.');
    } finally {
      setLogoBusy(false);
      e.target.value = '';
    }
  };

  const handleConfirmAppLogo = async () => {
    if (!logoPreview || appIdentity.logoChanged || !isPrimaryAdmin) return;
    setLogoError('');
    setLogoSuccess('');
    setLogoBusy(true);
    try {
      await onChangeAppLogo(logoPreview);
      setLogoPreview(null);
      setLogoSuccess("Le logo de l'application a été remplacé avec succès.");
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Impossible de modifier le logo.');
    } finally {
      setLogoBusy(false);
    }
  };

  const renderAppIdentitySection = () => {
    if (!isPrimaryAdmin) return null;
    return (
      <section
        aria-labelledby="app-identity-heading"
        className="bg-white rounded-3xl border border-[#1976D2]/30 p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="app-identity-heading"
            className="text-base font-bold text-[#263238] flex items-center gap-2"
          >
            <Shield className="w-4 h-4 text-[#1976D2]" />
            <span>Identité de l&apos;application</span>
          </h2>
          <span className="text-xs font-medium text-[#1976D2]">
            Administrateur principal
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Personnalisez le logo officiel d’AgriSmart-RDC depuis votre galerie. Attention : ce remplacement est autorisé <strong>une seule fois</strong> de manière définitive.
        </p>

        <div className="rounded-2xl bg-[#F5F7F5] border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Logo actuel</p>
            <AgriSmartLogo size="lg" />
          </div>

          {logoPreview && !appIdentity.logoChanged && (
            <div className="text-center sm:text-right">
              <p className="text-xs font-medium text-[#1976D2] mb-2">
                Aperçu du nouveau logo
              </p>
              <div className="inline-flex items-center gap-2.5 bg-white px-3 py-2 rounded-xl border border-[#1976D2]/40">
                <img
                  src={logoPreview}
                  alt="Aperçu du nouveau logo AgriSmart-RDC"
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <span className="text-lg font-bold tracking-tight">
                  <span className="text-[#168447]">AgriSmart</span>
                  <span className="text-[#1976D2]">-RDC</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {logoError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {logoError}
          </div>
        )}

        {logoSuccess && (
          <div className="rounded-xl bg-[#E8F5E9] border border-[#168447]/30 p-3 text-xs text-[#168447] flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{logoSuccess}</span>
          </div>
        )}

        {appIdentity.logoChanged ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs sm:text-sm font-semibold text-amber-800 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Le logo de l&apos;application a déjà été modifié.</span>
            </div>
            <button
              type="button"
              disabled
              className="w-full rounded-xl bg-slate-200 text-slate-500 font-semibold text-sm py-3 px-5 cursor-not-allowed min-h-[44px]"
            >
              Modification du logo verrouillée
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectAppLogo}
              className="sr-only"
              aria-label="Sélectionner un nouveau logo depuis la galerie"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={logoBusy}
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:border-[#1976D2] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#263238] min-h-[44px]"
              >
                <ImageIcon className="w-4 h-4 text-[#1976D2]" />
                <span>
                  {logoBusy
                    ? 'Chargement...'
                    : logoPreview
                      ? 'Choisir un autre logo'
                      : 'Sélectionner un logo depuis la galerie'}
                </span>
              </button>

              {logoPreview && (
                <>
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={handleConfirmAppLogo}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#168447] hover:bg-[#126c3a] text-white px-5 py-2.5 text-xs sm:text-sm font-semibold min-h-[44px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmer le changement du logo</span>
                  </button>
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={() => setLogoPreview(null)}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 min-h-[44px]"
                  >
                    Annuler
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour à la page précédente"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-[#263238] hover:border-[#168447] hover:text-[#168447] min-h-[40px] shrink-0 mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#263238]">Mon compte, Profil & Paramètres</h1>
            <p className="text-sm text-slate-600">
              {ROLE_META[profile.role]?.label} · {profile.city}, {profile.province}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 p-1 bg-white border border-slate-200 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'profile' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Mon Profil
          </button>
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'settings' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Paramètres
          </button>
          <button
            type="button"
            onClick={() => setTab('notifications')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'notifications' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Alertes ({notifications.filter((n) => !n.read).length})
          </button>
          <button
            type="button"
            onClick={() => setTab('support')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'support' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Support & FAQ
          </button>
          {isAdminUser && (
            <button
              type="button"
              onClick={() => setTab('admin')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
                tab === 'admin' ? 'bg-[#1976D2] text-white' : 'text-[#1976D2]'
              }`}
            >
              Administration
            </button>
          )}
        </div>
      </div>

      {/* PROFILE & RATINGS */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {isPrimaryAdmin && (
              <div className="bg-white rounded-2xl border border-[#1976D2]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#1976D2] shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#263238]">Identité de l&apos;application</p>
                    <p className="text-xs text-slate-600">
                      {appIdentity.logoChanged
                        ? "Le logo de l'application a déjà été modifié."
                        : "Accès administrateur principal : modifier le logo une seule fois."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('settings')}
                  className="rounded-xl bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold px-4 py-2.5 min-h-[40px] shrink-0 self-start sm:self-center"
                >
                  {appIdentity.logoChanged ? 'Voir les paramètres' : 'Changer le logo'}
                </button>
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setProfileErr('');
                setProfileMsg('');
                const composedName =
                  firstName.trim() && lastName.trim()
                    ? `${firstName.trim()} ${lastName.trim()}`
                    : displayName.trim();
                await onUpdateProfile({
                  firstName: firstName.trim() || undefined,
                  lastName: lastName.trim() || undefined,
                  displayName: composedName,
                  photoUrl,
                  province,
                  city,
                  sector,
                  activityType,
                  description,
                  language,
                });
                setDisplayName(composedName);
                setProfileMsg('Profil mis à jour.');
              }}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#263238] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#168447]" />
                  <span>Mon compte & Mon profil</span>
                </h2>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline min-h-[36px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
              </div>

              {/* Profile Photo Management */}
              <div className="rounded-2xl bg-[#F5F7F5] border border-slate-200 p-4 flex flex-col sm:flex-row items-center gap-4">
                <UserAvatar photoUrl={photoUrl} name={displayName} size="xl" />
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="sr-only"
                  aria-label="Choisir une photo de profil depuis la galerie"
                />
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <p className="text-sm font-bold text-[#263238]">{displayName}</p>
                  <p className="text-xs text-slate-500">
                    {profile.email || profile.phone || 'Compte AgriSmart-RDC'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#168447] px-3 py-2 text-xs font-semibold text-[#263238] min-h-[40px]"
                    >
                      {photoUrl ? (
                        <Pencil className="w-3.5 h-3.5 text-[#168447]" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-[#168447]" />
                      )}
                      <span>
                        {photoBusy
                          ? 'Mise à jour...'
                          : photoUrl
                            ? 'Modifier la photo'
                            : 'Ajouter une photo'}
                      </span>
                    </button>
                    {photoUrl && (
                      <button
                        type="button"
                        disabled={photoBusy}
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 min-h-[40px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {profile.firstName || profile.lastName ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Nom</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Prénom</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nom complet</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Langue de l’application</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <select
                      value={language}
                      onChange={(e) => onChangeLanguage(e.target.value as LanguageCode)}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm min-h-[44px]"
                    >
                      {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
                        <option key={code} value={code}>
                          {LANGUAGE_LABELS[code]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Province</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm min-h-[44px]"
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
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Secteur / Village</label>
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type d’activité</label>
                  <input
                    type="text"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {profileErr && (
                <p className="text-xs font-medium text-red-600">{profileErr}</p>
              )}
              {profileMsg && (
                <p className="text-xs font-medium text-[#168447] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{profileMsg}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-xl bg-[#168447] text-white font-semibold text-sm px-5 py-2.5 min-h-[44px]"
                >
                  Enregistrer le profil
                </button>
                <PWAInstallButton />
              </div>
            </form>
          </div>

          {/* Stats & Reviews */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Entrées Carnet</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#168447]">
                  {farmRecordsCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Commandes suivies</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#1976D2]">
                  {ordersCount}
                </p>
              </div>
            </div>

            {/* Rate Seller / Transporter / Supplier */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const actor = SEED_DIRECTORY_ACTORS.find((a) => a.uid === targetId);
                if (!actor || !comment.trim()) return;
                onAddReview({
                  targetId: actor.uid,
                  targetName: actor.displayName,
                  targetRole: ROLE_META[actor.role]?.label || actor.role,
                  rating,
                  comment: comment.trim(),
                });
                setComment('');
              }}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
            >
              <h3 className="text-sm font-bold text-[#263238]">Noter un vendeur, fournisseur ou transporteur</h3>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs min-h-[40px]"
              >
                {SEED_DIRECTORY_ACTORS.map((a) => (
                  <option key={a.uid} value={a.uid}>
                    {a.displayName} ({ROLE_META[a.role]?.label})
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-1.5"
                    aria-label={`${n} étoiles`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        n <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Votre avis sur la qualité ou la ponctualité..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-[#168447] text-white text-xs font-semibold py-2.5 min-h-[40px]"
              >
                Publier mon évaluation
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#263238]">Évaluations récentes</h3>
              {reviews.map((r) => (
                <div key={r.id} className="border-t border-slate-100 pt-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#263238]">{r.targetName}</span>
                    <span className="font-mono text-amber-700">{r.rating} / 5 ★</span>
                  </div>
                  <p className="text-slate-600">{r.comment}</p>
                  <p className="text-slate-400">
                    Par {r.authorName} · {r.createdAt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS TAB (+ ADMIN-ONLY SINGLE-TIME APP LOGO SECTION) */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {/* General App Settings */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-[#263238] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#168447]" />
                <span>Paramètres généraux</span>
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Langue de l’interface
                  </label>
                  <select
                    value={language}
                    onChange={(e) => onChangeLanguage(e.target.value as LanguageCode)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm min-h-[44px]"
                  >
                    {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
                      <option key={code} value={code}>
                        {LANGUAGE_LABELS[code]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <PWAInstallButton />
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2.5 text-xs font-semibold text-red-700 min-h-[44px]"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ADMIN-ONLY: « Identité de l'application » (Single-Time Logo Change) */}
            {renderAppIdentitySection()}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-[#1976D2] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-bold text-sm text-[#263238]">
                  Application Android & Publication Google Play Store
                </p>
                <p>
                  Identifiant de package prévu : <span className="font-mono font-semibold text-[#168447]">com.agrismartrdc.app</span>
                </p>
                <p>
                  Manifeste Web/Android, icônes adaptatives, fonctionnement hors connexion et cache Service Worker configurés.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS CENTER */}
      {tab === 'notifications' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#263238] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#168447]" />
              <span>Centre de notifications</span>
            </h2>
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-xs font-semibold text-[#1976D2] hover:underline"
            >
              Tout marquer comme lu
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Les notifications push temps réel (Firebase Cloud Messaging) s’activeront automatiquement lors du déploiement mobile Android.
          </p>
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.id} className={`py-3.5 ${n.read ? 'opacity-70' : ''}`}>
                <p className="text-xs text-slate-500">
                  {n.createdAt} · {!n.read ? 'Nouveau' : 'Lu'}
                </p>
                <p className="text-sm font-bold text-[#263238] mt-0.5">{n.title}</p>
                <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUPPORT & FAQ */}
      {tab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-[#263238] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#168447]" />
              <span>Questions fréquentes (Centre d’aide)</span>
            </h2>
            <div className="divide-y divide-slate-100">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="py-3.5">
                  <h3 className="text-sm font-bold text-[#263238]">{item.q}</h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSubmitTicket(subject, details);
              setSubject('');
              setDetails('');
              setSupportMsg('Demande transmise à l’assistance AgriSmart-RDC.');
            }}
            className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 space-y-3.5 h-fit"
          >
            <h2 className="text-base font-bold text-[#263238]">Contacter le support / Signaler un problème</h2>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de votre demande"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
            />
            <textarea
              rows={4}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Décrivez votre besoin ou problème..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
            {supportMsg && <p className="text-xs font-medium text-[#168447]">{supportMsg}</p>}
            <button
              type="submit"
              className="w-full rounded-xl bg-[#168447] text-white font-semibold text-sm py-3 min-h-[44px]"
            >
              Envoyer au support
            </button>
          </form>
        </div>
      )}

      {/* ADMIN CONSOLE (SECURED) */}
      {tab === 'admin' && isAdminUser && (
        <div className="space-y-6">
          <div className="bg-[#E8F5E9] rounded-2xl p-4 flex items-center gap-3 text-sm text-[#168447]">
            <Shield className="w-5 h-5 shrink-0" />
            <p>Console Administrateur vérifiée : modération des annonces, identité visuelle, tickets et statistiques.</p>
          </div>

          {renderAppIdentitySection()}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Annonces actives</p>
              <p className="text-2xl font-bold font-mono text-[#168447]">{allProducts.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Tickets ouverts</p>
              <p className="text-2xl font-bold font-mono text-amber-700">
                {tickets.filter((t) => t.status === 'open').length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Provinces couvertes</p>
              <p className="text-2xl font-bold font-mono text-[#1976D2]">26</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Langues prêtes</p>
              <p className="text-2xl font-bold font-mono text-[#263238]">5</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#263238]">Modération des annonces</h3>
              <div className="divide-y divide-slate-100">
                {allProducts.slice(0, 8).map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-[#263238] truncate">{p.title}</p>
                      <p className="text-slate-500">
                        {p.sellerName} · {p.moderationStatus}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAdminModerateProduct(p.id, 'published')}
                        className="rounded-lg bg-[#E8F5E9] text-[#168447] px-2.5 py-1.5 font-semibold"
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdminModerateProduct(p.id, 'suspended')}
                        className="rounded-lg bg-red-50 text-red-600 px-2.5 py-1.5 font-semibold"
                      >
                        Suspendre
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#263238]">Tickets & Signalements</h3>
              {tickets.length === 0 ? (
                <p className="text-xs text-slate-500">Aucun ticket ouvert.</p>
              ) : (
                tickets.map((tk) => (
                  <div key={tk.id} className="border-t border-slate-100 pt-2.5 text-xs flex justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#263238]">{tk.subject}</p>
                      <p className="text-slate-600">{tk.details}</p>
                      <p className="text-slate-400">Statut : {tk.status}</p>
                    </div>
                    {tk.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => onResolveTicket(tk.id)}
                        className="rounded-lg bg-[#168447] text-white px-3 py-1.5 font-semibold h-fit"
                      >
                        Résoudre
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
