// Integration preview for a server-side Node.js application.
// npm install openid-client@6
// Requires a provisioned OIDC issuer; no New Tibet issuer exists yet.
import * as oidc from 'openid-client';

const membershipClaim = 'https://newtibet.com/claims/membership';
let configuration;

function setting(name) {
  const value = process.env[name];
  if (!value || value.startsWith('replace-with-')) {
    throw new Error(`Configure ${name} after integration onboarding.`);
  }
  return value;
}

function redirectUri() {
  const url = new URL(setting('NEW_TIBET_REDIRECT_URI'));
  if (url.protocol !== 'https:' || url.search || url.hash) {
    throw new Error('Register an exact HTTPS callback without a query or fragment.');
  }
  return url.href;
}

async function config() {
  const issuer = new URL(setting('NEW_TIBET_ISSUER'));
  if (issuer.protocol !== 'https:' || issuer.hostname.endsWith('.example')) {
    throw new Error('Use the real issuer supplied during onboarding.');
  }
  configuration ??= oidc.discovery(
    issuer,
    setting('NEW_TIBET_CLIENT_ID'),
    setting('NEW_TIBET_CLIENT_SECRET'),
    oidc.ClientSecretBasic(setting('NEW_TIBET_CLIENT_SECRET'))
  );
  return configuration;
}

// GET /auth/new-tibet
// session is a per-browser record in your SERVER-SIDE session store.
export async function beginSignIn(session) {
  const provider = await config();
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  session.newTibet = { verifier, state, nonce, expires: Date.now() + 300_000 };

  return oidc.buildAuthorizationUrl(provider, {
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: `openid ${process.env.NEW_TIBET_MEMBERSHIP_SCOPE || 'membership'}`,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    state,
    nonce
  });
  // Persist session before redirecting the browser to this URL.
}

// GET /auth/new-tibet/callback
export async function completeSignIn(callbackUrl, session) {
  const pending = session.newTibet;
  delete session.newTibet;
  // Persist this deletion, including on errors; consume it only once.
  if (!pending || pending.expires < Date.now()) {
    throw new Error('Sign-in expired. Start again.');
  }

  const current = new URL(callbackUrl);
  const expected = new URL(redirectUri());
  if (current.origin !== expected.origin || current.pathname !== expected.pathname) {
    throw new Error('Unexpected sign-in callback.');
  }

  const tokens = await oidc.authorizationCodeGrant(await config(), current, {
    pkceCodeVerifier: pending.verifier,
    expectedState: pending.state,
    expectedNonce: pending.nonce,
    idTokenExpected: true
  });
  const claims = tokens.claims();
  if (!claims?.sub) throw new Error('A validated identity is required.');

  // The namespaced membership claim is PROPOSED, not a published contract.
  const data = claims[membershipClaim];
  const membership = data?.verified === true && ['green', 'blue'].includes(data.book_type)
    ? { verified: true, bookType: data.book_type }
    : null;

  // Find/create your local user by BOTH issuer and subject.
  // Rotate the session ID and store only the data your app needs.
  return { issuer: claims.iss, subject: claims.sub, membership };
}

// Enforce access on the server, after validated sign-in.
export function canUseGreenBookFeature(identity) {
  return identity.membership?.verified === true && identity.membership.bookType === 'green';
}
