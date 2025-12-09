/**
 * googleAuth (stub)
 * Beginner-safe placeholders for a future PKCE OAuth flow with Google Calendar.
 * Nothing here makes network calls; it just documents the shapes we will use.
 */

export type GoogleConnectStatus = 'disconnected' | 'ready' | 'error';

export interface GoogleTokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  idToken?: string;
  scope?: string;
}

export interface GoogleProfileHint {
  email?: string;
  name?: string;
}

type InitResponse = {
  authUrl: string;
  note?: string;
};

// Generates a PKCE verifier/challenge pair. Real impl will use crypto.subtle.
export const createPkcePair = () => {
  const verifier = 'pkce-placeholder-verifier';
  const challenge = 'pkce-placeholder-challenge';
  return { verifier, challenge };
};

// Builds the Google OAuth URL with PKCE params. Replace clientId/redirect with env-backed values later.
export const buildGoogleAuthUrl = (options: {
  clientId?: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
}) => {
  const params = new URLSearchParams({
    client_id: options.clientId || 'GOOGLE_CLIENT_ID',
    redirect_uri: options.redirectUri || 'http://localhost:5173/oauth/callback',
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: options.scope || 'https://www.googleapis.com/auth/calendar.events',
    state: options.state || 'couples-calendar-stub',
    code_challenge: options.codeChallenge || 'challenge',
    code_challenge_method: 'S256',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

// Placeholder exchange. In production this would POST the code + verifier to your backend.
export const exchangeAuthCode = async (_code: string, _verifier: string): Promise<GoogleTokenBundle> => {
  return {
    accessToken: 'stub-access-token',
    refreshToken: 'stub-refresh-token',
    expiresAt: Date.now() + 3600_000,
  };
};

export const startGoogleConnect = async (): Promise<InitResponse> => {
  try {
    const res = await fetch('/v1/google/oauth/init', { method: 'POST' });
    if (!res.ok) throw new Error('init failed');
    const data = await res.json();
    return data as InitResponse;
  } catch (err) {
    console.warn('Google init failed, falling back to stub', err);
    return { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?stub=1', note: 'stub' };
  }
};

// Lightweight mapper to stash token metadata client-side if needed (use secure storage server-side instead).
export const persistGoogleStatus = (status: GoogleConnectStatus, profile?: GoogleProfileHint) => ({ status, profile });

// Coming soon: subscribe to token refresh events or push notifications.
export const onGoogleStatusChange = (_cb: (status: GoogleConnectStatus) => void) => {
  return () => {};
};
