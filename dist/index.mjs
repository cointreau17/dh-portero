// src/index.ts
var DhPortero = class {
  static EVENT_NAME = "dh-auth-state-changed";
  static STORAGE_KEY = "dh_auth_token";
  /**
   * Actualiza el estado de autenticación y lo emite a todos los listeners.
   * El Shell (diario-hilario-web-x1) debe llamar a este método cuando
   * el usuario inicie o cierre sesión.
   */
  static setAuthState(isLoggedIn, user = null, token) {
    console.log("[DhPortero] setAuthState called \u2014 isLoggedIn:", isLoggedIn, "| token present:", !!token);
    if (token) {
      localStorage.setItem(this.STORAGE_KEY, token);
      console.log("[DhPortero] token saved to localStorage");
    } else if (!isLoggedIn) {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log("[DhPortero] token removed from localStorage");
    } else {
      console.warn("[DhPortero] isLoggedIn=true but no token provided \u2014 localStorage NOT updated");
    }
    const state = { isLoggedIn, user };
    const event = new CustomEvent(this.EVENT_NAME, {
      detail: state,
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
    console.log("[DhPortero] event dispatched:", this.EVENT_NAME, state);
  }
  /**
   * Comprobación síncrona de si el usuario está logueado.
   * Útil para los Remotos (paper) en su carga inicial, o directivas booleanas.
   */
  static isLoggedIn() {
    const result = localStorage.getItem(this.STORAGE_KEY) !== null;
    console.log("[DhPortero] isLoggedIn() called \u2014 result:", result, "| key in localStorage:", !!localStorage.getItem(this.STORAGE_KEY));
    return result;
  }
  /**
   * Suscribirse a los cambios en vivo del estado de autenticación.
   * Útil para que los Remotos reaccionen instantáneamente (ej. Signals, Behaviors).
   * @returns Función para de-suscribirse.
   */
  static onChange(callback) {
    console.log("[DhPortero] onChange listener registered");
    const handler = (event) => {
      const customEvent = event;
      console.log("[DhPortero] onChange event received:", customEvent.detail);
      callback(customEvent.detail);
    };
    window.addEventListener(this.EVENT_NAME, handler);
    return () => {
      window.removeEventListener(this.EVENT_NAME, handler);
    };
  }
  /**
   * Obtiene el token guardado, útil para interceptores HTTP.
   */
  static getToken() {
    return localStorage.getItem(this.STORAGE_KEY);
  }
};
export {
  DhPortero
};
//# sourceMappingURL=index.mjs.map