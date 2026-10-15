/* =====================================================================
   IDEAS CONTROL · Inicio de sesión con Microsoft (MSAL)
   shared/js/auth.js — requiere msal-browser cargado antes.
   Uso: await IC.auth.iniciar({ clientId, tenantId, redirectPath, scopes })
   ===================================================================== */
window.IC = window.IC || {};
IC.auth = (function () {
  let app = null, cuenta = null, cfg = null;

  async function iniciar(config) {
    cfg = config;
    const redirectUri = location.origin + cfg.redirectPath;   // funciona con y sin www
    app = new msal.PublicClientApplication({
      auth: { clientId: cfg.clientId, authority: 'https://login.microsoftonline.com/' + cfg.tenantId, redirectUri, postLogoutRedirectUri: redirectUri },
      cache: { cacheLocation: 'localStorage' }
    });
    await app.initialize();
    const r = await app.handleRedirectPromise();
    if (r && r.account) app.setActiveAccount(r.account);
    cuenta = app.getActiveAccount() || app.getAllAccounts()[0] || null;
    if (cuenta) app.setActiveAccount(cuenta);
    return cuenta;
  }

  function entrar() {
    sessionStorage.setItem('ic_volver_a', location.hash || '');
    return app.loginRedirect({ scopes: cfg.scopes, prompt: 'select_account' });
  }

  function salir() { return app.logoutRedirect({ account: cuenta }); }

  async function token() {
    try {
      return (await app.acquireTokenSilent({ scopes: cfg.scopes, account: cuenta })).accessToken;
    } catch (e) {
      if (e instanceof msal.InteractionRequiredAuthError) await app.acquireTokenRedirect({ scopes: cfg.scopes, account: cuenta });
      throw e;
    }
  }

  function volverA() { const h = sessionStorage.getItem('ic_volver_a'); sessionStorage.removeItem('ic_volver_a'); return h; }

  return { iniciar, entrar, salir, token, volverA, cuenta: () => cuenta };
})();
