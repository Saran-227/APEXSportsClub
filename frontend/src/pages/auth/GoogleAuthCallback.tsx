import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/api';
import { getRoleDefaultDashboard } from '../../utils/navigation';
import { Alert } from '../../components/ui/Alert';

export const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle, register } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function processGoogleCallback() {
      try {
        // 1. Check hash fragment (OAuth response_type=id_token token)
        const hash = location.hash.startsWith('#') ? location.hash.substring(1) : location.hash;
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(location.search);

        const idToken = hashParams.get('id_token') || searchParams.get('id_token');
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const error = hashParams.get('error') || searchParams.get('error');

        if (error) {
          throw new Error(`Google Authentication failed: ${error}`);
        }

        if (idToken) {
          const success = await loginWithGoogle(idToken);
          if (success) {
            try {
              const usr = await authApi.getCurrentUser();
              navigate(getRoleDefaultDashboard(usr), { replace: true });
            } catch {
              navigate('/customer/dashboard', { replace: true });
            }
            return;
          }
        }

        if (accessToken) {
          // Fetch Google User Profile using access token
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!res.ok) {
            throw new Error('Failed to retrieve user profile from Google.');
          }

          const profile = await res.json();
          if (profile.email) {
            const success = await register({
              email: profile.email,
              firstName: profile.given_name || profile.name?.split(' ')[0] || 'Club',
              lastName: profile.family_name || profile.name?.split(' ').slice(1).join(' ') || 'Member',
            });

            if (success) {
              navigate('/customer/dashboard', { replace: true });
              return;
            }
          }
        }

        // If no credentials found in URL
        if (!idToken && !accessToken) {
          throw new Error('No authentication credential was received from Google.');
        }
      } catch (err: any) {
        console.error('Google Callback Error:', err);
        setErrorMessage(err.message || 'An unexpected error occurred during Google Sign-In.');
      }
    }

    processGoogleCallback();
  }, [location, loginWithGoogle, register, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0D10] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-[#23272C] bg-[#111417] p-8 shadow-2xl backdrop-blur-md text-center">
        {errorMessage ? (
          <div>
            <Alert type="error" className="mb-4">
              {errorMessage}
            </Alert>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 rounded-full bg-[#C7FF36] text-slate-950 font-bold text-xs"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C7FF36] border-t-transparent" />
            <p className="text-sm text-slate-400">Authenticating with Google...</p>
          </div>
        )}
      </div>
    </div>
  );
};
