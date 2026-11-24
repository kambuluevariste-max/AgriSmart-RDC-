export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export function normalizePhone(value: string): string {
  return value.replace(/[\s\-().]/g, '').trim();
}

export function isValidPhone(value: string): boolean {
  const normalized = normalizePhone(value);
  return /^\+?[0-9]{8,15}$/.test(normalized);
}

export function isValidEmailOrPhone(value: string): boolean {
  return isValidEmail(value) || isValidPhone(value);
}

export function isAllowedImageDataUrl(value: string, maxChars = 280000): boolean {
  if (!value || value.length > maxChars) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * Compresses and resizes a gallery image client-side so it fits low-bandwidth DRC connections
 * and stays within strict storage size limits.
 */
export async function compressImageFile(
  file: File,
  options: { maxDim?: number; maxDataUrlChars?: number; preferPng?: boolean } = {}
): Promise<string> {
  const maxDim = options.maxDim ?? 320;
  const maxChars = options.maxDataUrlChars ?? 42000;
  const preferPng = options.preferPng ?? false;

  if (!file.type.startsWith('image/')) {
    throw new Error('Veuillez sélectionner un fichier image valide (JPG, PNG ou WebP).');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("L'image sélectionnée est trop volumineuse (maximum 10 Mo).");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Impossible de lire l'image sélectionnée."));
      el.src = objectUrl;
    });

    const ratio = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
    let width = Math.max(1, Math.round((img.width || maxDim) * ratio));
    let height = Math.max(1, Math.round((img.height || maxDim) * ratio));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Traitement image non pris en charge par ce navigateur.');
    }

    const mime = preferPng ? 'image/png' : 'image/jpeg';
    let quality = 0.85;
    let dataUrl = '';

    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      if (!preferPng) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      dataUrl = preferPng ? canvas.toDataURL('image/png') : canvas.toDataURL(mime, quality);
      if (dataUrl.length <= maxChars) {
        return dataUrl;
      }
      if (!preferPng && quality > 0.45) {
        quality -= 0.15;
      } else {
        width = Math.max(64, Math.round(width * 0.78));
        height = Math.max(64, Math.round(height * 0.78));
      }
    }

    // Final fallback as JPEG if PNG exceeded limit
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    dataUrl = canvas.toDataURL('image/jpeg', 0.65);

    if (dataUrl.length > maxChars) {
      throw new Error("L'image reste trop lourde après compression. Choisissez une image plus petite.");
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Converts a selected gallery image file into a lightweight Base64 Data URL
 * suitable for storing directly in the Firestore `users/{uid}` document
 * (`photoUrl` <= 50 000 chars) and syncing over low-bandwidth DRC connections.
 */
export async function prepareUserPhotoBase64(file: File): Promise<string> {
  return compressImageFile(file, {
    maxDim: 280,
    maxDataUrlChars: 42000,
    preferPng: false,
  });
}

/**
 * Saves a Base64 profile image directly onto the user's Firestore document
 * (`users/{uid}.photoUrl`) when authenticated with a verified Firebase account.
 */
export async function saveProfileImageToFirestore(
  file: File,
  options?: { uid?: string; canWriteFirestore?: boolean }
): Promise<string> {
  const base64DataUrl = await prepareUserPhotoBase64(file);

  if (options?.canWriteFirestore && options.uid) {
    const [{ doc, getDoc, serverTimestamp, updateDoc }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('./firebase'),
    ]);
    const userRef = doc(db, 'users', options.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      await updateDoc(userRef, {
        photoUrl: base64DataUrl,
        updatedAt: serverTimestamp(),
      });
    }
  }

  return base64DataUrl;
}
