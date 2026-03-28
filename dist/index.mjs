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
    if (token) {
      localStorage.setItem(this.STORAGE_KEY, token);
    } else if (!isLoggedIn) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    const state = { isLoggedIn, user };
    const event = new CustomEvent(this.EVENT_NAME, {
      detail: state,
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
  }
  /**
   * Comprobación síncrona de si el usuario está logueado.
   * Útil para los Remotos (paper) en su carga inicial, o directivas booleanas.
   */
  static isLoggedIn() {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
  /**
   * Suscribirse a los cambios en vivo del estado de autenticación.
   * Útil para que los Remotos reaccionen instantáneamente (ej. Signals, Behaviors).
   * @returns Función para de-suscribirse.
   */
  static onChange(callback) {
    const handler = (event) => {
      const customEvent = event;
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