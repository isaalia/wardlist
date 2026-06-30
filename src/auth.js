// ─── AE Authentik OIDC Auth Service ───────────────────────────────────────
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "https://auth.agyemanenterprises.com";
const CLIENT_ID = import.meta.env.VITE_AUTHENTIK_CLIENT_ID || "wardlist";
const APP_URL  = typeof window !== "undefined" ? window.location.origin : "https://wardlist.app";

const oidcConfig = {
  authority: `${AUTH_BASE}/application/o/${CLIENT_ID}`,
  client_id: CLIENT_ID,
  redirect_uri: `${APP_URL}/`,
  post_logout_redirect_uri: APP_URL,
  response_type: "code",
  scope: "openid profile email",
  loadUserInfo: true,
  automaticSilentRenew: true,
  silent_redirect_uri: `${APP_URL}/silent-renew.html`,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
};

const mgr = new UserManager(oidcConfig);

export function getUser() {
  return mgr.getUser();
}

export function signin() {
  return mgr.signinRedirect();
}

export function signinCallback() {
  return mgr.signinRedirectCallback();
}

export function signout() {
  return mgr.signoutRedirect();
}

export function signoutCallback() {
  return mgr.signoutRedirectCallback();
}

export function getAccessToken() {
  return mgr.getUser().then(u => u?.access_token || null);
}

// Events: user loaded, token expiring, silent renew error
mgr.events.addUserLoaded((user) => {
  console.debug("[ae-auth] user loaded", user.profile.preferred_username);
});

mgr.events.addSilentRenewError((err) => {
  console.warn("[ae-auth] silent renew failed", err.message);
});
