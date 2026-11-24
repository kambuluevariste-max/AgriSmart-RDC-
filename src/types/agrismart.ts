export type LanguageCode = 'fr' | 'ln' | 'sw' | 'kg' | 'lua';

export type UserRole =
  | 'agriculteur'
  | 'acheteur'
  | 'vendeur'
  | 'fournisseur'
  | 'cooperative'
  | 'transporteur'
  | 'expert'
  | 'investisseur'
  | 'administrateur';

export type CurrencyCode = 'CDF' | 'USD';

export type ModerationStatus = 'pending' | 'published' | 'sold' | 'suspended';

export type OrderStatus =
  | 'nouvelle'
  | 'confirmee'
  | 'en_preparation'
  | 'en_livraison'
  | 'livree'
  | 'annulee';

export type DeliveryStatus =
  | 'available'
  | 'accepted'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface UserProfile {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  province: string;
  city: string;
  sector?: string;
  activityType?: string;
  description?: string;
  photoUrl?: string;
  language?: LanguageCode;
  ratingAvg?: number;
  ratingCount?: number;
  isPublic: boolean;
  email?: string;
  phone?: string;
  accountVerified?: boolean;
  authProvider?: 'firebase' | 'server' | 'local';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppIdentityState {
  logoUrl: string | null;
  logoChanged: boolean;
  changedAt?: string;
}

export interface Product {
  id: string;
  ownerId: string;
  sellerName: string;
  sellerPhone?: string;
  kind: 'harvest' | 'input';
  title: string;
  description?: string;
  category: string;
  price: number;
  currency: CurrencyCode;
  unit: string;
  quantityAvailable: number;
  province: string;
  city: string;
  imageUrl?: string;
  moderationStatus: ModerationStatus;
  createdAt?: string;
  isReferenceSeed?: boolean;
}

export interface Equipment {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  equipmentType: string;
  dailyRate: number;
  currency: CurrencyCode;
  province: string;
  city: string;
  available: boolean;
  description?: string;
  imageUrl?: string;
  moderationStatus: 'pending' | 'published' | 'suspended';
  isReferenceSeed?: boolean;
}

export interface EquipmentBooking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  renterId: string;
  ownerId: string;
  startDate: string;
  days: number;
  totalAmount: number;
  currency: CurrencyCode;
  status: BookingStatus;
  createdAt?: string;
}

export interface Order {
  id: string;
  productId: string;
  productTitle: string;
  buyerId: string;
  sellerId: string;
  transporterId?: string;
  quantity: number;
  totalPrice: number;
  currency: CurrencyCode;
  deliveryAddress: string;
  status: OrderStatus;
  createdAt?: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  transporterId?: string;
  origin: string;
  destination: string;
  transportCost?: number;
  currency?: CurrencyCode;
  status: DeliveryStatus;
  createdAt?: string;
}

export type FarmRecordType = 'crop' | 'expense' | 'revenue' | 'stock';

export interface FarmRecord {
  id: string;
  ownerId: string;
  recordType: FarmRecordType;
  title: string;
  category?: string;
  amount?: number;
  quantity?: number;
  unit?: string;
  areaHa?: number;
  date?: string;
  harvestDate?: string;
  notes?: string;
  pendingSync?: boolean;
  syncError?: string;
  updatedAtLocal?: string;
}

export interface Conversation {
  id: string;
  participantA: string;
  participantB: string;
  peerName?: string;
  peerPhotoUrl?: string;
  lastMessage?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  participantA: string;
  participantB: string;
  text: string;
  createdAt?: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  category:
    | 'Agriculture'
    | 'Élevage'
    | 'Transformation'
    | 'Conseils'
    | 'Questions et réponses'
    | 'Innovations agricoles';
  content: string;
  likesCount: number;
  moderationStatus: 'published' | 'reported' | 'hidden';
  createdAt?: string;
  comments?: { id: string; authorName: string; authorPhotoUrl?: string; text: string; createdAt: string }[];
}

export interface FundingProject {
  id: string;
  title: string;
  institution: string;
  province: string;
  maxAmount: string;
  deadline: string;
  summary: string;
  requiredDocs: string[];
}

export interface FundingApplication {
  id: string;
  applicantId: string;
  projectTitle: string;
  institution: string;
  requestedAmount: number;
  currency: CurrencyCode;
  summary?: string;
  status: 'submitted' | 'under_review' | 'approved' | 'declined';
  createdAt?: string;
}

export interface TrainingCourse {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  certificateAvailable: boolean;
  summary: string;
  lessons: { id: string; title: string; content: string; keyTakeaway: string }[];
}

export interface QuizQuestion {
  id: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AgriEvent {
  id: string;
  title: string;
  type: 'Foire' | 'Semis' | 'Récolte' | 'Formation' | 'Rappel';
  province: string;
  date: string;
  description: string;
  isPersonal?: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'order' | 'message' | 'booking' | 'weather' | 'reminder' | 'funding' | 'product' | 'event';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface SupportTicket {
  id: string;
  userId: string;
  ticketType: 'support' | 'report_listing' | 'report_post';
  targetId?: string;
  subject: string;
  details: string;
  status: 'open' | 'resolved';
  createdAt?: string;
}

export interface MobileMoneyIntent {
  id: string;
  orderId: string;
  operator: 'M-Pesa' | 'Airtel Money' | 'Orange Money';
  phone: string;
  amount: number;
  currency: CurrencyCode;
  reference: string;
  status: 'En attente de configuration API opérateur';
  createdAt: string;
}

export interface ActorReview {
  id: string;
  targetId: string;
  targetName: string;
  targetRole: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface WeatherData {
  province: string;
  city: string;
  source: string;
  fetchedAt: string;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
  };
}

export type AppSection =
  | 'home'
  | 'market'
  | 'publish'
  | 'messages'
  | 'profile'
  | 'inputs'
  | 'machinery'
  | 'orders'
  | 'notebook'
  | 'weather'
  | 'assistant'
  | 'diagnose'
  | 'community'
  | 'map'
  | 'funding'
  | 'training'
  | 'quiz'
  | 'calendar'
  | 'notifications'
  | 'support'
  | 'settings'
  | 'admin';
