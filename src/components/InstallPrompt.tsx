import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'tally-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobile(): boolean {
  return window.matchMedia('(max-width: 600px)').matches;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // Ignore -- worst case the banner reappears next visit.
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(wasDismissed);

  useEffect(() => {
    if (isStandalone() || !isMobile() || wasDismissed()) return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Safari never fires beforeinstallprompt -- show manual instructions instead.
    if (isIos()) setShowIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (dismissed || isStandalone() || !isMobile()) return null;
  if (!deferredPrompt && !showIosHint) return null;

  function handleDismiss() {
    dismiss();
    setDismissed(true);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
    setDismissed(true);
  }

  return (
    <div className="install-banner">
      {deferredPrompt ? (
        <>
          <span className="install-banner-text">Add Tally to your home screen</span>
          <div className="install-banner-actions">
            <button type="button" className="install-banner-btn" onClick={handleInstall}>
              Install
            </button>
            <button type="button" className="install-banner-dismiss" onClick={handleDismiss} aria-label="Dismiss">
              ✕
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="install-banner-text">
            Add Tally to your home screen: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
          </span>
          <button type="button" className="install-banner-dismiss" onClick={handleDismiss} aria-label="Dismiss">
            ✕
          </button>
        </>
      )}
    </div>
  );
}
