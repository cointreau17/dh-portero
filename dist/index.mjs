// src/index.ts
var DhPortero = class {
  static EVENT_NAME = "dh-auth-state-changed";
  static HEADER_IMAGE_EVENT = "dh-header-image-changed";
  static STORAGE_KEY = "dh_auth_token";
  static HEADER_IMAGE_KEY = "dh_header_image";
  static config = null;
  /**
   * Inicializa la configuración global de la librería.
   * El Shell debe llamar a este método una sola vez al arrancar,
   * antes de que los remotos intenten hacer peticiones.
   */
  static configure(config) {
    this.config = config;
    console.log("[DhPortero] configured \u2014 baseUrl:", config.baseUrl);
  }
  /**
   * Obtiene los miembros de un grupo.
   * Devuelve un array vacío en entornos sin window (SSR).
   */
  static async getGroupMembers(groupId) {
    if (typeof window === "undefined") {
      return [];
    }
    if (!this.config) {
      console.warn("[DhPortero] getGroupMembers called before configure()");
      return [];
    }
    const token = this.getToken();
    const response = await fetch(`${this.config.baseUrl}/group/${groupId}/members`, {
      headers: token ? { Authorization: `Bearer ${token}` } : void 0
    });
    if (response.status === 401) {
      console.warn("[DhPortero] getGroupMembers \u2014 401 Unauthorized, token missing or expired");
      return [];
    }
    if (!response.ok) {
      throw new Error(`[DhPortero] getGroupMembers failed: ${response.status}`);
    }
    return await response.json();
  }
  /**
   * Obtiene el perfil del usuario autenticado desde la API.
   * Devuelve null si no hay sesión o si falla la petición.
   */
  static async getCurrentUser() {
    if (typeof window === "undefined") return null;
    if (!this.config) {
      console.warn("[DhPortero] getCurrentUser called before configure()");
      return null;
    }
    const token = this.getToken();
    if (!token) return null;
    const response = await fetch(`${this.config.baseUrl}/api/myuser`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 401) {
      console.warn("[DhPortero] getCurrentUser \u2014 401 Unauthorized");
      return null;
    }
    if (!response.ok) {
      throw new Error(`[DhPortero] getCurrentUser failed: ${response.status}`);
    }
    return await response.json();
  }
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
    if (typeof window === "undefined") return () => {
    };
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
  /**
   * Publica una URL de imagen de cabecera desde un proyecto federado.
   * El Shell recibirá el cambio mediante onHeaderImageChange().
   * Pasar null elimina la imagen actual.
   */
  static setHeaderImage(url) {
    if (typeof window === "undefined") return;
    if (url !== null) {
      localStorage.setItem(this.HEADER_IMAGE_KEY, url);
    } else {
      localStorage.removeItem(this.HEADER_IMAGE_KEY);
    }
    const event = new CustomEvent(this.HEADER_IMAGE_EVENT, {
      detail: { url },
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
    console.log("[DhPortero] setHeaderImage dispatched:", url);
  }
  /**
   * Suscribirse a los cambios de imagen de cabecera.
   * El Shell debe llamar a este método para reaccionar en tiempo real.
   * @returns Función para de-suscribirse.
   */
  static onHeaderImageChange(callback) {
    if (typeof window === "undefined") return () => {
    };
    const handler = (event) => {
      const customEvent = event;
      callback(customEvent.detail.url);
    };
    window.addEventListener(this.HEADER_IMAGE_EVENT, handler);
    return () => window.removeEventListener(this.HEADER_IMAGE_EVENT, handler);
  }
  /**
   * Lectura síncrona de la última URL de imagen de cabecera almacenada.
   * Útil para la carga inicial del Shell antes de que llegue ningún evento.
   */
  static getHeaderImage() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.HEADER_IMAGE_KEY);
  }
};
export {
  DhPortero
};
//# sourceMappingURL=index.mjs.map