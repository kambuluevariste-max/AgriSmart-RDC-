import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
  UserPlus,
  LogIn,
  WifiOff,
} from 'lucide-react';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  isValidEmail,
  isValidEmailOrPhone,
  prepareUserPhotoBase64,
} from '../lib/imageUtils';
import { DRC_PROVINCES, ROLE_META } from '../data/drcData';
import { LANGUAGE_LABELS, t } from '../i18n/translations';
import type { LanguageCode, UserProfile, UserRole } from '../types/agrismart';
import { AgriSmartLogo, ResilientImage, UserAvatar } from './Logo';

type AuthStep =
  | 'welcome'
  | 'gateway'
  | 'intro'
  | 'login'
  | 'register'
  | 'forgot'
  | 'resetInfo'
  | 'verify'
  | 'terms'
  | 'privacy'
  | 'roleSetup';

interface WelcomeAndAuthProps {
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  initialStep?: AuthStep;
  pendingUid?: string;
  pendingName?: string;
  pendingEmail?: string;
  onCompleteProfile: (profile: UserProfile, isLocalMode: boolean) => Promise<void>;
  onDirectSignIn?: (profile: UserProfile) => void;
}

const WELCOME_HERO_SLIDES = [
  {
    src: '/src/assets/images/welcome_congo_farm_1795508672152.jpg',
    caption: 'Exploitations agricoles verdoyantes en RDC',
  },
  {
    src: '/src/assets/images/hero_maize_cassava_1795509976091.jpg',
    caption: 'Champs de maïs et plantations de manioc',
  },
  {
    src: '/src/assets/images/hero_rice_paddy_1795509976020.jpg',
    caption: 'Rizières irriguées et cultures vivrières',
  },
  {
    src: '/src/assets/images/agri_tractor_field_1795508673532.jpg',
    caption: 'Tracteurs et mécanisation agricole moderne',
  },
  {
    src: '/src/assets/images/intro_smart_farming_1795508671990.jpg',
    caption: 'Agriculteurs congolais connectés sur le terrain',
  },
  {
    src: '/src/assets/images/produce_coffee_cacao_1795508672211.jpg',
    caption: 'Récoltes abondantes et valorisation locale',
  },
];

const INTRO_SLIDES = [
  {
    title: 'Découvrez les opportunités agricoles.',
    body: 'Accédez aux marchés de Kinshasa, Lubumbashi, Goma, Bukavu, Kisangani et des 26 provinces. Trouvez acheteurs, intrants et financements.',
    image: '/src/assets/images/produce_maize_cassava_1795508672143.jpg',
  },
  {
    title: 'Gérez votre exploitation intelligemment.',
    body: 'Suivez vos parcelles, dépenses, récoltes et stocks dans votre Carnet Agricole, même en zone rurale sans connexion Internet.',
    image: '/src/assets/images/intro_smart_farming_1795508671990.jpg',
  },
  {
    title: 'Connectez-vous au marché agricole congolais.',
    body: 'Discutez directement avec les coopératives, transporteurs, experts agronomes et fournisseurs de machines agricoles.',
    image: '/src/assets/images/produce_coffee_cacao_1795508672211.jpg',
  },
];

