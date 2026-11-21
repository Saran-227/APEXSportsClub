/**
 * Google Identity Services & OAuth 2.0 Helper
 */

export interface GoogleJwtPayload {
  iss?: string;
  sub: string;
  azp?: string;
  aud?: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat?: number;
  exp?: number;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
            }
          ) => void;
          prompt: (notification?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
        };
      };
    };
  }
}

export function getGoogleClientId(): string {
  return (
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '666611753013-6i92i0b4gh5kqcmqr9e9osjltj6p8i65.apps.googleusercontent.com'
  );
}

export function getGoogleRedirectUri(): string {
  if (typeof window !== 'undefined') {
    return (
      import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
      `${window.location.origin}/api/auth/google/callback`
    );
  }
  return 'http://localhost:5174/api/auth/google/callback';
}

/**
 * Initiates the full OAuth 2.0 redirect flow to Google's consent screen.
 * Uses the authorised redirect URI configured in Google Cloud Console.
 */
export function initiateGoogleOAuthRedirect(): void {
  const clientId = getGoogleClientId();
  const redirectUri = getGoogleRedirectUri();
  const nonce = Math.random().toString(36).substring(2, 15);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'id_token token');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('prompt', 'select_account');

  window.location.href = authUrl.toString();
}

/**
 * Parses and safely decodes a Google Identity Services JWT credential string.
 */
export function parseGoogleCredential(credential: string): GoogleJwtPayload | null {
  try {
    const parts = credential.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse Google JWT credential:', error);
    return null;
  }
}
