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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DhPortero
});
//# sourceMappingURL=index.js.map