export interface MemberGroup {
  id: string;
  name: string;
  avatar: string;
}

export interface UserProfile {
  id: number;
  uuid: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
  image?: string;
  groups: any[];
}

export interface DhPorteroConfig {
  baseUrl: string;

  /**
   * Proveedor de token del Shell. Debe devolver SIEMPRE un token fresco
   * (en el Shell: `auth.getAccessTokenSilently()`).
   *
   * Se usa en las llamadas asíncronas (`getCurrentUser`, `getGroupMembers`)
   * para no depender de la copia en memoria, que puede estar fría o vencida.
   */
  getToken?: () => Promise<string | null>;

  /**
   * Nombre de la cookie de sesión que escribe el Shell. Por defecto
   * `access_token`. Es la fuente de verdad persistente: caduca con el token.
   */
  sessionCookieName?: string;
}

export interface UserPayload {
  // Ajusta esto según el payload real de tu JWT o usuario
  id?: string | number;
  [key: string]: any;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: UserPayload | null;
}

export type AuthStateCallback = (state: AuthState) => void;

export type HeaderImageCallback = (url: string | null, height: number | null) => void;

export class DhPortero {
  private static readonly EVENT_NAME = 'dh-auth-state-changed';
  private static readonly HEADER_IMAGE_EVENT = 'dh-header-image-changed';
  private static readonly HEADER_IMAGE_KEY = 'dh_header_image';
  private static readonly HEADER_IMAGE_HEIGHT_KEY = 'dh_header_image_height';

  /**
   * Clave heredada de v1.x, cuando el token se persistía en localStorage.
   * Ya no se escribe; solo se borra (ver `purgeLegacyToken`).
   */
  private static readonly LEGACY_STORAGE_KEY = 'dh_auth_token';

  private static readonly DEFAULT_SESSION_COOKIE = 'access_token';

  private static config: DhPorteroConfig = { baseUrl: '' };

  /**
   * Copia EN MEMORIA del token. Muere con la pestaña: no es un almacén
   * persistente, solo evita releer la cookie en cada llamada y permite que
   * `getToken()` siga siendo síncrono para los consumidores que lo necesitan
   * (XHR de subida de imágenes en paper).
   */
  private static token: string | null = null;

