import express, { type Request, type Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PRIMARY_ADMIN_EMAIL = 'kambuluevariste@gmail.com';

// Secure storage directory confined to workspace/.data
const DATA_DIR = path.resolve(__dirname, '.data');
const USERS_FILE = resolveSafeDataPath('users.json');
const IDENTITY_FILE = resolveSafeDataPath('app_identity.json');
const FIREBASE_CONFIG_FILE = path.resolve(__dirname, 'firebase-applet-config.json');

const SESSION_COOKIE_NAME = 'agrismart_session';

function resolveSafeDataPath(filename: string): string {
  const safeName = path.basename(filename);
  const resolved = path.resolve(DATA_DIR, safeName);
  if (!resolved.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Chemin de stockage invalide.');
  }
  return resolved;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadOrCreateSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret) return envSecret;
  ensureDataDir();
  const secretFile = resolveSafeDataPath('.session_secret');
  try {
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFile, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const SESSION_SECRET = loadOrCreateSessionSecret();

function getFirebaseApiKey(): string | null {
  try {
    if (!fs.existsSync(FIREBASE_CONFIG_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf8'));
    return typeof raw.apiKey === 'string' && raw.apiKey ? raw.apiKey : null;
  } catch {
    return null;
  }
}

interface StoredServerUser {
  uid: string;
  firstName: string;
  lastName: string;
  displayName: string;
  identifier: string;
  identifierType: 'email' | 'phone';
  email?: string;
  phone?: string;
  passwordHash: string;
  passwordSalt: string;
  photoUrl?: string;
  role:
    | 'agriculteur'
    | 'acheteur'
    | 'vendeur'
    | 'fournisseur'
    | 'cooperative'
    | 'transporteur'
    | 'expert'
    | 'investisseur'
    | 'administrateur';
  province: string;
  city: string;
  sector?: string;
  activityType?: string;
  description?: string;
  language: 'fr' | 'ln' | 'sw' | 'kg' | 'lua';
  createdAt: string;
  updatedAt: string;
}

interface AppIdentityRecord {
  logoUrl: string | null;
  logoChanged: boolean;
  changedAt?: string;
  changedBy?: string;
}

function loadUsers(): StoredServerUser[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredServerUser[]): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function loadAppIdentity(): AppIdentityRecord {
  ensureDataDir();
  if (!fs.existsSync(IDENTITY_FILE)) {
    return { logoUrl: null, logoChanged: false };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(IDENTITY_FILE, 'utf8'));
    return {
      logoUrl: typeof parsed.logoUrl === 'string' ? parsed.logoUrl : null,
      logoChanged: Boolean(parsed.logoChanged),
      changedAt: typeof parsed.changedAt === 'string' ? parsed.changedAt : undefined,
      changedBy: typeof parsed.changedBy === 'string' ? parsed.changedBy : undefined,
    };
  } catch {
    return { logoUrl: null, logoChanged: false };
  }
}

function saveAppIdentity(record: AppIdentityRecord): void {
  ensureDataDir();
  fs.writeFileSync(IDENTITY_FILE, JSON.stringify(record, null, 2), 'utf8');
}

function sanitizeUserResponse(u: StoredServerUser) {
  return {
    uid: u.uid,
    firstName: u.firstName,
    lastName: u.lastName,
    displayName: u.displayName,
    email: u.email || '',
    phone: u.phone || '',
    photoUrl: u.photoUrl || '',
    role: u.role,
    province: u.province,
    city: u.city,
    sector: u.sector || '',
    activityType: u.activityType || '',
    description: u.description || '',
    language: u.language || 'fr',
    isPublic: true,
    accountVerified: true,
    authProvider: 'server' as const,
  };
}

function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  try {
    const candidate = crypto.scryptSync(password, storedSalt, 64);
    const original = Buffer.from(storedHash, 'hex');
    if (candidate.length !== original.length) return false;
    return crypto.timingSafeEqual(candidate, original);
  } catch {
    return false;
  }
}

function isValidEmailAddress(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
}

function normalizePhone(val: string): string {
  return val.replace(/[\s\-().]/g, '').trim();
}

function isValidPhoneNumber(val: string): boolean {
  return /^\+?[0-9]{8,15}$/.test(normalizePhone(val));
}

function normalizeIdentifier(raw: string): {
  valid: boolean;
  type: 'email' | 'phone';
  normalized: string;
} {
  const trimmed = raw.trim();
  if (isValidEmailAddress(trimmed)) {
    return { valid: true, type: 'email', normalized: trimmed.toLowerCase() };
  }
  if (isValidPhoneNumber(trimmed)) {
    return { valid: true, type: 'phone', normalized: normalizePhone(trimmed) };
  }
  return { valid: false, type: 'email', normalized: '' };
}

function isValidSafeImageDataUrl(value: unknown, maxChars: number): boolean {
  if (typeof value !== 'string') return false;
  if (value.length === 0) return true;
  if (value.length > maxChars) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

function signSessionToken(uid: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14; // 14 days
  const payload = Buffer.from(JSON.stringify({ uid, exp }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): { uid: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number') return null;
    if (Date.now() > parsed.exp) return null;
    return { uid: parsed.uid };
  } catch {
    return null;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${60 * 60 * 24 * 14}`,
  ];
  if (isHttps) {
    attrs.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (isHttps) {
    attrs.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function verifyStateChangingRequest(req: Request): boolean {
  const xrw = req.headers['x-requested-with'];
  if (xrw === 'AgriSmart-RDC') return true;
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && host) {
    try {
      const parsedOrigin = new URL(origin);
      const allowedHost = String(host).split(',')[0].trim();
      return parsedOrigin.host === allowedHost;
    } catch {
      return false;
    }
  }
  return false;
}

async function verifyFirebaseAdminIdToken(idToken: string): Promise<string | null> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey || !idToken) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const user = Array.isArray(data?.users) ? data.users[0] : null;
    if (
      user &&
      typeof user.email === 'string' &&
      user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL &&
      user.emailVerified === true
    ) {
      return user.email.toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

const DRC_PROVINCE_COORDS: Record<string, { lat: number; lon: number; capital: string }> = {
  'Kinshasa': { lat: -4.4419, lon: 15.2663, capital: 'Kinshasa' },
  'Kongo-Central': { lat: -5.8167, lon: 13.4500, capital: 'Matadi' },
  'Kwango': { lat: -4.8333, lon: 16.5833, capital: 'Kenge' },
  'Kwilu': { lat: -5.0333, lon: 18.8167, capital: 'Bandundu' },
  'Mai-Ndombe': { lat: -1.9500, lon: 18.2667, capital: 'Inongo' },
  'Équateur': { lat: 0.0475, lon: 18.2558, capital: 'Mbandaka' },
  'Nord-Ubangi': { lat: 4.2833, lon: 21.0000, capital: 'Gbadolite' },
  'Sud-Ubangi': { lat: 3.2500, lon: 19.7667, capital: 'Gemena' },
  'Mongala': { lat: 2.1500, lon: 21.5167, capital: 'Lisala' },
  'Tshuapa': { lat: -0.2167, lon: 20.8667, capital: 'Boende' },
  'Tshopo': { lat: 0.5153, lon: 25.1910, capital: 'Kisangani' },
  'Bas-Uele': { lat: 2.8000, lon: 24.7333, capital: 'Buta' },
  'Haut-Uele': { lat: 2.7667, lon: 27.6167, capital: 'Isiro' },
  'Ituri': { lat: 1.5667, lon: 30.2500, capital: 'Bunia' },
  'Nord-Kivu': { lat: -1.6585, lon: 29.2205, capital: 'Goma' },
  'Sud-Kivu': { lat: -2.5083, lon: 28.8608, capital: 'Bukavu' },
  'Maniema': { lat: -2.9437, lon: 25.9224, capital: 'Kindu' },
  'Haut-Katanga': { lat: -11.6876, lon: 27.5026, capital: 'Lubumbashi' },
  'Lualaba': { lat: -10.7167, lon: 25.4667, capital: 'Kolwezi' },
  'Haut-Lomami': { lat: -8.7333, lon: 24.9833, capital: 'Kamina' },
  'Tanganyika': { lat: -5.9167, lon: 29.1833, capital: 'Kalemie' },
  'Lomami': { lat: -6.1333, lon: 24.4833, capital: 'Kabinda' },
  'Sankuru': { lat: -3.3500, lon: 23.4167, capital: 'Lusambo' },
  'Kasaï': { lat: -6.4167, lon: 20.8000, capital: 'Tshikapa' },
  'Kasaï-Central': { lat: -5.8962, lon: 22.4166, capital: 'Kananga' },
  'Kasaï-Oriental': { lat: -6.1360, lon: 23.5898, capital: 'Mbuji-Mayi' },
};

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'AgriSmart-RDC',
      androidPackage: 'com.agrismartrdc.app',
      aiConfigured: Boolean(getGenAIClient()),
    });
  });

  // ==========================================================
  // AUTHENTICATION ROUTES (scrypt + signed HttpOnly session)
  // ==========================================================
  app.get('/api/auth/session', (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) {
      return res.json({ authenticated: false, user: null });
    }
    const verified = verifySessionToken(token);
    if (!verified) {
      return res.json({ authenticated: false, user: null });
    }
    const users = loadUsers();
    const found = users.find((u) => u.uid === verified.uid);
    if (!found) {
      return res.json({ authenticated: false, user: null });
    }
    return res.json({ authenticated: true, user: sanitizeUserResponse(found) });
  });

  app.post('/api/auth/register', (req, res) => {
    if (!verifyStateChangingRequest(req)) {
      return res.status(403).json({ error: 'Requête non autorisée.' });
    }

    const { firstName, lastName, identifier, password, confirmPassword, photoUrl, acceptedTerms, language } =
      req.body ?? {};

    if (typeof lastName !== 'string' || lastName.trim().length < 2 || lastName.trim().length > 60) {
      return res.status(400).json({ error: 'Le nom est obligatoire (minimum 2 caractères).' });
    }
    if (typeof firstName !== 'string' || firstName.trim().length < 2 || firstName.trim().length > 60) {
      return res.status(400).json({ error: 'Le prénom est obligatoire (minimum 2 caractères).' });
    }
    if (typeof identifier !== 'string') {
      return res.status(400).json({ error: 'Veuillez saisir une adresse e-mail ou un numéro de téléphone valide.' });
    }

    const idInfo = normalizeIdentifier(identifier);
    if (!idInfo.valid) {
      return res.status(400).json({ error: 'Adresse e-mail ou numéro de téléphone invalide.' });
    }

    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Les deux mots de passe ne correspondent pas.' });
    }
    if (acceptedTerms !== true) {
      return res.status(400).json({ error: "Veuillez accepter les Conditions d'utilisation." });
    }

    const cleanPhoto = typeof photoUrl === 'string' ? photoUrl.trim() : '';
    if (cleanPhoto && !isValidSafeImageDataUrl(cleanPhoto, 60000)) {
      return res.status(400).json({ error: 'Format ou taille de photo de profil invalide.' });
    }

    const users = loadUsers();
    const duplicate = users.find((u) => u.identifier === idInfo.normalized);
    if (duplicate) {
      return res.status(409).json({
        error:
          idInfo.type === 'email'
            ? 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.'
            : 'Un compte existe déjà avec ce numéro de téléphone. Veuillez vous connecter.',
      });
    }

    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();
    const uid = `usr-${crypto.randomUUID()}`;
    const isAdminEmail = idInfo.type === 'email' && idInfo.normalized === PRIMARY_ADMIN_EMAIL;
    const validLang = ['fr', 'ln', 'sw', 'kg', 'lua'].includes(language) ? language : 'fr';

    const newUser: StoredServerUser = {
      uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: `${firstName.trim()} ${lastName.trim()}`,
      identifier: idInfo.normalized,
      identifierType: idInfo.type,
      email: idInfo.type === 'email' ? idInfo.normalized : undefined,
      phone: idInfo.type === 'phone' ? idInfo.normalized : undefined,
      passwordHash: hash,
      passwordSalt: salt,
      photoUrl: cleanPhoto || undefined,
      role: isAdminEmail ? 'administrateur' : 'agriculteur',
      province: 'Kinshasa',
      city: 'Kinshasa',
      activityType: 'Cultures vivrières (manioc, maïs)',
      description: 'Membre AgriSmart-RDC',
      language: validLang,
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    saveUsers(users);

    const token = signSessionToken(uid);
    setSessionCookie(req, res, token);

    return res.status(201).json({
      user: sanitizeUserResponse(newUser),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    if (!verifyStateChangingRequest(req)) {
      return res.status(403).json({ error: 'Requête non autorisée.' });
    }

    const { identifier, password } = req.body ?? {};
    if (typeof identifier !== 'string' || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Veuillez renseigner votre identifiant et votre mot de passe.' });
    }

    const idInfo = normalizeIdentifier(identifier);
    if (!idInfo.valid) {
      return res.status(400).json({ error: 'Adresse e-mail ou numéro de téléphone invalide.' });
    }

    const users = loadUsers();
    const found = users.find((u) => u.identifier === idInfo.normalized);
    if (!found || !verifyPassword(password, found.passwordHash, found.passwordSalt)) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    const token = signSessionToken(found.uid);
    setSessionCookie(req, res, token);

    return res.json({
      user: sanitizeUserResponse(found),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    if (!verifyStateChangingRequest(req)) {
      return res.status(403).json({ error: 'Requête non autorisée.' });
    }
    clearSessionCookie(req, res);
    return res.json({ ok: true });
  });

  app.post('/api/auth/update-profile', (req, res) => {
    if (!verifyStateChangingRequest(req)) {
      return res.status(403).json({ error: 'Requête non autorisée.' });
    }
    const cookies = parseCookies(req);
    const verified = verifySessionToken(cookies[SESSION_COOKIE_NAME] || '');
    if (!verified) {
      return res.status(401).json({ error: 'Session expirée ou non authentifiée.' });
    }

    const users = loadUsers();
    const idx = users.findIndex((u) => u.uid === verified.uid);
    if (idx === -1) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const {
      displayName,
      firstName,
      lastName,
      province,
      city,
      sector,
      activityType,
      description,
      photoUrl,
      language,
      role,
    } = req.body ?? {};

    const current = users[idx];

    if (photoUrl !== undefined) {
      if (typeof photoUrl !== 'string' || !isValidSafeImageDataUrl(photoUrl, 60000)) {
        return res.status(400).json({ error: 'Photo de profil invalide ou trop volumineuse.' });
      }
      current.photoUrl = photoUrl || undefined;
    }

    if (typeof firstName === 'string' && firstName.trim().length >= 2) {
      current.firstName = firstName.trim().slice(0, 60);
    }
    if (typeof lastName === 'string' && lastName.trim().length >= 2) {
      current.lastName = lastName.trim().slice(0, 60);
    }
    if (typeof displayName === 'string' && displayName.trim().length >= 2) {
      current.displayName = displayName.trim().slice(0, 100);
    }
    if (typeof province === 'string' && province.trim().length >= 2) {
      current.province = province.trim().slice(0, 80);
    }
    if (typeof city === 'string' && city.trim().length >= 2) {
      current.city = city.trim().slice(0, 80);
    }
    if (typeof sector === 'string') {
      current.sector = sector.trim().slice(0, 80);
    }
    if (typeof activityType === 'string') {
      current.activityType = activityType.trim().slice(0, 120);
    }
    if (typeof description === 'string') {
      current.description = description.trim().slice(0, 600);
    }
    if (typeof language === 'string' && ['fr', 'ln', 'sw', 'kg', 'lua'].includes(language)) {
      current.language = language as StoredServerUser['language'];
    }
    const allowedNonAdminRoles = [
      'agriculteur',
      'acheteur',
      'vendeur',
      'fournisseur',
      'cooperative',
      'transporteur',
      'expert',
      'investisseur',
    ];
    if (typeof role === 'string' && allowedNonAdminRoles.includes(role) && current.role !== 'administrateur') {
      current.role = role as StoredServerUser['role'];
    }

    current.updatedAt = new Date().toISOString();
    users[idx] = current;
    saveUsers(users);

    return res.json({ user: sanitizeUserResponse(current) });
  });

  app.post('/api/auth/forgot', (req, res) => {
    if (!verifyStateChangingRequest(req)) {
      return res.status(403).json({ error: 'Requête non autorisée.' });
    }
    const { identifier } = req.body ?? {};
    if (typeof identifier !== 'string' || !normalizeIdentifier(identifier).valid) {
      return res.status(400).json({ error: 'Veuillez saisir une adresse e-mail ou un numéro de téléphone valide.' });
    }
    return res.json({
      ok: true,
      message:
        'Si un compte AgriSmart-RDC correspond à cet identifiant, les instructions de récupération ont été enregistrées.',
    });
  });

  // ==========================================================
  // GLOBAL APP IDENTITY (Admin-only, strictly ONE-TIME change)
  // ==========================================================
  app.get('/api/app-identity', (_req, res) => {
    const identity = loadAppIdentity();
    return res.json({
      logoUrl: identity.logoUrl,
      logoChanged: identity.logoChanged,
      changedAt: identity.changedAt,
    });
  });

  app.post('/api/app-identity/logo', async (req, res) => {
    if (!verifyStateChangingRequest(req)) {
      return res.status(403).json({ error: 'Requête non autorisée.' });
    }

    // Check current lock state FIRST (strictly single-use enforcement)
    const current = loadAppIdentity();
    if (current.logoChanged) {
      return res.status(409).json({
        error: "Le logo de l'application a déjà été modifié.",
        logoChanged: true,
      });
    }

    // Verify primary admin via either Firebase verified ID token OR signed server session cookie
    let verifiedAdminEmail: string | null = null;
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.slice(7).trim();
      verifiedAdminEmail = await verifyFirebaseAdminIdToken(idToken);
    }

    if (!verifiedAdminEmail) {
      const cookies = parseCookies(req);
      const session = verifySessionToken(cookies[SESSION_COOKIE_NAME] || '');
      if (session) {
        const users = loadUsers();
        const u = users.find((item) => item.uid === session.uid);
        if (u && u.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL) {
          verifiedAdminEmail = PRIMARY_ADMIN_EMAIL;
        }
      }
    }

    if (verifiedAdminEmail !== PRIMARY_ADMIN_EMAIL) {
      return res.status(403).json({
        error: "Action réservée exclusivement à l'administrateur principal.",
      });
    }

    const { logoUrl } = req.body ?? {};
    if (typeof logoUrl !== 'string' || !logoUrl || !isValidSafeImageDataUrl(logoUrl, 280000)) {
      return res.status(400).json({
        error: 'Image de logo invalide ou trop volumineuse (PNG/JPG/WebP <= 250 Ko).',
      });
    }

    const updated: AppIdentityRecord = {
      logoUrl,
      logoChanged: true,
      changedAt: new Date().toISOString(),
      changedBy: PRIMARY_ADMIN_EMAIL,
    };
    saveAppIdentity(updated);

    return res.json({
      logoUrl: updated.logoUrl,
      logoChanged: true,
      changedAt: updated.changedAt,
    });
  });

  // Real-time weather API via Open-Meteo (no fabricated numbers)
  app.get('/api/weather', async (req, res) => {
    const provinceParam = typeof req.query.province === 'string' ? req.query.province.trim() : 'Kinshasa';
    const coords = DRC_PROVINCE_COORDS[provinceParam] || DRC_PROVINCE_COORDS['Kinshasa'];

    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(coords.lat));
      url.searchParams.set('longitude', String(coords.lon));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code');
      url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max');
      url.searchParams.set('timezone', 'Africa/Kinshasa');
      url.searchParams.set('forecast_days', '6');

      const response = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        return res.status(502).json({
          error: 'Le fournisseur météo (Open-Meteo) est temporairement indisponible.',
        });
      }
      const data = await response.json();
      return res.json({
        province: provinceParam in DRC_PROVINCE_COORDS ? provinceParam : 'Kinshasa',
        city: coords.capital,
        source: 'Open-Meteo (données réelles)',
        fetchedAt: new Date().toISOString(),
        current: data.current,
        daily: data.daily,
      });
    } catch (err) {
      return res.status(503).json({
        error: 'Impossible de joindre le service météo en ligne. Vérifiez la connexion Internet.',
        detail: err instanceof Error ? err.message : 'Erreur réseau',
      });
    }
  });

  // AgriSmart Assistant (Server-side Gemini API)
  app.post('/api/assistant', async (req, res) => {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: "Le service d'assistant intelligent nécessite la configuration de la variable serveur GEMINI_API_KEY dans les paramètres Secrets.",
      });
    }

    const { message, history, language } = req.body ?? {};
    if (typeof message !== 'string' || message.trim().length < 2 || message.length > 2000) {
      return res.status(400).json({ error: 'Veuillez saisir une question agricole valide (2 à 2000 caractères).' });
    }

    const langNames: Record<string, string> = {
      fr: 'français',
      ln: 'lingala (avec termes agricoles clairs en français si utile)',
      sw: 'swahili congolais',
      kg: 'kikongo',
      lua: 'tshiluba',
    };
    const targetLang = langNames[typeof language === 'string' ? language : 'fr'] || 'français';

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .filter(
            (item): item is { role: 'user' | 'assistant'; text: string } =>
              Boolean(item) &&
              (item.role === 'user' || item.role === 'assistant') &&
              typeof item.text === 'string' &&
              item.text.length <= 2000
          )
      : [];

    const conversationContext = safeHistory
      .map((m) => `${m.role === 'user' ? 'Agriculteur' : 'AgriSmart Assistant'}: ${m.text}`)
      .join('\n');

    const prompt = conversationContext
      ? `${conversationContext}\nAgriculteur: ${message.trim()}`
      : message.trim();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            `Tu es AgriSmart Assistant, un agronome virtuel expert de l'agriculture en République démocratique du Congo (RDC). ` +
            `Réponds en ${targetLang}. Donne des conseils pratiques, adaptés aux réalités locales congolaises (manioc, maïs, riz, haricots, soja, café, cacao, maraîchage, sols tropicaux, saisons A et B, lutte intégrée). ` +
            `Sois clair, structuré, bienveillant et accessible aux débutants. Rappelle si pertinent de consulter un agronome local pour les cas graves.`,
        },
      });

      return res.json({
        reply: response.text || "Je n'ai pas pu formuler de réponse pour cette question.",
      });
    } catch (err) {
      return res.status(502).json({
        error: "Erreur lors de la communication avec le service d'intelligence agricole.",
        detail: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  });

  // Plant Disease Photo Diagnostic (Server-side Gemini Vision API)
  app.post('/api/diagnose', async (req, res) => {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Le module de diagnostic photo nécessite la configuration serveur de GEMINI_API_KEY dans les paramètres Secrets.',
      });
    }

    const { imageBase64, mimeType, crop, symptoms, language } = req.body ?? {};
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (typeof mimeType !== 'string' || !allowedMimes.includes(mimeType)) {
      return res.status(400).json({ error: 'Format image non supporté. Utilisez JPEG, PNG ou WebP.' });
    }
    if (typeof imageBase64 !== 'string' || imageBase64.length < 100 || imageBase64.length > 7_000_000) {
      return res.status(400).json({ error: 'Image invalide ou trop volumineuse (max 5 Mo).' });
    }
    if (typeof crop !== 'string' || crop.trim().length < 2 || crop.length > 80) {
      return res.status(400).json({ error: 'Veuillez sélectionner ou saisir la culture concernée.' });
    }

    const safeSymptoms = typeof symptoms === 'string' ? symptoms.slice(0, 600) : '';
    const langCode = typeof language === 'string' ? language : 'fr';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            {
              text:
                `Culture déclarée : ${crop.trim()}. Symptômes décrits : ${safeSymptoms || 'Non précisés'}. ` +
                `Langue de réponse : ${langCode === 'fr' ? 'français' : langCode}. ` +
                `Analyse cette photo de plante pour identifier les signes visuels d'une maladie, carence ou ravageur courant en RDC. ` +
                `Si la photo ne montre pas clairement une plante ou est floue, indique-le honnêtement dans potentialDisease et confidenceLevel.`,
            },
          ],
        },
        config: {
          systemInstruction:
            "Tu es un phytopathologiste spécialisé en cultures tropicales d'Afrique centrale (RDC). " +
            "Fournis un diagnostic indicatif prudent, sans jamais prétendre remplacer un examen de laboratoire ou un expert agricole terrain.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              potentialDisease: { type: Type.STRING, description: 'Nom probable de la maladie, ravageur ou carence.' },
              observedSymptoms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Symptômes visibles observés sur la photo.',
              },
              confidenceLevel: { type: Type.STRING, description: 'Niveau indicatif (Élevé, Modéré, Faible ou Image insuffisante).' },
              preventionAdvice: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Mesures préventives pratiques.',
              },
              treatmentRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Pistes de prise en charge et bonnes pratiques.',
              },
              expertDisclaimer: {
                type: Type.STRING,
                description: 'Rappel que le diagnostic est indicatif et nécessite validation par un expert agricole.',
              },
            },
            required: [
              'potentialDisease',
              'observedSymptoms',
              'confidenceLevel',
              'preventionAdvice',
              'treatmentRecommendations',
              'expertDisclaimer',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json(parsed);
    } catch (err) {
      return res.status(502).json({
        error: "Échec de l'analyse de l'image par le service de diagnostic.",
        detail: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AgriSmart-RDC server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