export const WelcomeAndAuth: React.FC<WelcomeAndAuthProps> = ({
  language,
  onChangeLanguage,
  initialStep = 'welcome',
  pendingUid,
  pendingName = '',
  pendingEmail = '',
  onCompleteProfile,
  onDirectSignIn,
}) => {
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [returnStep, setReturnStep] = useState<'login' | 'register'>('register');
  const [slideIndex, setSlideIndex] = useState(0);

  // Welcome animated background slideshow state
  const [heroIndex, setHeroIndex] = useState(0);
  const [failedHeroIndices, setFailedHeroIndices] = useState<Record<number, boolean>>({});

  // Registration form fields (kept intact across navigation)
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [regIdentifier, setRegIdentifier] = useState(pendingEmail);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regPhotoUrl, setRegPhotoUrl] = useState('');
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Login form fields (kept intact across navigation)
  const [loginIdentifier, setLoginIdentifier] = useState(pendingEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Forgot password field
  const [forgotIdentifier, setForgotIdentifier] = useState('');

  // Role & location fields (for Google Sign-In or rural local mode)
  const [fullName, setFullName] = useState(pendingName);
  const [phone, setPhone] = useState('+243 ');
  const [email, setEmail] = useState(pendingEmail);
  const [selectedRole, setSelectedRole] = useState<UserRole>('agriculteur');
  const [province, setProvince] = useState('Kinshasa');
  const [city, setCity] = useState('Kinshasa');
  const [sector, setSector] = useState('');
  const [activityType, setActivityType] = useState('Cultures vivrières (manioc, maïs)');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeUid, setActiveUid] = useState(pendingUid || '');
  const [isOfflineSession, setIsOfflineSession] = useState(false);

  useEffect(() => {
    if (step !== 'welcome') return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % WELCOME_HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [step]);

  const selectableRoles: UserRole[] = [
    'agriculteur',
    'acheteur',
    'vendeur',
    'fournisseur',
    'cooperative',
    'transporteur',
    'expert',
    'investisseur',
  ];

  const handleSelectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setPhotoProcessing(true);
    try {
      const base64DataUrl = await prepareUserPhotoBase64(file);
      setRegPhotoUrl(base64DataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du chargement de la photo.');
    } finally {
      setPhotoProcessing(false);
      e.target.value = '';
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setActiveUid(cred.user.uid);
      setFullName(cred.user.displayName || 'Utilisateur AgriSmart');
      setEmail(cred.user.email || '');
      setIsOfflineSession(false);
      setStep('roleSetup');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur Google Auth';
      setErrorMsg(`Connexion Google impossible : ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (lastName.trim().length < 2) {
      setErrorMsg('Le nom est obligatoire (minimum 2 caractères).');
      return;
    }
    if (firstName.trim().length < 2) {
      setErrorMsg('Le prénom est obligatoire (minimum 2 caractères).');
      return;
    }
    if (!isValidEmailOrPhone(regIdentifier)) {
      setErrorMsg('Veuillez saisir une adresse e-mail ou un numéro de téléphone valide.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Le mot de passe et sa confirmation ne correspondent pas.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg("Veuillez accepter les Conditions d'utilisation avant de créer votre compte.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'AgriSmart-RDC',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          identifier: regIdentifier.trim(),
          password: regPassword,
          confirmPassword: regConfirmPassword,
          photoUrl: regPhotoUrl,
          acceptedTerms,
          language,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || "Impossible de créer le compte pour le moment.");
        return;
      }
      const userProfile: UserProfile = {
        ...data.user,
        photoUrl: data.user.photoUrl || regPhotoUrl || undefined,
      };
      if (onDirectSignIn) {
        onDirectSignIn(userProfile);
      } else {
        await onCompleteProfile(userProfile, true);
      }
    } catch {
      setErrorMsg("Erreur réseau lors de la création du compte. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidEmailOrPhone(loginIdentifier)) {
      setErrorMsg('Veuillez saisir une adresse e-mail ou un numéro de téléphone valide.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Veuillez saisir votre mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'AgriSmart-RDC',
        },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.user) {
        if (onDirectSignIn) {
          onDirectSignIn(data.user);
        } else {
          await onCompleteProfile(data.user, true);
        }
        return;
      }

      // Fallback check against Firebase Auth if user registered earlier with email/password on Firebase
      if (isValidEmail(loginIdentifier.trim())) {
        try {
          const cred = await signInWithEmailAndPassword(auth, loginIdentifier.trim(), loginPassword);
          setActiveUid(cred.user.uid);
          setFullName(cred.user.displayName || loginIdentifier.split('@')[0]);
          setEmail(cred.user.email || loginIdentifier.trim());
          setIsOfflineSession(false);
          setStep('roleSetup');
          return;
        } catch {
          // Fall through to show clean error
        }
      }

      setErrorMsg(data.error || 'Identifiant ou mot de passe incorrect.');
    } catch {
      setErrorMsg('Impossible de joindre le serveur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!isValidEmailOrPhone(forgotIdentifier)) {
      setErrorMsg('Veuillez saisir une adresse e-mail ou un numéro de téléphone valide.');
      return;
    }
    setLoading(true);
    try {
      if (isValidEmail(forgotIdentifier.trim())) {
        try {
          await sendPasswordResetEmail(auth, forgotIdentifier.trim());
        } catch {
          // Non-blocking if email provider disabled on Firebase
        }
      }
      const resp = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'AgriSmart-RDC',
        },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || "Impossible d'enregistrer la demande.");
        return;
      }
      setSuccessMsg(data.message);
      setStep('resetInfo');
    } catch {
      setErrorMsg('Erreur lors de la demande de réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLocalMode = () => {
    setIsOfflineSession(true);
    setActiveUid(`local-${Date.now()}`);
    if (!fullName.trim()) {
      setFullName('Exploitant RDC');
    }
    setStep('roleSetup');
  };

  const handleFinishRoleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const uid = activeUid || auth.currentUser?.uid || `local-${Date.now()}`;
      await onCompleteProfile(
        {
          uid,
          displayName: fullName.trim() || auth.currentUser?.displayName || 'Exploitant RDC',
          role: selectedRole,
          province,
          city: city.trim() || province,
          sector: sector.trim() || undefined,
          activityType: activityType.trim() || ROLE_META[selectedRole].label,
          description: ROLE_META[selectedRole].shortDesc,
          photoUrl: regPhotoUrl || auth.currentUser?.photoURL || undefined,
          language,
          email: email.trim() || auth.currentUser?.email || undefined,
          phone: phone.trim(),
          accountVerified: Boolean(auth.currentUser?.emailVerified),
          authProvider: auth.currentUser ? 'firebase' : 'local',
          isPublic: true,
        },
        isOfflineSession || !auth.currentUser
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du profil.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // 1. FULLSCREEN WELCOME SCREEN WITH ANIMATED AGRI SLIDESHOW
  // ==========================================================
  if (step === 'welcome') {
    const nextHeroIndex = (heroIndex + 1) % WELCOME_HERO_SLIDES.length;

    return (
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between bg-gradient-to-br from-[#0E3F22] via-[#13522D] to-[#0B2A17]">
        {/* Animated Agricultural Background Carousel (current + next preloaded to save mobile data) */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {WELCOME_HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === heroIndex;
            const shouldMount = isActive || idx === nextHeroIndex;
            if (!shouldMount || failedHeroIndices[idx]) return null;
            return (
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.caption}
                referrerPolicy="no-referrer"
                onError={() =>
                  setFailedHeroIndices((prev) => ({ ...prev, [idx]: true }))
                }
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 animate-ken-burns' : 'opacity-0'
                }`}
              />
            );
          })}
          {/* Dark transparent filter ensuring crisp text contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/85" />
        </div>

        {/* Top Language Switcher */}
        <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 pt-5">
          <span className="text-xs font-medium text-white/90">
            République démocratique du Congo
          </span>
          <label className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white rounded-xl px-3 py-2 text-xs font-medium border border-white/20">
            <Globe className="w-3.5 h-3.5" />
            <select
              aria-label="Choisir la langue"
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as LanguageCode)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
                <option key={code} value={code} className="text-[#263238]">
                  {LANGUAGE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
        </header>

        {/* Center Brand & Slogan */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-10 max-w-2xl mx-auto">
          <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl mb-6">
            <AgriSmartLogo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
            « {t(language, 'slogan')} »
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/90 max-w-lg leading-relaxed">
            Vendez vos récoltes, achetez des intrants fiables, suivez votre carnet agricole hors connexion et accédez aux prévisions météo de votre province.
          </p>

          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setStep('gateway');
            }}
            className="mt-8 w-full max-w-xs inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#168447] hover:bg-[#126c3a] active:scale-[0.99] text-white font-semibold text-base px-8 py-4 shadow-lg transition-all min-h-[52px]"
          >
            <span>{t(language, 'startBtn')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </main>

        {/* Bottom Presentation Indicators + Scene Caption */}
        <footer className="relative z-10 pb-8 px-4 flex flex-col items-center gap-3">
          <p className="text-xs text-white/80 font-medium text-center">
            {WELCOME_HERO_SLIDES[heroIndex]?.caption}
          </p>
          <div className="flex items-center gap-2.5" aria-label="Indicateurs de présentation">
            {[0, 1, 2].map((dot) => {
              const active = heroIndex % 3 === dot;
              return (
                <button
                  key={dot}
                  type="button"
                  aria-label={`Image agricole ${dot + 1}`}
                  onClick={() => setHeroIndex(dot)}
                  className={`h-2.5 rounded-full transition-all ${
                    active ? 'w-8 bg-[#168447]' : 'w-2.5 bg-white/55 hover:bg-white/80'
                  }`}
                />
              );
            })}
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================================
  // 2. GATEWAY PAGE: « Bienvenue sur AgriSmart-RDC »
  // ==========================================================
  if (step === 'gateway') {
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-lg w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep('welcome')}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-sm font-semibold text-[#263238] hover:border-[#168447] hover:text-[#168447] min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <AgriSmartLogo size="sm" />
        </div>

        <main className="max-w-lg w-full mx-auto my-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-9 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <AgriSmartLogo size="md" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#263238] leading-snug">
            Bienvenue sur AgriSmart-RDC
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            « {t(language, 'slogan')} » — Rejoignez la plateforme agricole congolaise pour vendre, acheter, gérer votre exploitation et échanger avec des experts.
          </p>

          <div className="mt-8 space-y-3.5">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setStep('register');
              }}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#168447] hover:bg-[#126c3a] text-white font-semibold text-base py-4 px-6 shadow-sm transition-colors min-h-[54px]"
            >
              <UserPlus className="w-5 h-5" />
              <span>Créer un compte</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setStep('login');
              }}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white hover:bg-[#E8F5E9]/40 text-[#1976D2] border-2 border-[#1976D2] font-semibold text-base py-4 px-6 transition-colors min-h-[54px]"
            >
              <LogIn className="w-5 h-5" />
              <span>Se connecter</span>
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setSlideIndex(0);
                setStep('intro');
              }}
              className="font-medium text-[#1976D2] hover:underline py-2"
            >
              Découvrir la présentation (3 étapes)
            </button>
            <button
              type="button"
              onClick={handleStartLocalMode}
              className="inline-flex items-center gap-1.5 font-medium text-[#168447] hover:underline py-2"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Mode rural hors connexion</span>
            </button>
          </div>
        </main>

        <footer className="text-center text-xs text-slate-500">
          AgriSmart-RDC · Adapté aux 26 provinces et aux connexions faibles
        </footer>
      </div>
    );
  }

  // ==========================================================
  // 3. THREE INTRO SLIDES
  // ==========================================================
  if (step === 'intro') {
    const slide = INTRO_SLIDES[slideIndex];
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-3xl w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep('gateway')}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#263238] hover:text-[#168447] min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <AgriSmartLogo size="sm" />
          <button
            type="button"
            onClick={() => setStep('register')}
            className="text-sm font-medium text-slate-600 hover:text-[#168447] min-h-[44px] px-3"
          >
            {t(language, 'skip')}
          </button>
        </div>

        <div className="max-w-3xl w-full mx-auto my-6 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm grid md:grid-cols-2 items-stretch">
          <div className="h-60 md:h-auto min-h-[280px]">
            <ResilientImage src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
          </div>
          <div className="p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#1976D2]">
                Étape {slideIndex + 1} sur 3
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#263238] leading-snug">{slide.title}</h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">{slide.body}</p>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {INTRO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Présentation ${idx + 1}`}
                    onClick={() => setSlideIndex(idx)}
                    className={`h-2.5 rounded-full transition-all ${
                      idx === slideIndex ? 'w-8 bg-[#168447]' : 'w-2.5 bg-slate-300'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (slideIndex < 2) {
                    setSlideIndex(slideIndex + 1);
                  } else {
                    setStep('gateway');
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#168447] hover:bg-[#126c3a] text-white font-semibold text-sm px-5 py-3 min-h-[44px]"
              >
                <span>{slideIndex < 2 ? t(language, 'next') : 'Continuer'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          AgriSmart-RDC · Adapté aux connexions faibles et aux zones rurales
        </div>
      </div>
    );
  }

  // ==========================================================
  // 4. TERMS & PRIVACY PAGES
  // ==========================================================
  if (step === 'terms' || step === 'privacy') {
    const isTerms = step === 'terms';
    return (
      <div className="min-h-screen bg-[#F5F7F5] py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
          <button
            type="button"
            onClick={() => setStep(returnStep)}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#168447] mb-4 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <h1 className="text-2xl font-bold text-[#263238]">
            {isTerms ? "Conditions d'utilisation — AgriSmart-RDC" : 'Politique de confidentialité — AgriSmart-RDC'}
          </h1>
          <div className="mt-4 space-y-4 text-sm text-slate-600 leading-relaxed">
            {isTerms ? (
              <>
                <p>1. AgriSmart-RDC met en relation les acteurs de la chaîne de valeur agricole en République démocratique du Congo.</p>
                <p>2. Les vendeurs s’engagent à publier des informations exactes sur la qualité, la quantité, le prix et la localisation des produits.</p>
                <p>3. Les diagnostics de maladies par photo et les conseils de l’assistant virtuel sont strictement indicatifs et ne remplacent pas l’avis d’un agronome agréé.</p>
                <p>4. Les demandes de financement soumises via la plateforme sont étudiées par les institutions partenaires sans garantie d’approbation automatique.</p>
              </>
            ) : (
              <>
                <p>1. Vos coordonnées privées (adresse e-mail et numéro de téléphone) sont isolées dans un espace sécurisé et ne sont accessibles qu’à vous-même et à l’administration en cas de support.</p>
                <p>2. AgriSmart-RDC ne collecte ni ne stocke jamais de code PIN ou mot de passe Mobile Money (M-Pesa, Airtel Money, Orange Money).</p>
                <p>3. Les données du Carnet Agricole enregistrées hors connexion restent stockées localement sur votre appareil jusqu’à synchronisation.</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 5. ROLE & LOCATION SELECTION (for Google Sign-In / Rural mode)
  // ==========================================================
  if (step === 'roleSetup') {
    return (
      <div className="min-h-screen bg-[#F5F7F5] py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              type="button"
              onClick={() => setStep('gateway')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#263238] hover:text-[#168447] min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </button>
            <AgriSmartLogo size="sm" />
            {isOfflineSession && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <WifiOff className="w-3.5 h-3.5" />
                Mode local hors connexion
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#263238]">
            Configurez votre profil agricole
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Choisissez votre rôle principal pour personnaliser votre tableau de bord et indiquez votre localisation en RDC.
          </p>

          {errorMsg && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleFinishRoleSetup} className="mt-6 space-y-6">
            {/* Optional Gallery Photo Picker for Google / Rural Onboarding */}
            <div className="rounded-2xl bg-[#F5F7F5] border border-slate-200 p-4 flex flex-col sm:flex-row items-center gap-4">
              <UserAvatar
                photoUrl={regPhotoUrl || auth.currentUser?.photoURL || undefined}
                name={fullName || 'Utilisateur'}
                size="lg"
              />
              <input
                type="file"
                accept="image/*"
                id="role-setup-photo-input"
                onChange={handleSelectPhoto}
                className="sr-only"
                aria-label="Choisir une photo de profil depuis la galerie"
              />
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <label
                  htmlFor="role-setup-photo-input"
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#168447] px-3 py-2 text-xs font-semibold text-[#263238] min-h-[40px]"
                >
                  <Camera className="w-3.5 h-3.5 text-[#168447]" />
                  <span>{photoProcessing ? 'Conversion...' : regPhotoUrl ? 'Modifier la photo' : 'Choisir une photo'}</span>
                </label>
                {regPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setRegPhotoUrl('')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 min-h-[40px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#263238] mb-2.5">
                Quel est votre profil ?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectableRoles.map((roleKey) => {
                  const meta = ROLE_META[roleKey];
                  const active = selectedRole === roleKey;
                  return (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => setSelectedRole(roleKey)}
                      className={`text-left rounded-2xl p-4 border transition-all min-h-[64px] ${
                        active
                          ? 'bg-[#E8F5E9] border-[#168447] text-[#263238]'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-[#263238]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{meta.label}</span>
                        {active && <CheckCircle2 className="w-4 h-4 text-[#168447] shrink-0" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">{meta.shortDesc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Nom complet / Structure</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#168447] focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Téléphone (RDC)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+243 81 000 0000"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#168447] focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Province</label>
                <select
                  value={province}
                  onChange={(e) => {
                    const p = e.target.value;
                    setProvince(p);
                    const found = DRC_PROVINCES.find((item) => item.name === p);
                    if (found) setCity(found.city);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#168447] focus:outline-none min-h-[44px]"
                >
                  {DRC_PROVINCES.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Ville ou territoire</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#168447] focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Secteur / Village (optionnel)</label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="Ex. Secteur Luozi / Limete"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#168447] focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Activité principale</label>
                <input
                  type="text"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#168447] focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#168447] hover:bg-[#126c3a] disabled:opacity-60 text-white font-semibold py-3.5 px-6 text-sm min-h-[48px]"
            >
              {loading ? 'Enregistrement en cours...' : 'Accéder à mon tableau de bord AgriSmart-RDC'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 6. ACCOUNT VERIFICATION & PASSWORD RESET INFO
  // ==========================================================
  if (step === 'verify' || step === 'resetInfo') {
    const isVerify = step === 'verify';
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#168447] flex items-center justify-center mx-auto mb-4">
            {isVerify ? <ShieldCheck className="w-7 h-7" /> : <Mail className="w-7 h-7" />}
          </div>
          <h2 className="text-xl font-bold text-[#263238]">
            {isVerify ? 'Vérification du compte' : 'Réinitialisation du mot de passe'}
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {isVerify
              ? `Un lien de vérification a été envoyé à ${email || 'votre adresse e-mail'}.`
              : `Consultez votre boîte de réception ou vos messages (${forgotIdentifier}) pour suivre les instructions de récupération.`}
          </p>
          {successMsg && <p className="mt-3 text-xs font-medium text-[#168447]">{successMsg}</p>}
          <div className="mt-6 space-y-3">
            {isVerify ? (
              <button
                type="button"
                onClick={() => setStep('roleSetup')}
                className="w-full rounded-xl bg-[#168447] text-white font-semibold py-3 text-sm min-h-[44px]"
              >
                Continuer vers la configuration du profil
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep('login')}
                className="w-full rounded-xl bg-[#168447] text-white font-semibold py-3 text-sm min-h-[44px]"
              >
                Retour à la connexion
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 7. REGISTER, LOGIN & FORGOT PASSWORD FORMS
  // ==========================================================
  const handleBackFromAuthForm = () => {
    setErrorMsg('');
    if (step === 'forgot') {
      setStep('login');
    } else {
      setStep('gateway');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col justify-center py-6 px-4">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-5">
          <button
            type="button"
            onClick={handleBackFromAuthForm}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-[#263238] hover:border-[#168447] hover:text-[#168447] min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <AgriSmartLogo size="sm" />
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-700 leading-relaxed">
            {errorMsg}
          </div>
        )}

        {step === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <h1 className="text-xl font-bold text-[#263238]">Mot de passe oublié</h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Saisissez votre adresse e-mail ou votre numéro de téléphone associé à votre compte AgriSmart-RDC.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Adresse e-mail ou numéro de téléphone
              </label>
              <input
                type="text"
                required
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                placeholder="Ex. nom@exemple.cd ou +243 81 000 0000"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#168447] hover:bg-[#126c3a] text-white font-semibold py-3 text-sm min-h-[48px]"
            >
              {loading ? 'Envoi en cours...' : 'Réinitialiser mon mot de passe'}
            </button>
          </form>
        ) : step === 'register' ? (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-[#263238]">Créer un compte</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Renseignez vos informations pour rejoindre AgriSmart-RDC.
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
              {/* Gallery Profile Photo Picker */}
              <div className="rounded-2xl bg-[#F5F7F5] border border-slate-200 p-4 flex flex-col items-center gap-3">
                <UserAvatar
                  photoUrl={regPhotoUrl}
                  name={`${firstName} ${lastName}`.trim() || 'Nouvel utilisateur'}
                  size="xl"
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelectPhoto}
                  className="sr-only"
                  aria-label="Sélectionner une photo de profil depuis la galerie"
                />
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={photoProcessing}
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#168447] px-3 py-2 text-xs font-semibold text-[#263238] min-h-[40px]"
                  >
                    {regPhotoUrl ? <Pencil className="w-3.5 h-3.5 text-[#168447]" /> : <Camera className="w-3.5 h-3.5 text-[#168447]" />}
                    <span>
                      {photoProcessing
                        ? 'Chargement...'
                        : regPhotoUrl
                          ? 'Modifier la photo'
                          : 'Photo depuis la galerie'}
                    </span>
                  </button>
                  {regPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setRegPhotoUrl('')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 min-h-[40px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  Optionnel · Une photo par défaut est utilisée si vous n’en choisissez pas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nom <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex. Kabamba"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Prénom <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex. Jean-Pierre"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Adresse e-mail ou numéro de téléphone <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regIdentifier}
                  onChange={(e) => setRegIdentifier(e.target.value)}
                  placeholder="Ex. nom@exemple.cd ou +243 81 000 0000"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mot de passe <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="6 caractères minimum"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-11 text-sm min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    aria-label={showRegPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-2 top-1.5 p-2 text-slate-500"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Confirmation du mot de passe <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegConfirm ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Saisissez à nouveau le mot de passe"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-11 text-sm min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirm(!showRegConfirm)}
                    aria-label={showRegConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                    className="absolute right-2 top-1.5 p-2 text-slate-500"
                  >
                    {showRegConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#168447]"
                />
                <span>
                  J’accepte les{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setReturnStep('register');
                      setStep('terms');
                    }}
                    className="text-[#1976D2] underline"
                  >
                    Conditions d'utilisation
                  </button>{' '}
                  et la{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setReturnStep('register');
                      setStep('privacy');
                    }}
                    className="text-[#1976D2] underline"
                  >
                    Politique de confidentialité
                  </button>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#168447] hover:bg-[#126c3a] disabled:opacity-60 text-white font-semibold py-3.5 text-sm min-h-[48px]"
              >
                {loading ? 'Création en cours...' : 'Créer mon compte'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs text-slate-400">ou</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#263238] font-semibold text-sm py-3 px-4 transition-colors min-h-[48px]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            <p className="mt-4 text-center text-xs text-slate-600">
              Déjà inscrit ?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('login');
                }}
                className="font-semibold text-[#1976D2] hover:underline"
              >
                Se connecter
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-[#263238]">Se connecter</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Accédez à votre espace personnel AgriSmart-RDC.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Adresse e-mail ou numéro de téléphone
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Ex. nom@exemple.cd ou +243 81 000 0000"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">Mot de passe</label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setForgotIdentifier(loginIdentifier);
                      setStep('forgot');
                    }}
                    className="text-xs font-medium text-[#1976D2] hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-11 text-sm min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-2 top-1.5 p-2 text-slate-500"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#168447] hover:bg-[#126c3a] disabled:opacity-60 text-white font-semibold py-3.5 text-sm min-h-[48px]"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs text-slate-400">ou</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#263238] font-semibold text-sm py-3 px-4 transition-colors min-h-[48px]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            <p className="mt-5 text-center text-xs text-slate-600">
              Nouveau sur AgriSmart-RDC ?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('register');
                }}
                className="font-semibold text-[#168447] hover:underline"
              >
                Créer un compte
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
