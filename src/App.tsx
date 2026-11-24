import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bot,
  CalendarDays,
  Camera,
  CloudSun,
  Coins,
  Compass,
  GraduationCap,
  HelpCircle,
  Home,
  Menu,
  MessageSquare,
  NotebookPen,
  PlusCircle,
  Settings,
  Shield,
  ShoppingBag,
  Sprout,
  Tractor,
  Truck,
  Users,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  handleFirestoreError,
} from './lib/firebase';
import {
  OFFLINE_KEYS,
  loadCachedProducts,
  loadFavorites,
  loadLanguage,
  loadLocalFarmRecords,
  safeLoadJSON,
  safeSaveJSON,
  saveCachedProducts,
  saveFavorites,
  saveLanguage,
  saveLocalFarmRecords,
  useOnlineStatus,
} from './lib/offlineStore';
import {
  SEED_COMMUNITY_POSTS,
  SEED_DIRECTORY_ACTORS,
  SEED_EQUIPMENT,
  SEED_EVENTS,
  SEED_NOTIFICATIONS,
  SEED_PRODUCTS,
  SEED_REVIEWS,
} from './data/drcData';
import { LANGUAGE_LABELS, t } from './i18n/translations';
import type {
  ActorReview,
  AgriEvent,
  AppIdentityState,
  AppSection,
  BookingStatus,
  ChatMessage,
  CommunityPost,
  Conversation,
  Delivery,
  DeliveryStatus,
  Equipment,
  EquipmentBooking,
  FarmRecord,
  FundingApplication,
  LanguageCode,
  MobileMoneyIntent,
  ModerationStatus,
  NotificationItem,
  Order,
  OrderStatus,
  Product,
  SupportTicket,
  UserProfile,
} from './types/agrismart';
import { AgriSmartLogo, AppLogoProvider, UserAvatar } from './components/Logo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeAndAuth } from './components/WelcomeAndAuth';
import { DashboardHome } from './components/DashboardHome';
import { MarketplaceView } from './components/MarketplaceView';
import { MachineryView } from './components/MachineryView';
import { OrdersLogisticsView } from './components/OrdersLogisticsView';
import { FarmNotebookView } from './components/FarmNotebookView';
import { WeatherAlertsView } from './components/WeatherAlertsView';
import { AssistantAndDiagnoseView } from './components/AssistantAndDiagnoseView';
import { CommunityAndMapView } from './components/CommunityAndMapView';
import { LearningAndFundingView } from './components/LearningAndFundingView';
import { MessagesView } from './components/MessagesView';
import { ProfileAndAdminView } from './components/ProfileAndAdminView';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AgriSmartApp() {
  const isOnline = useOnlineStatus();
  const [language, setLanguage] = useState<LanguageCode>(() => loadLanguage());
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    safeLoadJSON<UserProfile | null>(OFFLINE_KEYS.LOCAL_PROFILE, null)
  );
  const [needsRoleSetup, setNeedsRoleSetup] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [appIdentity, setAppIdentity] = useState<AppIdentityState>({
    logoUrl: null,
    logoChanged: false,
  });

  // Navigation
  const [section, setSection] = useState<AppSection>('home');
  const [historyStack, setHistoryStack] = useState<AppSection[]>([]);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [marketSearchPrefill, setMarketSearchPrefill] = useState('');
  const [marketCategoryPrefill, setMarketCategoryPrefill] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Domain Data State (Firestore + Offline Hybrid)
  const [cloudProducts, setCloudProducts] = useState<Product[]>([]);
  const [myCloudProducts, setMyCloudProducts] = useState<Product[]>([]);
  const [cloudEquipment, setCloudEquipment] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<EquipmentBooking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [farmRecords, setFarmRecords] = useState<FarmRecord[]>(() => loadLocalFarmRecords());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(SEED_COMMUNITY_POSTS);
  const [fundingApps, setFundingApps] = useState<FundingApplication[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Local persisted collections
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [paymentIntents, setPaymentIntents] = useState<MobileMoneyIntent[]>(() =>
    safeLoadJSON<MobileMoneyIntent[]>(OFFLINE_KEYS.MOBILE_MONEY_INTENTS, [])
  );
  const [events, setEvents] = useState<AgriEvent[]>(() => [
    ...SEED_EVENTS,
    ...safeLoadJSON<AgriEvent[]>(OFFLINE_KEYS.LOCAL_EVENTS, []),
  ]);
  const [completedLessons, setCompletedLessons] = useState<string[]>(() =>
    safeLoadJSON<string[]>(OFFLINE_KEYS.COMPLETED_LESSONS, [])
  );
  const [quizScores, setQuizScores] = useState<{ level: string; score: number; total: number; date: string }[]>(() =>
    safeLoadJSON(OFFLINE_KEYS.QUIZ_SCORES, [])
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [reviews, setReviews] = useState<ActorReview[]>(SEED_REVIEWS);

  const isPrimaryAdmin =
    Boolean(
      firebaseUid &&
        auth.currentUser?.email?.toLowerCase() === ADMIN_EMAIL &&
        auth.currentUser?.emailVerified
    ) ||
    Boolean(
      profile?.authProvider === 'server' &&
        profile?.email?.toLowerCase() === ADMIN_EMAIL
    );

  const isAdminUser = isPrimaryAdmin || profile?.role === 'administrateur';

  const isCloudVerified = Boolean(firebaseUid && auth.currentUser?.emailVerified);

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    saveLanguage(lang);
  };

  // Load Global App Identity (Server + Firestore single-doc lock)
  useEffect(() => {
    let active = true;
    const fetchIdentity = async () => {
      try {
        const resp = await fetch('/api/app-identity');
        if (resp.ok) {
          const data = await resp.json();
          if (active && data.logoChanged && data.logoUrl) {
            setAppIdentity({
              logoUrl: data.logoUrl,
              logoChanged: true,
              changedAt: data.changedAt,
            });
            return;
          }
        }
      } catch {
        // fallback to Firestore check
      }
      try {
        const snap = await getDoc(doc(db, 'appConfig', 'identity'));
        if (active && snap.exists()) {
          const d = snap.data() as { logoUrl?: string; logoChanged?: boolean };
          if (d.logoChanged && d.logoUrl) {
            setAppIdentity({ logoUrl: d.logoUrl, logoChanged: true });
          }
        }
      } catch {
        // keep default logo
      }
    };
    fetchIdentity();
    return () => {
      active = false;
    };
  }, []);

  // Auth Listener (Firebase Auth + Server Session Cookie)
  useEffect(() => {
    let mounted = true;
    const initServerSession = async () => {
      try {
        const resp = await fetch('/api/auth/session');
        if (resp.ok) {
          const data = await resp.json();
          if (mounted && data.authenticated && data.user) {
            setProfile(data.user);
            safeSaveJSON(OFFLINE_KEYS.LOCAL_PROFILE, data.user);
            setNeedsRoleSetup(false);
          }
        }
      } catch {
        // keep cached local profile if offline
      }
    };
    initServerSession();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUid(user.uid);
        setPendingName(user.displayName || '');
        setPendingEmail(user.email || '');
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            const merged = { ...data, email: user.email || data.email, authProvider: 'firebase' as const };
            setProfile(merged);
            safeSaveJSON(OFFLINE_KEYS.LOCAL_PROFILE, merged);
            setNeedsRoleSetup(false);
          } else {
            setNeedsRoleSetup(true);
          }
        } catch {
          if (!profile) {
            setNeedsRoleSetup(true);
          }
        }
      } else {
        setFirebaseUid(null);
      }
      if (mounted) setAuthReady(true);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Firestore Real-Time Listeners when authenticated
  useEffect(() => {
    if (!firebaseUid) return;

    const unsubs: (() => void)[] = [];

    // 1. Public Products
    unsubs.push(
      onSnapshot(
        query(collection(db, 'products'), where('moderationStatus', '==', 'published')),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
          setCloudProducts(items);
          saveCachedProducts(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'products')
      )
    );

    // 2. My Products
    unsubs.push(
      onSnapshot(
        query(collection(db, 'products'), where('ownerId', '==', firebaseUid)),
        (snap) => {
          setMyCloudProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'products/mine')
      )
    );

    // 3. Equipment
    unsubs.push(
      onSnapshot(
        query(collection(db, 'equipment'), where('moderationStatus', '==', 'published')),
        (snap) => {
          setCloudEquipment(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Equipment, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'equipment')
      )
    );

    // 4. Orders (as buyer & seller)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'orders'), where('buyerId', '==', firebaseUid)),
        (snap) => {
          const bought = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
          setOrders((prev) => {
            const others = prev.filter((o) => o.buyerId !== firebaseUid);
            return [...bought, ...others];
          });
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'orders/buyer')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'orders'), where('sellerId', '==', firebaseUid)),
        (snap) => {
          const sold = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
          setOrders((prev) => {
            const map = new Map<string, Order>();
            [...prev, ...sold].forEach((o) => map.set(o.id, o));
            return Array.from(map.values());
          });
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'orders/seller')
      )
    );

    // 5. Deliveries (available)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'deliveries'), where('status', '==', 'available')),
        (snap) => {
          const openDels = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Delivery, 'id'>) }));
          setDeliveries((prev) => {
            const map = new Map<string, Delivery>();
            [...prev.filter((d) => d.status !== 'available'), ...openDels].forEach((d) =>
              map.set(d.id, d)
            );
            return Array.from(map.values());
          });
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'deliveries')
      )
    );

    // 6. Farm Records (owner)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'farmRecords'), where('ownerId', '==', firebaseUid)),
        (snap) => {
          const remote = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FarmRecord, 'id'>),
            pendingSync: false,
          }));
          setFarmRecords((prev) => {
            const pending = prev.filter((r) => r.pendingSync);
            const merged = [...pending, ...remote.filter((r) => !pending.some((p) => p.id === r.id))];
            saveLocalFarmRecords(merged);
            return merged;
          });
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'farmRecords')
      )
    );

    // 7. Community Posts
    unsubs.push(
      onSnapshot(
        query(collection(db, 'communityPosts'), where('moderationStatus', '==', 'published')),
        (snap) => {
          const remote = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<CommunityPost, 'id'>),
          }));
          setCommunityPosts([...remote, ...SEED_COMMUNITY_POSTS]);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'communityPosts')
      )
    );

    // 8. Conversations (participantA & participantB)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'conversations'), where('participantA', '==', firebaseUid)),
        (snap) => {
          const listA = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }));
          setConversations((prev) => {
            const map = new Map<string, Conversation>();
            [...prev, ...listA].forEach((c) => map.set(c.id, c));
            return Array.from(map.values());
          });
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'conversations/A')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'conversations'), where('participantB', '==', firebaseUid)),
        (snap) => {
          const listB = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }));
          setConversations((prev) => {
            const map = new Map<string, Conversation>();
            [...prev, ...listB].forEach((c) => map.set(c.id, c));
            return Array.from(map.values());
          });
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'conversations/B')
      )
    );

    // 9. Funding Applications
    unsubs.push(
      onSnapshot(
        query(collection(db, 'fundingApplications'), where('applicantId', '==', firebaseUid)),
        (snap) => {
          setFundingApps(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FundingApplication, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'fundingApplications')
      )
    );

    // 10. Support Tickets
    unsubs.push(
      onSnapshot(
        query(collection(db, 'supportTickets'), where('userId', '==', firebaseUid)),
        (snap) => {
          setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SupportTicket, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'supportTickets')
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUid]);

  // Listen to active conversation messages securely
  useEffect(() => {
    if (!firebaseUid || !activeConvId) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv) return;
    const fieldToMatch = conv.participantA === firebaseUid ? 'participantA' : 'participantB';
    const q = query(
      collection(db, 'conversations', activeConvId, 'messages'),
      where(fieldToMatch, '==', firebaseUid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) }));
        setMessagesByConv((prev) => ({ ...prev, [activeConvId]: msgs }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `conversations/${activeConvId}/messages`)
    );
    return () => unsub();
  }, [firebaseUid, activeConvId, conversations]);

  const navigateTo = (target: AppSection, searchPrefill?: string, categoryPrefill?: string) => {
    setHistoryStack((prev) => (prev[prev.length - 1] === section ? prev : [...prev.slice(-10), section]));
    if (searchPrefill !== undefined) setMarketSearchPrefill(searchPrefill);
    if (categoryPrefill !== undefined) setMarketCategoryPrefill(categoryPrefill);
    setSelectedProduct(null);
    setSection(target);
    setModulesOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBack = () => {
    if (selectedProduct) {
      setSelectedProduct(null);
      return;
    }
    const prev = historyStack[historyStack.length - 1];
    if (prev) {
      setHistoryStack((s) => s.slice(0, -1));
      setSection(prev);
    } else {
      setSection('home');
    }
  };

  const handleDirectSignIn = (signedInProfile: UserProfile) => {
    setProfile(signedInProfile);
    safeSaveJSON(OFFLINE_KEYS.LOCAL_PROFILE, signedInProfile);
    setNeedsRoleSetup(false);
    setSection('home');
  };

  const handleChangeAppLogo = async (logoDataUrl: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'AgriSmart-RDC',
    };
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch {
        // rely on server session cookie if present
      }
    }
    const resp = await fetch('/api/app-identity/logo', {
      method: 'POST',
      headers,
      body: JSON.stringify({ logoUrl: logoDataUrl }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      if (resp.status === 409) {
        setAppIdentity((prev) => ({ ...prev, logoChanged: true }));
      }
      throw new Error(data.error || "Impossible de modifier le logo de l'application.");
    }

    if (auth.currentUser && auth.currentUser.email?.toLowerCase() === ADMIN_EMAIL && auth.currentUser.emailVerified) {
      try {
        await setDoc(doc(db, 'appConfig', 'identity'), {
          logoUrl: logoDataUrl,
          logoChanged: true,
          changedBy: ADMIN_EMAIL,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Non-blocking if doc already exists in Firestore (rules forbid overwrite)
      }
    }

    setAppIdentity({
      logoUrl: data.logoUrl || logoDataUrl,
      logoChanged: true,
      changedAt: data.changedAt,
    });
  };

  const handleCompleteProfile = async (newProfile: UserProfile, isLocalMode: boolean) => {
    const firestoreProfile = {
      uid: newProfile.uid,
      displayName: newProfile.displayName,
      role: newProfile.role,
      province: newProfile.province,
      city: newProfile.city,
      sector: newProfile.sector || '',
      activityType: newProfile.activityType || '',
      description: newProfile.description || '',
      photoUrl: newProfile.photoUrl || '',
      language: newProfile.language || language,
      isPublic: true,
    };

    const fullLocalProfile: UserProfile = {
      ...firestoreProfile,
      firstName: newProfile.firstName,
      lastName: newProfile.lastName,
      email: newProfile.email,
      phone: newProfile.phone,
      authProvider: newProfile.authProvider || profile?.authProvider || 'local',
    };

    if (fullLocalProfile.authProvider === 'server') {
      try {
        const resp = await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'AgriSmart-RDC',
          },
          body: JSON.stringify({
            firstName: fullLocalProfile.firstName,
            lastName: fullLocalProfile.lastName,
            displayName: fullLocalProfile.displayName,
            province: fullLocalProfile.province,
            city: fullLocalProfile.city,
            sector: fullLocalProfile.sector,
            activityType: fullLocalProfile.activityType,
            description: fullLocalProfile.description,
            photoUrl: fullLocalProfile.photoUrl ?? '',
            language: fullLocalProfile.language,
            role: fullLocalProfile.role,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.user) {
            setProfile(data.user);
            safeSaveJSON(OFFLINE_KEYS.LOCAL_PROFILE, data.user);
            setNeedsRoleSetup(false);
            return;
          }
        }
      } catch {
        // Fallback to local storage update below when offline
      }
    }

    if (!isLocalMode && auth.currentUser && auth.currentUser.emailVerified) {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const existingUserSnap = await getDoc(userDocRef);
        if (existingUserSnap.exists()) {
          await updateDoc(userDocRef, {
            displayName: firestoreProfile.displayName,
            role: firestoreProfile.role,
            province: firestoreProfile.province,
            city: firestoreProfile.city,
            sector: firestoreProfile.sector,
            activityType: firestoreProfile.activityType,
            description: firestoreProfile.description,
            photoUrl: firestoreProfile.photoUrl,
            language: firestoreProfile.language,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(userDocRef, {
            ...firestoreProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const privateDocRef = doc(db, 'users', auth.currentUser.uid, 'private', 'info');
        const existingPrivateSnap = await getDoc(privateDocRef);
        if (existingPrivateSnap.exists()) {
          await updateDoc(privateDocRef, {
            email: newProfile.email || auth.currentUser.email || '',
            phone: newProfile.phone || '',
            accountVerified: true,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(privateDocRef, {
            uid: auth.currentUser.uid,
            email: newProfile.email || auth.currentUser.email || '',
            phone: newProfile.phone || '',
            accountVerified: true,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      }
    }

    setProfile(fullLocalProfile);
    safeSaveJSON(OFFLINE_KEYS.LOCAL_PROFILE, fullLocalProfile);
    setNeedsRoleSetup(false);
  };

  // Merge cloud + cached + seed products cleanly
  const cachedSeed = loadCachedProducts();
  const allProductsMap = new Map<string, Product>();
  [...SEED_PRODUCTS, ...cachedSeed, ...cloudProducts, ...myCloudProducts].forEach((p) => {
    allProductsMap.set(p.id, p);
  });
  const allProducts = Array.from(allProductsMap.values());

  const allEquipmentMap = new Map<string, Equipment>();
  [...SEED_EQUIPMENT, ...cloudEquipment].forEach((e) => allEquipmentMap.set(e.id, e));
  const allEquipment = Array.from(allEquipmentMap.values());

  // Loading / Auth Gate
  if (!authReady) {
    return (
      <AppLogoProvider logoUrl={appIdentity.logoUrl}>
        <div className="min-h-screen bg-[#F5F7F5] flex flex-col items-center justify-center p-6 gap-4">
          <AgriSmartLogo size="lg" />
          <p className="text-sm text-slate-600">Chargement d’AgriSmart-RDC...</p>
        </div>
      </AppLogoProvider>
    );
  }

  if (!profile || needsRoleSetup) {
    return (
      <AppLogoProvider logoUrl={appIdentity.logoUrl}>
        <WelcomeAndAuth
          language={language}
          onChangeLanguage={handleLanguageChange}
          initialStep={needsRoleSetup ? 'roleSetup' : 'welcome'}
          pendingUid={firebaseUid || undefined}
          pendingName={pendingName}
          pendingEmail={pendingEmail}
          onCompleteProfile={handleCompleteProfile}
          onDirectSignIn={handleDirectSignIn}
        />
      </AppLogoProvider>
    );
  }

  // Action Handlers
  const handlePublishProduct = async (
    input: Omit<Product, 'id' | 'ownerId' | 'sellerName' | 'moderationStatus'>
  ) => {
    const id = makeId('prod');
    const newProd: Product = {
      ...input,
      id,
      ownerId: profile.uid,
      sellerName: profile.displayName,
      moderationStatus: 'published',
    };
    if (isOnline && isCloudVerified) {
      try {
        await setDoc(doc(db, 'products', id), {
          ownerId: profile.uid,
          sellerName: profile.displayName,
          kind: input.kind,
          title: input.title,
          description: input.description || '',
          category: input.category,
          price: input.price,
          currency: input.currency,
          unit: input.unit,
          quantityAvailable: input.quantityAvailable,
          province: input.province,
          city: input.city,
          imageUrl: input.imageUrl || '',
          moderationStatus: 'published',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `products/${id}`);
      }
    }
    setMyCloudProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProductStatus = async (productId: string, status: ModerationStatus) => {
    if (isOnline && isCloudVerified && !productId.startsWith('ref-')) {
      try {
        await updateDoc(doc(db, 'products', productId), {
          moderationStatus: status,
          updatedAt: serverTimestamp(),
        });
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
      }
    }
    setMyCloudProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, moderationStatus: status } : p))
    );
    setCloudProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, moderationStatus: status } : p))
    );
  };

  const handleDeleteProduct = async (productId: string) => {
    if (isOnline && isCloudVerified && !productId.startsWith('ref-')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
      }
    }
    setMyCloudProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handlePlaceOrder = async (
    product: Product,
    quantity: number,
    deliveryAddress: string,
    operator?: 'M-Pesa' | 'Airtel Money' | 'Orange Money',
    mmPhone?: string
  ) => {
    const orderId = makeId('ord');
    const totalPrice = quantity * product.price;
    const newOrder: Order = {
      id: orderId,
      productId: product.id,
      productTitle: product.title,
      buyerId: profile.uid,
      sellerId: product.ownerId,
      quantity,
      totalPrice,
      currency: product.currency,
      deliveryAddress,
      status: 'nouvelle',
    };

    if (isOnline && isCloudVerified && !product.isReferenceSeed) {
      try {
        await setDoc(doc(db, 'orders', orderId), {
          productId: product.id,
          productTitle: product.title,
          buyerId: profile.uid,
          sellerId: product.ownerId,
          quantity,
          totalPrice,
          currency: product.currency,
          deliveryAddress,
          status: 'nouvelle',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
      }
    } else {
      setOrders((prev) => [newOrder, ...prev]);
    }

    if (operator) {
      const intent: MobileMoneyIntent = {
        id: makeId('mm'),
        orderId,
        operator,
        phone: mmPhone || profile.phone || '+243',
        amount: totalPrice,
        currency: product.currency,
        reference: `AGRI-${Date.now().toString().slice(-6)}`,
        status: 'En attente de configuration API opérateur',
        createdAt: new Date().toLocaleDateString('fr-FR'),
      };
      const nextIntents = [intent, ...paymentIntents];
      setPaymentIntents(nextIntents);
      safeSaveJSON(OFFLINE_KEYS.MOBILE_MONEY_INTENTS, nextIntents);
    }
  };

  const handleStartChat = async (peerId: string, peerName: string) => {
    if (peerId === profile.uid) {
      navigateTo('messages');
      return;
    }
    const existingConv = conversations.find(
      (c) =>
        (c.participantA === profile.uid && c.participantB === peerId) ||
        (c.participantB === profile.uid && c.participantA === peerId)
    );
    if (existingConv) {
      setActiveConvId(existingConv.id);
      navigateTo('messages');
      return;
    }

    const convId = makeId('conv');
    const matchedActor = SEED_DIRECTORY_ACTORS.find((a) => a.uid === peerId);
    const newConv: Conversation = {
      id: convId,
      participantA: profile.uid,
      participantB: peerId,
      peerName,
      peerPhotoUrl: matchedActor?.photoUrl,
      lastMessage: '',
    };

    if (isOnline && isCloudVerified && !peerId.startsWith('demo-')) {
      try {
        await setDoc(doc(db, 'conversations', convId), {
          participantA: profile.uid,
          participantB: peerId,
          lastMessage: '',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `conversations/${convId}`);
      }
    }
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(convId);
    navigateTo('messages');
  };

  const handleSendMessage = async (convId: string, text: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    const msgId = makeId('msg');
    const newMsg: ChatMessage = {
      id: msgId,
      senderId: profile.uid,
      participantA: conv.participantA,
      participantB: conv.participantB,
      text,
    };

    if (isOnline && isCloudVerified && !conv.participantB.startsWith('demo-')) {
      try {
        await setDoc(doc(db, 'conversations', convId, 'messages', msgId), {
          senderId: profile.uid,
          participantA: conv.participantA,
          participantB: conv.participantB,
          text,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'conversations', convId), {
          lastMessage: text.slice(0, 280),
          updatedAt: serverTimestamp(),
        });
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `conversations/${convId}/messages/${msgId}`);
      }
    }
    setMessagesByConv((prev) => ({ ...prev, [convId]: [...(prev[convId] || []), newMsg] }));
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, lastMessage: text } : c))
    );
  };

  const handleAddFarmRecord = async (rec: Omit<FarmRecord, 'id' | 'ownerId'>) => {
    const id = makeId('farm');
    const localRec: FarmRecord = {
      ...rec,
      id,
      ownerId: profile.uid,
      pendingSync: !(isOnline && isCloudVerified),
      updatedAtLocal: new Date().toISOString(),
    };

    if (isOnline && isCloudVerified) {
      try {
        const payload: Record<string, unknown> = {
          ownerId: profile.uid,
          recordType: rec.recordType,
          title: rec.title,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (rec.category) payload.category = rec.category;
        if (rec.amount !== undefined) payload.amount = rec.amount;
        if (rec.quantity !== undefined) payload.quantity = rec.quantity;
        if (rec.unit) payload.unit = rec.unit;
        if (rec.areaHa !== undefined) payload.areaHa = rec.areaHa;
        if (rec.date) payload.date = rec.date;
        if (rec.harvestDate) payload.harvestDate = rec.harvestDate;
        if (rec.notes) payload.notes = rec.notes;
        await setDoc(doc(db, 'farmRecords', id), payload);
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `farmRecords/${id}`);
      }
    }

    const updated = [localRec, ...farmRecords];
    setFarmRecords(updated);
    saveLocalFarmRecords(updated);
  };

  const handleSyncPendingFarmRecords = async () => {
    if (!isOnline || !isCloudVerified) return;
    const pending = farmRecords.filter((r) => r.pendingSync);
    for (const rec of pending) {
      const payload: Record<string, unknown> = {
        ownerId: profile.uid,
        recordType: rec.recordType,
        title: rec.title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (rec.category) payload.category = rec.category;
      if (rec.amount !== undefined) payload.amount = rec.amount;
      if (rec.quantity !== undefined) payload.quantity = rec.quantity;
      if (rec.unit) payload.unit = rec.unit;
      if (rec.areaHa !== undefined) payload.areaHa = rec.areaHa;
      if (rec.date) payload.date = rec.date;
      if (rec.harvestDate) payload.harvestDate = rec.harvestDate;
      if (rec.notes) payload.notes = rec.notes;
      await setDoc(doc(db, 'farmRecords', rec.id), payload);
    }
    const synced = farmRecords.map((r) => ({ ...r, pendingSync: false }));
    setFarmRecords(synced);
    saveLocalFarmRecords(synced);
  };

  const secondaryModules: { id: AppSection; label: string; icon: React.ReactNode }[] = [
    { id: 'inputs', label: 'Intrants & Équipements', icon: <Sprout className="w-4 h-4" /> },
    { id: 'machinery', label: 'Location de Machines', icon: <Tractor className="w-4 h-4" /> },
    { id: 'orders', label: 'Commandes & Livraisons', icon: <Truck className="w-4 h-4" /> },
    { id: 'notebook', label: 'Carnet Agricole & Finances', icon: <NotebookPen className="w-4 h-4" /> },
    { id: 'weather', label: 'Météo & Alertes', icon: <CloudSun className="w-4 h-4" /> },
    { id: 'assistant', label: 'AgriSmart Assistant', icon: <Bot className="w-4 h-4" /> },
    { id: 'diagnose', label: 'Diagnostic Photo', icon: <Camera className="w-4 h-4" /> },
    { id: 'community', label: 'Communauté Agricole', icon: <Users className="w-4 h-4" /> },
    { id: 'map', label: 'Géolocalisation & Carte RDC', icon: <Compass className="w-4 h-4" /> },
    { id: 'funding', label: 'Financement & Projets', icon: <Coins className="w-4 h-4" /> },
    { id: 'training', label: 'Guides & Formations', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'quiz', label: 'Quiz Agricoles', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'calendar', label: 'Foires & Calendrier', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'support', label: 'Support & FAQ', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'settings', label: 'Paramètres', icon: <Settings className="w-4 h-4" /> },
    ...(isAdminUser ? [{ id: 'admin' as AppSection, label: 'Administration', icon: <Shield className="w-4 h-4" /> }] : []),
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppLogoProvider logoUrl={appIdentity.logoUrl}>
      <ErrorBoundary>
      <div className="min-h-screen bg-[#F5F7F5] text-[#263238] flex flex-col">
        {/* Top Bar Contract: 3 zones separated by gap-8 */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            {section !== 'home' && (
              <button
                type="button"
                onClick={handleGoBack}
                aria-label="Retour"
                className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="whitespace-nowrap shrink-0 text-left"
            >
              <AgriSmartLogo size="sm" />
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            {(
              [
                { id: 'home', label: t(language, 'navHome') },
                { id: 'market', label: t(language, 'navMarket') },
                { id: 'notebook', label: 'Carnet' },
                { id: 'assistant', label: 'Assistant' },
                { id: 'community', label: 'Communauté' },
              ] as const
            ).map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => navigateTo(nav.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  section === nav.id
                    ? 'border-[#168447] text-[#168447] font-semibold'
                    : 'border-transparent hover:text-[#263238]'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('profile')}
              aria-label="Mon compte"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:border-[#168447] px-2.5 py-1.5 text-xs font-semibold text-[#263238] min-h-[40px]"
            >
              <UserAvatar photoUrl={profile.photoUrl} name={profile.displayName} size="xs" />
              <span className="max-w-[110px] truncate">{profile.displayName}</span>
            </button>
            <button
              type="button"
              onClick={() => setModulesOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#168447] hover:bg-[#126c3a] text-white text-xs font-semibold px-3.5 py-2 whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Menu className="w-4 h-4" />
              <span>{t(language, 'modulesMenu')}</span>
            </button>
          </div>
        </header>

        {/* Offline Connectivity Indicator (non-intrusive strip) */}
        {!isOnline && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>{t(language, 'offlineBanner')}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 pb-24 lg:pb-8 flex gap-6">
          {/* Desktop Side Menu */}
          <aside className="hidden xl:block w-64 shrink-0 space-y-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-1">
              {secondaryModules.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => navigateTo(mod.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
                    section === mod.id
                      ? 'bg-[#E8F5E9] text-[#168447] font-semibold'
                      : 'text-slate-700 hover:bg-[#F5F7F5]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {mod.icon}
                    <span className="truncate">{mod.label}</span>
                  </span>
                  {mod.id === 'notifications' && unreadCount > 0 && (
                    <span className="font-mono text-[11px] text-[#1976D2] font-bold">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* Active Page */}
          <main className="flex-1 min-w-0">
            {section === 'home' && (
              <DashboardHome
                profile={profile}
                language={language}
                isOnline={isOnline}
                isPrimaryAdmin={isPrimaryAdmin}
                appIdentity={appIdentity}
                products={allProducts}
                onNavigate={navigateTo}
                onSelectProduct={(p) => {
                  setSelectedProduct(p);
                  navigateTo(p.kind === 'input' ? 'inputs' : 'market');
                }}
              />
            )}

            {(section === 'market' || section === 'inputs' || section === 'publish') && (
              <MarketplaceView
                mode={section === 'inputs' ? 'input' : 'harvest'}
                profile={profile}
                products={allProducts}
                favorites={favorites}
                initialSearch={marketSearchPrefill}
                initialCategory={marketCategoryPrefill}
                selectedProduct={selectedProduct}
                onSelectProduct={setSelectedProduct}
                openPublishInitially={section === 'publish'}
                onToggleFavorite={(id) => {
                  const next = favorites.includes(id)
                    ? favorites.filter((f) => f !== id)
                    : [...favorites, id];
                  setFavorites(next);
                  saveFavorites(next);
                }}
                onPublishProduct={handlePublishProduct}
                onUpdateStatus={handleUpdateProductStatus}
                onDeleteProduct={handleDeleteProduct}
                onPlaceOrder={handlePlaceOrder}
                onStartChat={handleStartChat}
                onReportListing={async (prod, reason) => {
                  const tkId = makeId('tk');
                  if (isOnline && isCloudVerified) {
                    await setDoc(doc(db, 'supportTickets', tkId), {
                      userId: profile.uid,
                      ticketType: 'report_listing',
                      targetId: prod.id,
                      subject: `Signalement : ${prod.title}`,
                      details: reason,
                      status: 'open',
                      createdAt: serverTimestamp(),
                    });
                  } else {
                    setTickets((prev) => [
                      {
                        id: tkId,
                        userId: profile.uid,
                        ticketType: 'report_listing',
                        targetId: prod.id,
                        subject: `Signalement : ${prod.title}`,
                        details: reason,
                        status: 'open',
                      },
                      ...prev,
                    ]);
                  }
                }}
              />
            )}

            {section === 'machinery' && (
              <MachineryView
                profile={profile}
                equipmentList={allEquipment}
                bookings={bookings}
                onStartChat={handleStartChat}
                onPublishEquipment={async (eq) => {
                  const eqId = makeId('eq');
                  if (isOnline && isCloudVerified) {
                    await setDoc(doc(db, 'equipment', eqId), {
                      ownerId: profile.uid,
                      ownerName: profile.displayName,
                      ...eq,
                      moderationStatus: 'published',
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                    });
                  } else {
                    setCloudEquipment((prev) => [
                      {
                        ...eq,
                        id: eqId,
                        ownerId: profile.uid,
                        ownerName: profile.displayName,
                        moderationStatus: 'published',
                      },
                      ...prev,
                    ]);
                  }
                }}
                onBookEquipment={async (eq, startDate, days) => {
                  const bId = makeId('bk');
                  const totalAmount = days * eq.dailyRate;
                  if (isOnline && isCloudVerified && !eq.isReferenceSeed) {
                    await setDoc(doc(db, 'equipmentBookings', bId), {
                      equipmentId: eq.id,
                      equipmentName: eq.name,
                      renterId: profile.uid,
                      ownerId: eq.ownerId,
                      startDate,
                      days,
                      totalAmount,
                      currency: eq.currency,
                      status: 'requested',
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                    });
                  } else {
                    setBookings((prev) => [
                      {
                        id: bId,
                        equipmentId: eq.id,
                        equipmentName: eq.name,
                        renterId: profile.uid,
                        ownerId: eq.ownerId,
                        startDate,
                        days,
                        totalAmount,
                        currency: eq.currency,
                        status: 'requested',
                      },
                      ...prev,
                    ]);
                  }
                }}
                onUpdateBookingStatus={async (bookingId, status: BookingStatus) => {
                  if (isOnline && isCloudVerified) {
                    try {
                      await updateDoc(doc(db, 'equipmentBookings', bookingId), {
                        status,
                        updatedAt: serverTimestamp(),
                      });
                    } catch {
                      // local fallback
                    }
                  }
                  setBookings((prev) =>
                    prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
                  );
                }}
              />
            )}

            {section === 'orders' && (
              <OrdersLogisticsView
                profile={profile}
                orders={orders}
                deliveries={deliveries}
                paymentIntents={paymentIntents}
                onStartChat={handleStartChat}
                onUpdateOrderStatus={async (orderId, status: OrderStatus) => {
                  if (isOnline && isCloudVerified) {
                    try {
                      await updateDoc(doc(db, 'orders', orderId), {
                        status,
                        updatedAt: serverTimestamp(),
                      });
                    } catch {
                      // local fallback
                    }
                  }
                  setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
                }}
                onCreateDeliveryRequest={async (order, origin) => {
                  const delId = makeId('del');
                  const newDel: Delivery = {
                    id: delId,
                    orderId: order.id,
                    buyerId: order.buyerId,
                    sellerId: order.sellerId,
                    origin,
                    destination: order.deliveryAddress,
                    status: 'available',
                  };
                  if (isOnline && isCloudVerified) {
                    try {
                      await setDoc(doc(db, 'deliveries', delId), {
                        orderId: order.id,
                        buyerId: order.buyerId,
                        sellerId: order.sellerId,
                        origin,
                        destination: order.deliveryAddress,
                        status: 'available',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                      });
                      return;
                    } catch {
                      // local fallback
                    }
                  }
                  setDeliveries((prev) => [newDel, ...prev]);
                }}
                onAcceptDelivery={async (deliveryId, transportCost) => {
                  if (isOnline && isCloudVerified) {
                    try {
                      await updateDoc(doc(db, 'deliveries', deliveryId), {
                        transporterId: profile.uid,
                        transportCost,
                        currency: 'CDF',
                        status: 'accepted',
                        updatedAt: serverTimestamp(),
                      });
                    } catch {
                      // local fallback
                    }
                  }
                  setDeliveries((prev) =>
                    prev.map((d) =>
                      d.id === deliveryId
                        ? { ...d, transporterId: profile.uid, transportCost, currency: 'CDF', status: 'accepted' }
                        : d
                    )
                  );
                }}
                onUpdateDeliveryStatus={async (deliveryId, status: DeliveryStatus) => {
                  if (isOnline && isCloudVerified) {
                    try {
                      await updateDoc(doc(db, 'deliveries', deliveryId), {
                        status,
                        updatedAt: serverTimestamp(),
                      });
                    } catch {
                      // local fallback
                    }
                  }
                  setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? { ...d, status } : d)));
                }}
              />
            )}

            {section === 'notebook' && (
              <FarmNotebookView
                records={farmRecords}
                isOnline={isOnline}
                isSignedInCloud={isCloudVerified}
                onAddRecord={handleAddFarmRecord}
                onDeleteRecord={async (id) => {
                  if (isOnline && isCloudVerified) {
                    try {
                      await deleteDoc(doc(db, 'farmRecords', id));
                    } catch {
                      // local
                    }
                  }
                  const updated = farmRecords.filter((r) => r.id !== id);
                  setFarmRecords(updated);
                  saveLocalFarmRecords(updated);
                }}
                onSyncPending={handleSyncPendingFarmRecords}
              />
            )}

            {section === 'weather' && (
              <WeatherAlertsView defaultProvince={profile.province} isOnline={isOnline} />
            )}

            {(section === 'assistant' || section === 'diagnose') && (
              <AssistantAndDiagnoseView
                key={section}
                initialTab={section === 'diagnose' ? 'diagnose' : 'assistant'}
                language={language}
                isOnline={isOnline}
                onConsultExpert={() => handleStartChat('demo-expert-goma', 'Dr. Célestin Muhindo (Expert)')}
              />
            )}

            {(section === 'community' || section === 'map') && (
              <CommunityAndMapView
                key={section}
                initialTab={section === 'map' ? 'map' : 'community'}
                profile={profile}
                posts={communityPosts}
                actors={[profile]}
                onStartChat={handleStartChat}
                onPublishPost={async (category, content) => {
                  const postId = makeId('post');
                  if (isOnline && isCloudVerified) {
                    await setDoc(doc(db, 'communityPosts', postId), {
                      authorId: profile.uid,
                      authorName: profile.displayName,
                      category,
                      content,
                      likesCount: 0,
                      moderationStatus: 'published',
                      createdAt: serverTimestamp(),
                    });
                  } else {
                    setCommunityPosts((prev) => [
                      {
                        id: postId,
                        authorId: profile.uid,
                        authorName: profile.displayName,
                        authorPhotoUrl: profile.photoUrl,
                        category,
                        content,
                        likesCount: 0,
                        moderationStatus: 'published',
                        createdAt: "À l'instant",
                        comments: [],
                      },
                      ...prev,
                    ]);
                  }
                }}
                onLikePost={async (postId) => {
                  const target = communityPosts.find((p) => p.id === postId);
                  if (!target) return;
                  if (isOnline && isCloudVerified && !postId.startsWith('seed-')) {
                    try {
                      await updateDoc(doc(db, 'communityPosts', postId), {
                        likesCount: target.likesCount + 1,
                      });
                      return;
                    } catch {
                      // local fallback
                    }
                  }
                  setCommunityPosts((prev) =>
                    prev.map((p) => (p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p))
                  );
                }}
                onCommentPost={(postId, text) => {
                  setCommunityPosts((prev) =>
                    prev.map((p) =>
                      p.id === postId
                        ? {
                            ...p,
                            comments: [
                              ...(p.comments || []),
                              {
                                id: makeId('cmt'),
                                authorName: profile.displayName,
                                authorPhotoUrl: profile.photoUrl,
                                text,
                                createdAt: "À l'instant",
                              },
                            ],
                          }
                        : p
                    )
                  );
                }}
                onReportPost={async (post) => {
                  const tkId = makeId('tk');
                  if (isOnline && isCloudVerified) {
                    await setDoc(doc(db, 'supportTickets', tkId), {
                      userId: profile.uid,
                      ticketType: 'report_post',
                      targetId: post.id,
                      subject: `Signalement publication de ${post.authorName}`,
                      details: post.content.slice(0, 200),
                      status: 'open',
                      createdAt: serverTimestamp(),
                    });
                  }
                }}
                onUpdateManualLocation={async (prov, city) => {
                  await handleCompleteProfile({ ...profile, province: prov, city }, !isOnline || !isCloudVerified);
                }}
              />
            )}

            {(section === 'funding' || section === 'training' || section === 'quiz' || section === 'calendar') && (
              <LearningAndFundingView
                key={section}
                initialTab={section}
                profile={profile}
                applications={fundingApps}
                events={events}
                completedLessons={completedLessons}
                quizScores={quizScores}
                onSubmitFunding={async (app) => {
                  const fId = makeId('fund');
                  if (isOnline && isCloudVerified) {
                    await setDoc(doc(db, 'fundingApplications', fId), {
                      applicantId: profile.uid,
                      projectTitle: app.projectTitle,
                      institution: app.institution,
                      requestedAmount: app.requestedAmount,
                      currency: app.currency,
                      summary: app.summary || '',
                      status: 'submitted',
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                    });
                  } else {
                    setFundingApps((prev) => [
                      { ...app, id: fId, applicantId: profile.uid, status: 'submitted' },
                      ...prev,
                    ]);
                  }
                }}
                onCompleteLesson={(lessonId) => {
                  const next = completedLessons.includes(lessonId)
                    ? completedLessons
                    : [...completedLessons, lessonId];
                  setCompletedLessons(next);
                  safeSaveJSON(OFFLINE_KEYS.COMPLETED_LESSONS, next);
                }}
                onSaveQuizScore={(level, score, total) => {
                  const next = [{ level, score, total, date: new Date().toLocaleDateString('fr-FR') }, ...quizScores];
                  setQuizScores(next);
                  safeSaveJSON(OFFLINE_KEYS.QUIZ_SCORES, next);
                }}
                onAddPersonalEvent={(ev) => {
                  const created: AgriEvent = { ...ev, id: makeId('ev') };
                  setEvents((prev) => [created, ...prev]);
                  const existingLocal = safeLoadJSON<AgriEvent[]>(OFFLINE_KEYS.LOCAL_EVENTS, []);
                  safeSaveJSON(OFFLINE_KEYS.LOCAL_EVENTS, [created, ...existingLocal]);
                }}
              />
            )}

            {section === 'messages' && (
              <MessagesView
                profile={profile}
                conversations={conversations}
                activeConversationId={activeConvId}
                messagesByConv={messagesByConv}
                onSelectConversation={setActiveConvId}
                onSendMessage={handleSendMessage}
              />
            )}

            {(section === 'profile' || section === 'settings' || section === 'notifications' || section === 'support' || section === 'admin') && (
              <ProfileAndAdminView
                key={section}
                initialTab={section}
                profile={profile}
                isAdminUser={isAdminUser}
                isPrimaryAdmin={isPrimaryAdmin}
                appIdentity={appIdentity}
                onChangeAppLogo={handleChangeAppLogo}
                language={language}
                onChangeLanguage={handleLanguageChange}
                onBack={handleGoBack}
                onUpdateProfile={async (updates) => {
                  await handleCompleteProfile({ ...profile, ...updates }, !isOnline || !isCloudVerified);
                }}
                onSignOut={async () => {
                  try {
                    await fetch('/api/auth/logout', {
                      method: 'POST',
                      headers: { 'X-Requested-With': 'AgriSmart-RDC' },
                    });
                  } catch {
                    // ignore
                  }
                  try {
                    await signOut(auth);
                  } catch {
                    // local signout
                  }
                  localStorage.removeItem(OFFLINE_KEYS.LOCAL_PROFILE);
                  setProfile(null);
                  setFirebaseUid(null);
                  setSection('home');
                }}
                notifications={notifications}
                onMarkAllRead={() =>
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                }
                reviews={reviews}
                onAddReview={(rev) => {
                  setReviews((prev) => [
                    {
                      ...rev,
                      id: makeId('rev'),
                      authorName: profile.displayName,
                      createdAt: "À l'instant",
                    },
                    ...prev,
                  ]);
                }}
                tickets={tickets}
                onSubmitTicket={async (subject, details) => {
                  const tkId = makeId('tk');
                  if (isOnline && isCloudVerified) {
                    await setDoc(doc(db, 'supportTickets', tkId), {
                      userId: profile.uid,
                      ticketType: 'support',
                      subject,
                      details,
                      status: 'open',
                      createdAt: serverTimestamp(),
                    });
                  } else {
                    setTickets((prev) => [
                      {
                        id: tkId,
                        userId: profile.uid,
                        ticketType: 'support',
                        subject,
                        details,
                        status: 'open',
                      },
                      ...prev,
                    ]);
                  }
                }}
                onResolveTicket={async (ticketId) => {
                  if (isOnline && isCloudVerified) {
                    await updateDoc(doc(db, 'supportTickets', ticketId), { status: 'resolved' });
                  }
                  setTickets((prev) =>
                    prev.map((t) => (t.id === ticketId ? { ...t, status: 'resolved' } : t))
                  );
                }}
                allProducts={allProducts}
                onAdminModerateProduct={handleUpdateProductStatus}
                ordersCount={orders.length}
                farmRecordsCount={farmRecords.length}
              />
            )}
          </main>
        </div>

        {/* Mobile Bottom Tab Bar (5 tabs: Accueil, Marché, Publier, Messages, Profil) */}
        <nav
          aria-label="Navigation principale mobile"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 h-16"
        >
          {(
            [
              { id: 'home', label: t(language, 'navHome'), icon: <Home className="w-5 h-5" /> },
              { id: 'market', label: t(language, 'navMarket'), icon: <ShoppingBag className="w-5 h-5" /> },
              { id: 'publish', label: t(language, 'navPublish'), icon: <PlusCircle className="w-5 h-5" /> },
              { id: 'messages', label: t(language, 'navMessages'), icon: <MessageSquare className="w-5 h-5" /> },
              { id: 'profile', label: t(language, 'navProfile'), icon: <User className="w-5 h-5" /> },
            ] as const
          ).map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-[#168447] font-semibold' : 'text-slate-500'
                }`}
              >
                {item.icon}
                <span className="truncate max-w-full px-1">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Secondary Modules Drawer */}
        {modulesOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
            <div className="bg-white w-full max-w-sm h-full overflow-y-auto p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <AgriSmartLogo size="sm" />
                  <button
                    type="button"
                    onClick={() => setModulesOpen(false)}
                    aria-label="Fermer le menu"
                    className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 min-h-[40px]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo('profile')}
                  className="mt-4 w-full flex items-center gap-3 rounded-2xl bg-[#F5F7F5] border border-slate-200 p-3 text-left hover:border-[#168447]"
                >
                  <UserAvatar photoUrl={profile.photoUrl} name={profile.displayName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">Mon compte</p>
                    <p className="text-sm font-bold text-[#263238] truncate">{profile.displayName}</p>
                  </div>
                </button>

                <div className="mt-4 space-y-1">
                  {secondaryModules.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => navigateTo(mod.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-sm font-medium min-h-[44px] ${
                        section === mod.id
                          ? 'bg-[#E8F5E9] text-[#168447] font-semibold'
                          : 'text-[#263238] hover:bg-[#F5F7F5]'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {mod.icon}
                        <span>{mod.label}</span>
                      </span>
                      {mod.id === 'notifications' && unreadCount > 0 && (
                        <span className="font-mono text-xs font-bold text-[#1976D2]">{unreadCount}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-200 space-y-3">
                <label className="block text-xs font-medium text-slate-600">
                  Langue ({LANGUAGE_LABELS[language]})
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm min-h-[44px]"
                  >
                    {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
                      <option key={code} value={code}>
                        {LANGUAGE_LABELS[code]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
    </AppLogoProvider>
  );
}

export default AgriSmartApp;
