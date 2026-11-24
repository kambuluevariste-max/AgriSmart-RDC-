import React, { useState } from 'react';
import {
  Compass,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  MessageSquare,
  Send,
  Star,
  Users,
} from 'lucide-react';
import { DRC_PROVINCES, ROLE_META, SEED_DIRECTORY_ACTORS } from '../data/drcData';
import type { CommunityPost, UserProfile } from '../types/agrismart';
import { UserAvatar } from './Logo';

interface CommunityAndMapViewProps {
  initialTab: 'community' | 'map';
  profile: UserProfile;
  posts: CommunityPost[];
  actors: UserProfile[];
  onPublishPost: (category: CommunityPost['category'], content: string) => Promise<void>;
  onLikePost: (postId: string) => Promise<void>;
  onCommentPost: (postId: string, text: string) => void;
  onReportPost: (post: CommunityPost) => Promise<void>;
  onStartChat: (peerId: string, peerName: string) => void;
  onUpdateManualLocation: (province: string, city: string) => Promise<void>;
}

const COMMUNITY_CATEGORIES: CommunityPost['category'][] = [
  'Agriculture',
  'Élevage',
  'Transformation',
  'Conseils',
  'Questions et réponses',
  'Innovations agricoles',
];

export const CommunityAndMapView: React.FC<CommunityAndMapViewProps> = ({
  initialTab,
  profile,
  posts,
  actors,
  onPublishPost,
  onLikePost,
  onCommentPost,
  onReportPost,
  onStartChat,
  onUpdateManualLocation,
}) => {
  const [tab, setTab] = useState<'community' | 'map'>(initialTab);

  // Community state
  const [catFilter, setCatFilter] = useState<string>('');
  const [sortPopular, setSortPopular] = useState(false);
  const [postCategory, setPostCategory] = useState<CommunityPost['category']>('Conseils');
  const [postContent, setPostContent] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [communityMsg, setCommunityMsg] = useState('');

  // Map & directory state
  const [mapProvince, setMapProvince] = useState<string>(profile.province || '');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [manualProv, setManualProv] = useState(profile.province || 'Kinshasa');
  const [manualCity, setManualCity] = useState(profile.city || 'Kinshasa');
  const [locMsg, setLocMsg] = useState('');

  const allActors = [...SEED_DIRECTORY_ACTORS, ...actors.filter((a) => !SEED_DIRECTORY_ACTORS.some((s) => s.uid === a.uid))];

  const filteredActors = allActors.filter((a) => {
    if (mapProvince && a.province !== mapProvince) return false;
    if (roleFilter && a.role !== roleFilter) return false;
    return true;
  });

  const visiblePosts = posts
    .filter((p) => p.moderationStatus !== 'hidden' && (!catFilter || p.category === catFilter))
    .sort((a, b) => (sortPopular ? b.likesCount - a.likesCount : 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238]">
            {tab === 'community' ? 'Communauté Agricole RDC' : 'Géolocalisation & Carte Agricole'}
          </h1>
          <p className="text-sm text-slate-600">
            {tab === 'community'
              ? 'Partagez vos expériences, posez des questions et échangez entre acteurs agricoles.'
              : 'Localisez vendeurs, fournisseurs, coopératives, experts et transporteurs par province.'}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setTab('community')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'community' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Communauté</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('map')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'map' ? 'bg-[#1976D2] text-white' : 'text-slate-600'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Carte RDC</span>
          </button>
        </div>
      </div>

      {tab === 'community' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Post */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!postContent.trim()) return;
              await onPublishPost(postCategory, postContent.trim());
              setPostContent('');
              setCommunityMsg('Publication ajoutée à la communauté.');
            }}
            className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 space-y-3.5 h-fit"
          >
            <h2 className="text-base font-bold text-[#263238]">Partager avec la communauté</h2>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Catégorie</label>
              <select
                value={postCategory}
                onChange={(e) => setPostCategory(e.target.value as CommunityPost['category'])}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm min-h-[44px]"
              >
                {COMMUNITY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Message / Question</label>
              <textarea
                rows={4}
                required
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Ex. Quelle variété de riz donne le meilleur résultat dans la Tshopo ?"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
            {communityMsg && <p className="text-xs font-medium text-[#168447]">{communityMsg}</p>}
            <button
              type="submit"
              className="w-full rounded-xl bg-[#168447] text-white font-semibold text-sm py-3 min-h-[44px]"
            >
              Publier
            </button>
          </form>

          {/* Feed */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCatFilter('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] ${
                    !catFilter ? 'bg-[#168447] text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  Tout
                </button>
                {COMMUNITY_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatFilter(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] ${
                      catFilter === c ? 'bg-[#168447] text-white' : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSortPopular(!sortPopular)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] ${
                  sortPopular ? 'bg-[#1976D2] text-white' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                Populaires
              </button>
            </div>

            {visiblePosts.map((post) => {
              const postPhoto =
                post.authorId === profile.uid
                  ? profile.photoUrl
                  : post.authorPhotoUrl ||
                    allActors.find((a) => a.uid === post.authorId)?.photoUrl;
              return (
                <div key={post.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar photoUrl={postPhoto} name={post.authorName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 truncate">
                          {post.category} · {post.createdAt || "Aujourd'hui"}
                        </p>
                        <h3 className="text-sm font-bold text-[#263238] truncate">{post.authorName}</h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onReportPost(post)}
                      aria-label="Signaler la publication"
                      className="p-2 text-slate-400 hover:text-red-600 min-h-[36px]"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-sm text-[#263238] leading-relaxed">{post.content}</p>

                  <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => onLikePost(post.id)}
                      className="inline-flex items-center gap-1.5 font-semibold text-[#168447] min-h-[36px]"
                    >
                      <Heart className="w-4 h-4" />
                      <span>{post.likesCount} J’aime</span>
                    </button>
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments?.length || 0} commentaire(s)</span>
                    </span>
                  </div>

                  {post.comments && post.comments.length > 0 && (
                    <div className="bg-[#F5F7F5] rounded-xl p-3 space-y-2">
                      {post.comments.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-xs">
                          <UserAvatar
                            photoUrl={
                              c.authorName === profile.displayName
                                ? profile.photoUrl
                                : c.authorPhotoUrl
                            }
                            name={c.authorName}
                            size="xs"
                          />
                          <div>
                            <span className="font-semibold text-[#263238]">{c.authorName} : </span>
                            <span className="text-slate-700">{c.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const txt = (commentInputs[post.id] || '').trim();
                    if (!txt) return;
                    onCommentPost(post.id, txt);
                    setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={commentInputs[post.id] || ''}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    placeholder="Répondre ou commenter..."
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs min-h-[40px]"
                  />
                  <button
                    type="submit"
                    aria-label="Envoyer le commentaire"
                    className="rounded-xl bg-[#168447] text-white px-3 py-2 min-h-[40px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive DRC Provincial Map + Manual Location */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-[#263238]">Carte interactive des 26 provinces (RDC)</h2>
                {mapProvince && (
                  <button
                    type="button"
                    onClick={() => setMapProvince('')}
                    className="text-xs font-semibold text-[#1976D2] hover:underline"
                  >
                    Toutes les provinces
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Touchez un repère provincial pour filtrer les vendeurs, coopératives, experts et transporteurs. Cartographie interactive temps réel activable via clé Google Maps API.
              </p>

              <div className="relative w-full aspect-[4/3] bg-[#E8F5E9]/60 rounded-2xl border border-[#168447]/20 overflow-hidden">
                {/* Stylized DRC geographic silhouette */}
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path
                    d="M16 62 L24 56 L30 34 L42 14 L74 14 L86 24 L84 48 L80 68 L74 88 L60 84 L54 68 L34 66 Z"
                    fill="#FFFFFF"
                    stroke="#168447"
                    strokeWidth="0.9"
                  />
                  {DRC_PROVINCES.map((prov) => {
                    const active = mapProvince === prov.name;
                    return (
                      <g
                        key={prov.name}
                        className="cursor-pointer"
                        onClick={() => setMapProvince(active ? '' : prov.name)}
                      >
                        <circle
                          cx={prov.x}
                          cy={prov.y}
                          r={active ? 2.6 : 1.7}
                          fill={active ? '#1976D2' : '#168447'}
                          stroke="#FFFFFF"
                          strokeWidth="0.6"
                        />
                      </g>
                    );
                  })}
                </svg>
                {mapProvince && (
                  <div className="absolute bottom-3 left-3 bg-white/95 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#263238]">
                    Province sélectionnée : {mapProvince}
                  </div>
                )}
              </div>
            </div>

            {/* Manual Location Update */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onUpdateManualLocation(manualProv, manualCity);
                setMapProvince(manualProv);
                setLocMsg(`Votre position a été mise à jour : ${manualCity}, ${manualProv}.`);
              }}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
            >
              <h3 className="text-sm font-bold text-[#263238]">Renseigner ma localisation manuellement</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={manualProv}
                  onChange={(e) => {
                    const p = e.target.value;
                    setManualProv(p);
                    const found = DRC_PROVINCES.find((x) => x.name === p);
                    if (found) setManualCity(found.city);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm min-h-[44px]"
                >
                  {DRC_PROVINCES.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="Ville / Territoire / Secteur"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
                />
              </div>
              {locMsg && <p className="text-xs font-medium text-[#168447]">{locMsg}</p>}
              <button
                type="submit"
                className="rounded-xl bg-[#168447] text-white text-xs font-semibold px-4 py-2.5 min-h-[44px]"
              >
                Enregistrer ma localisation
              </button>
            </form>
          </div>

          {/* Nearby Actors Directory */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-2">
              {[
                { id: '', label: 'Tous' },
                { id: 'vendeur', label: 'Vendeurs' },
                { id: 'fournisseur', label: 'Fournisseurs' },
                { id: 'cooperative', label: 'Coopératives' },
                { id: 'expert', label: 'Experts' },
                { id: 'transporteur', label: 'Transporteurs' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRoleFilter(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[38px] ${
                    roleFilter === item.id
                      ? 'bg-[#1976D2] text-white'
                      : 'bg-[#F5F7F5] text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {filteredActors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
                Aucun acteur trouvé dans cette province pour ce filtre.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActors.map((actor) => (
                  <div
                    key={actor.uid}
                    className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar photoUrl={actor.photoUrl} name={actor.displayName} size="md" />
                      <div>
                        <p className="text-xs text-slate-500">
                          {ROLE_META[actor.role]?.label || actor.role} ·{' '}
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#1976D2]" />
                            {actor.city}, {actor.province}
                          </span>
                        </p>
                        <h3 className="text-base font-bold text-[#263238]">{actor.displayName}</h3>
                        <p className="text-xs text-slate-600 mt-0.5">{actor.activityType}</p>
                        {actor.ratingAvg && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-amber-700">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            {actor.ratingAvg} ({actor.ratingCount} avis)
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartChat(actor.uid, actor.displayName)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#168447] text-white text-xs font-semibold px-4 py-2.5 min-h-[44px] self-start sm:self-center"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Contacter</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
