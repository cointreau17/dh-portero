"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DhPortero: () => DhPortero
});
module.exports = __toCommonJS(index_exports);
var DhPortero = class {
  static EVENT_NAME = "dh-auth-state-changed";
  static STORAGE_KEY = "dh_auth_token";
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DhPortero
});
//# sourceMappingURL=index.js.map