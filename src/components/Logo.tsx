import React, { createContext, useContext, useEffect, useState } from 'react';
import { Download, Sprout, User } from 'lucide-react';

const AppLogoContext = createContext<string | null>(null);

export const AppLogoProvider: React.FC<{
  logoUrl: string | null;
  children: React.ReactNode;
}> = ({ logoUrl, children }) => (
  <AppLogoContext.Provider value={logoUrl}>{children}</AppLogoContext.Provider>
);

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  lightText?: boolean;
  customLogoUrl?: string | null;
}

export const AgriSmartLogo: React.FC<LogoProps> = ({
  size = 'md',
  lightText = false,
  customLogoUrl,
}) => {
  const contextLogo = useContext(AppLogoContext);
  const resolvedLogo = customLogoUrl !== undefined ? customLogoUrl : contextLogo;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedLogo]);

  const iconSize = size === 'lg' ? 48 : size === 'sm' ? 28 : 34;
  const textSize = size === 'lg' ? 'text-2xl sm:text-3xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0 select-none">
      {resolvedLogo && !imgFailed ? (
        <img
          src={resolvedLogo}
          alt="Logo AgriSmart-RDC"
          width={iconSize}
          height={iconSize}
          onError={() => setImgFailed(true)}
          className="rounded-xl object-cover shrink-0 bg-white border border-slate-200"
          style={{ width: iconSize, height: iconSize }}
        />
      ) : (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect width="64" height="64" rx="16" fill="#168447" />
          <path
            d="M15 44C22 37.5 31 35 49 35C46 43.5 39 50 28 50C21.5 50 17.5 47.5 15 44Z"
            fill="#E8F5E9"
          />
          <path
            d="M19 37C19 24 30 14 47 14C47 28 38 39 24 39"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M22 38L36 24" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <circle cx="44" cy="18" r="4" fill="#1976D2" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="36" cy="24" r="2.5" fill="#1976D2" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      )}
      <span className={`${textSize} font-bold tracking-tight whitespace-nowrap`}>
        <span className={lightText ? 'text-white' : 'text-[#168447]'}>AgriSmart</span>
        <span className={lightText ? 'text-[#90CAF9]' : 'text-[#1976D2]'}>-RDC</span>
      </span>
    </div>
  );
};

interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoUrl,
  name = 'Utilisateur',
  size = 'md',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl]);

  const dims =
    size === 'xl'
      ? 'w-20 h-20'
      : size === 'lg'
        ? 'w-14 h-14'
        : size === 'md'
          ? 'w-11 h-11'
          : size === 'xs'
            ? 'w-7 h-7'
            : 'w-9 h-9';

  const iconDims =
    size === 'xl'
      ? 'w-9 h-9'
      : size === 'lg'
        ? 'w-7 h-7'
        : size === 'md'
          ? 'w-5 h-5'
          : size === 'xs'
            ? 'w-3.5 h-3.5'
            : 'w-4 h-4';

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={`Photo de profil de ${name}`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${dims} rounded-full object-cover border border-slate-200 shrink-0 bg-[#E8F5E9] ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Avatar par défaut de ${name}`}
      className={`${dims} rounded-full bg-[#E8F5E9] text-[#168447] border border-[#168447]/20 flex items-center justify-center shrink-0 ${className}`}
    >
      <User className={iconDims} />
    </div>
  );
};

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#E8F5E9] to-[#DCEFE2] text-[#168447] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sprout className="w-8 h-8 mb-1.5 opacity-80" />
        <span className="text-xs font-medium text-[#263238]/70 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isInstalled || !deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-[#1976D2] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1565C0] transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
    >
      <Download className="w-4 h-4" />
      <span>Installer sur Android</span>
    </button>
  );
};