  /**
   * Inicializa la configuración global de la librería. Admite llamadas
   * parciales y sucesivas: el Shell fija `baseUrl` al arrancar y añade
   * `getToken` más tarde, cuando Auth0 ya está disponible.
   */
  static configure(config: Partial<DhPorteroConfig>): void {
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
  private static purgeLegacyToken(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.LEGACY_STORAGE_KEY);
    } catch {
      // Modo privado o almacenamiento bloqueado: no hay nada que limpiar.
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
  private static readSessionCookie(): string | null {
    if (typeof document === 'undefined') return null;

    const name = this.config.sessionCookieName ?? this.DEFAULT_SESSION_COOKIE;
    const prefix = `${name}=`;

    for (const part of document.cookie.split(';')) {
      const cookie = part.trim();
      if (!cookie.startsWith(prefix)) continue;
      // slice() y no split('='): un JWT no lleva '=', pero truncar en el
      // primer separador sería un fallo silencioso si algún día lo llevara.
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
  private static async resolveToken(): Promise<string | null> {
    if (this.config.getToken) {
      try {
        const fresh = await this.config.getToken();
        if (fresh) {
          this.token = fresh;
          return fresh;
        }
      } catch (error) {
        console.warn('[DhPortero] getToken() del Shell falló, se usa la cookie', error);
      }
    }

    return this.getToken();
  }

  /**
   * Obtiene los miembros de un grupo.
   * Devuelve un array vacío en entornos sin window (SSR).
   */
  static async getGroupMembers(groupId: string): Promise<MemberGroup[]> {
    if (typeof window === 'undefined') {
      return [];
    }
    if (!this.config.baseUrl) {
      console.warn('[DhPortero] getGroupMembers called before configure()');
      return [];
    }
    const token = await this.resolveToken();
    const response = await fetch(`${this.config.baseUrl}/group/${groupId}/members`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (response.status === 401) {
      console.warn('[DhPortero] getGroupMembers — 401 Unauthorized, token missing or expired');
      return [];
    }
    if (!response.ok) {
      throw new Error(`[DhPortero] getGroupMembers failed: ${response.status}`);
    }
    return await response.json() as MemberGroup[];
  }

  /**
   * Obtiene el perfil del usuario autenticado desde la API.
   * Devuelve null si no hay sesión o si falla la petición.
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    if (typeof window === 'undefined') return null;
    if (!this.config.baseUrl) {
      console.warn('[DhPortero] getCurrentUser called before configure()');
      return null;
    }
    const token = await this.resolveToken();
    if (!token) return null;

    const response = await fetch(`${this.config.baseUrl}/api/myuser`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      console.warn('[DhPortero] getCurrentUser — 401 Unauthorized');
      return null;
    }
    if (!response.ok) {
      throw new Error(`[DhPortero] getCurrentUser failed: ${response.status}`);
    }
    return await response.json() as UserProfile;
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
  static setAuthState(isLoggedIn: boolean, user: UserPayload | null = null, token?: string) {
    if (typeof window === 'undefined') return;

    this.token = isLoggedIn ? (token ?? this.token) : null;

    const state: AuthState = { isLoggedIn, user };

    // Emitir el evento global para todos los MFEs en la misma ventana
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
  static isLoggedIn(): boolean {
    return this.readSessionCookie() !== null;
  }

  /**
   * Suscribirse a los cambios en vivo del estado de autenticación.
   * Útil para que los Remotos reaccionen instantáneamente (ej. Signals, Behaviors).
   * @returns Función para de-suscribirse.
   */
  static onChange(callback: AuthStateCallback): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AuthState>;
      callback(customEvent.detail);
    };

    window.addEventListener(this.EVENT_NAME, handler);

    // Devolver la función para limpiar el listener en ngOnDestroy / onUnmounted
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
  static getToken(): string | null {
    if (this.token) return this.token;

    const fromCookie = this.readSessionCookie();
    if (fromCookie) this.token = fromCookie;

    return this.token;
  }

  /**
   * Token fresco: pide al Shell que lo renueve si hace falta.
   * Preferible a `getToken()` siempre que el llamante pueda esperar.
   */
  static getTokenAsync(): Promise<string | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    return this.resolveToken();
  }

  /**
   * Publica una URL de imagen de cabecera desde un proyecto federado.
   * El Shell recibirá el cambio mediante onHeaderImageChange().
   * Pasar null elimina la imagen actual.
   * @param height Alto en píxeles de la imagen. Pasar null elimina el alto almacenado.
   */
  static setHeaderImage(url: string | null, height: number | null = null): void {
    if (typeof window === 'undefined') return;

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

    const event = new CustomEvent<{ url: string | null; height: number | null }>(this.HEADER_IMAGE_EVENT, {
      detail: { url, height },
      bubbles: true,
      composed: true,
    });
    window.dispatchEvent(event);
  }

  /**
   * Suscribirse a los cambios de imagen de cabecera.
   * El Shell debe llamar a este método para reaccionar en tiempo real.
   * @returns Función para de-suscribirse.
   */
  static onHeaderImageChange(callback: HeaderImageCallback): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ url: string | null; height: number | null }>;
      callback(customEvent.detail.url, customEvent.detail.height);
    };
    window.addEventListener(this.HEADER_IMAGE_EVENT, handler);
    return () => window.removeEventListener(this.HEADER_IMAGE_EVENT, handler);
  }

  /**
   * Lectura síncrona de la última URL de imagen de cabecera almacenada.
   * Útil para la carga inicial del Shell antes de que llegue ningún evento.
   */
  static getHeaderImage(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.HEADER_IMAGE_KEY);
  }

  /**
   * Lectura síncrona del alto de imagen de cabecera almacenado.
   * Devuelve null si no se ha establecido ningún alto.
   */
  static getHeaderImageHeight(): number | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.HEADER_IMAGE_HEIGHT_KEY);
    return raw !== null ? Number(raw) : null;
  }
}
