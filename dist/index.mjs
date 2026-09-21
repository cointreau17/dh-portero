// src/index.ts
var DhPortero = class {
  static EVENT_NAME = "dh-auth-state-changed";
  static HEADER_IMAGE_EVENT = "dh-header-image-changed";
  static HEADER_IMAGE_KEY = "dh_header_image";
  static HEADER_IMAGE_HEIGHT_KEY = "dh_header_image_height";
  /**
   * Clave heredada de v1.x, cuando el token se persistía en localStorage.
   * Ya no se escribe; solo se borra (ver `purgeLegacyToken`).
   */
  static LEGACY_STORAGE_KEY = "dh_auth_token";
  static DEFAULT_SESSION_COOKIE = "access_token";
  static config = { baseUrl: "" };
  /**
   * Copia EN MEMORIA del token. Muere con la pestaña: no es un almacén
   * persistente, solo evita releer la cookie en cada llamada y permite que
   * `getToken()` siga siendo síncrono para los consumidores que lo necesitan
   * (XHR de subida de imágenes en paper).
   */
  static token = null;
  static CHAT_CLIENT_EVENT = "dh-chat-client-changed";
  /**
   * Cliente de chat que publica el Shell. Referencia viva, no dato: muere con
   * la pestaña y no se serializa. Ver `setChatClient()`.
   */
  static chatClient = null;
  /**
   * Inicializa la configuración global de la librería. Admite llamadas
   * parciales y sucesivas: el Shell fija `baseUrl` al arrancar y añade
   * `getToken` más tarde, cuando Auth0 ya está disponible.
   */
  static configure(config) {
    this.config = { ...this.config, ...config };
    this.purgeLegacyToken();
  }
  /**
   * Borra el token que v1.x dejaba en localStorage.
   *
   * localStorage no caduca, así que una sesión vieja podía dejar ahí un JWT
   * muerto para siempre y `isLoggedIn()` seguía diciendo `true`. Se limpia al
   * configurar para que nadie arrastre ese estado al actualizar.
   */
  /**
   * TODO: Borrar en el futuro ya que no estará el token antiguo
   * dentro de unos meses en los ordenadores de la gente
   * */
  static purgeLegacyToken() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(this.LEGACY_STORAGE_KEY);
    } catch {
    }
  }
  /**
   * Lee la cookie de sesión que escribe el Shell.
   *
   * Es la única copia persistente del token y la comparte con el SSR, que la
   * recibe en la cabecera `Cookie`. Al llevar `expires` = `exp` del JWT, el
   * navegador la borra sola al caducar: su mera presencia ya significa
   * "sesión viva", sin necesidad de decodificar nada.
   */
  static readSessionCookie() {
    if (typeof document === "undefined") return null;
    const name = this.config.sessionCookieName ?? this.DEFAULT_SESSION_COOKIE;
    const prefix = `${name}=`;
    for (const part of document.cookie.split(";")) {
      const cookie = part.trim();
      if (!cookie.startsWith(prefix)) continue;
      const value = cookie.slice(prefix.length);
      return value.length > 0 ? value : null;
    }
    return null;
  }
  /**
   * Token fresco para las llamadas asíncronas.
   *
   * Prefiere el proveedor del Shell (que renueva contra Auth0) y cae a la
   * cookie si no está configurado —por ejemplo si un remoto se carga antes de
   * que el Shell termine de inicializarse—.
   */
  static async resolveToken() {
    if (this.config.getToken) {
      try {
        const fresh = await this.config.getToken();
        if (fresh) {
          this.token = fresh;
          return fresh;
        }
      } catch (error) {
        console.warn("[DhPortero] getToken() del Shell fall\xF3, se usa la cookie", error);
      }
    }
    return this.getToken();
  }
  /**
   * La API tiene DOS rutas para los miembros, según cómo se identifique el
   * grupo: `/group/{uuid}/members` y `/group-by-slug/{slug}/members`.
   *
   * Quien llama no siempre sabe cuál tiene a mano —paper trabaja con el uuid
   * del grupo cargado, y un remote montado bajo `/media/<seccion>/<slug>`
   * solo tiene el slug de la URL—, así que se elige aquí mirando la forma.
   *
   * No es cosmético: pasarle un slug a la ruta del uuid devuelve **500**, no
   * 404, y el error que llega arriba no dice nada útil.
   */
  static rutaDeMiembros(groupId) {
    const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId);
    return esUuid ? `/group/${groupId}/members` : `/group-by-slug/${groupId}/members`;
  }
  /**
   * Obtiene los miembros de un grupo.
   * Devuelve un array vacío en entornos sin window (SSR).
   */
  static async getGroupMembers(groupId) {
    if (typeof window === "undefined") {
      return [];
    }
    if (!this.config.baseUrl) {
      console.warn("[DhPortero] getGroupMembers called before configure()");
      return [];
    }
    const token = await this.resolveToken();
    const response = await fetch(`${this.config.baseUrl}${this.rutaDeMiembros(groupId)}`, {
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
    if (!this.config.baseUrl) {
      console.warn("[DhPortero] getCurrentUser called before configure()");
      return null;
    }
    const token = await this.resolveToken();
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
   * El Shell (diario-hilario-web-x1) debe llamar a este método cuando el
   * usuario inicie o cierre sesión, y cada vez que renueve el token.
   *
   * A partir de v2 el token NO se persiste aquí: quien manda es la cookie de
   * sesión, que escribe el Shell y comparte con el SSR. Lo que se pasa en
   * `token` alimenta solo la copia en memoria.
   */
  static setAuthState(isLoggedIn, user = null, token) {
    if (typeof window === "undefined") return;
    this.token = isLoggedIn ? token ?? this.token : null;
    if (!isLoggedIn && this.chatClient !== null) {
      this.setChatClient(null);
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
   *
   * Mira la cookie de sesión, no memoria: sobrevive a la recarga y caduca
   * cuando caduca el token. En v1.x miraba localStorage, que no caduca nunca,
   * y devolvía `true` indefinidamente con una sesión muerta.
   */
  static isLoggedIn() {
    return this.readSessionCookie() !== null;
  }
  /**
   * Suscribirse a los cambios en vivo del estado de autenticación.
   * Útil para que los Remotos reaccionen instantáneamente (ej. Signals, Behaviors).
   * @returns Función para de-suscribirse.
   */
  static onChange(callback) {
    if (typeof window === "undefined") return () => {
    };
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
   * Obtiene el token de forma síncrona, útil para XHR e interceptores que no
   * pueden esperar a una promesa.
   *
   * Sirve la copia en memoria y, si está fría, la ceba desde la cookie. Para
   * llamadas que puedan esperar es preferible `getTokenAsync()`, que pide al
   * Shell un token recién renovado.
   */
  static getToken() {
    if (this.token) return this.token;
    const fromCookie = this.readSessionCookie();
    if (fromCookie) this.token = fromCookie;
    return this.token;
  }
  /**
   * Token fresco: pide al Shell que lo renueve si hace falta.
   * Preferible a `getToken()` siempre que el llamante pueda esperar.
   */
  static getTokenAsync() {
    if (typeof window === "undefined") return Promise.resolve(null);
    return this.resolveToken();
  }
  /**
   * Publica el cliente de chat ya conectado para que lo usen los remotos.
   *
   * Lo llama el Shell al terminar de conectar, y con `null` al cerrar sesión.
   *
   * Existe porque la conexión a Stream NO se puede duplicar: es un websocket
   * por usuario y pestaña. Si cada remoto pidiera su token y abriera el suyo,
   * cada mensaje llegaría dos veces —y el Shell muestra un aviso por cada
   * `message.new`, así que se verían duplicados—. Compartiendo el cliente ya
   * autenticado, el remoto dispone de la API entera sin abrir nada.
   *
   * Es una referencia viva en memoria, no un dato serializable: no se guarda
   * en ningún almacén ni sobrevive a la recarga, y solo vale dentro de esta
   * misma ventana. Por eso el tipo es `unknown` y lo concreta quien lo
   * recoge: así esta librería sigue sin depender de `stream-chat`.
   */
  static setChatClient(cliente) {
    if (typeof window === "undefined") return;
    this.chatClient = cliente ?? null;
    const event = new CustomEvent(this.CHAT_CLIENT_EVENT, {
      detail: this.chatClient,
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
  }
  /**
   * Cliente de chat del Shell, o `null` si todavía no ha conectado.
   *
   * Lectura síncrona y puntual. Si el remoto puede montarse antes que el
   * Shell —que es lo normal—, conviene `onChatClient()`, que además avisa
   * cuando llega.
   */
  static getChatClient() {
    return this.chatClient ?? null;
  }
  /**
   * Suscribe a la llegada del cliente de chat.
   *
   * **Si ya está disponible, el callback se invoca de inmediato**, antes de
   * devolver la función de baja. Es deliberado: el orden de arranque entre
   * Shell y remotos no está garantizado, y sin esto un remoto que montara
   * tarde no recibiría nunca el aviso y se quedaría esperando un evento que
   * ya pasó.
   *
   * @returns Función para de-suscribirse.
   */
  static onChatClient(callback) {
    if (typeof window === "undefined") return () => {
    };
    if (this.chatClient !== null) {
      callback(this.chatClient);
    }
    const handler = (event) => {
      callback(event.detail);
    };
    window.addEventListener(this.CHAT_CLIENT_EVENT, handler);
    return () => window.removeEventListener(this.CHAT_CLIENT_EVENT, handler);
  }
  /**
   * Publica una URL de imagen de cabecera desde un proyecto federado.
   * El Shell recibirá el cambio mediante onHeaderImageChange().
   * Pasar null elimina la imagen actual.
   * @param height Alto en píxeles de la imagen. Pasar null elimina el alto almacenado.
   */
  static setHeaderImage(url, height = null) {
    if (typeof window === "undefined") return;
    if (url !== null) {
      localStorage.setItem(this.HEADER_IMAGE_KEY, url);
    } else {
      localStorage.removeItem(this.HEADER_IMAGE_KEY);
    }
    if (height !== null) {
      localStorage.setItem(this.HEADER_IMAGE_HEIGHT_KEY, String(height));
    } else {
      localStorage.removeItem(this.HEADER_IMAGE_HEIGHT_KEY);
    }
    const event = new CustomEvent(this.HEADER_IMAGE_EVENT, {
      detail: { url, height },
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
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
      callback(customEvent.detail.url, customEvent.detail.height);
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
  /**
   * Lectura síncrona del alto de imagen de cabecera almacenado.
   * Devuelve null si no se ha establecido ningún alto.
   */
  static getHeaderImageHeight() {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(this.HEADER_IMAGE_HEIGHT_KEY);
    return raw !== null ? Number(raw) : null;
  }
};
export {
  DhPortero
};
//# sourceMappingURL=index.mjs.map