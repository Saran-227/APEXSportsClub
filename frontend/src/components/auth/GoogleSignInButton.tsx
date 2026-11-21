import React, { useEffect, useRef, useState } from 'react';
import { getGoogleClientId, initiateGoogleOAuthRedirect } from '../../services/googleAuth';

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
}) => {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [gisLoaded, setGisLoaded] = useState<boolean>(false);
  const clientId = getGoogleClientId();

  useEffect(() => {
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const initializeGis = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id && buttonContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential: string }) => {
              if (response.credential) {
                onSuccess(response.credential);
              } else {
                onError?.('Google authentication did not return credentials.');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official Google button
          buttonContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(buttonContainerRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: '100%',
          });

          setGisLoaded(true);
          if (checkInterval) clearInterval(checkInterval);
        } catch (err) {
          console.warn('Google Identity Services initialization notice:', err);
        }
      }
    };

    // Attempt immediate initialization
    initializeGis();

    // Poll briefly in case external script tag finishes loading after mount
    checkInterval = setInterval(() => {
      if (window.google?.accounts?.id) {
        initializeGis();
      }
    }, 300);

    const timeout = setTimeout(() => {
      if (checkInterval) clearInterval(checkInterval);
    }, 5000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [clientId, onSuccess, onError]);

  const handleManualPrompt = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      initiateGoogleOAuthRedirect();
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Container where Google Identity Services renders its official iframe button */}
      <div
        ref={buttonContainerRef}
        className={`w-full flex justify-center min-h-[44px] ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      />

      {/* Fallback button if GIS script is delayed or blocked */}
      {!gisLoaded && (
        <button
          type="button"
          onClick={handleManualPrompt}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      )}
    </div>
  );
};
