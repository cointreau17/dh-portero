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

export class DhPortero {
  private static readonly EVENT_NAME = 'dh-auth-state-changed';
  private static readonly STORAGE_KEY = 'dh_auth_token';
  private static config: DhPorteroConfig | null = null;

  /**
   * Inicializa la configuración global de la librería.
   * El Shell debe llamar a este método una sola vez al arrancar,
   * antes de que los remotos intenten hacer peticiones.
   */
  static configure(config: DhPorteroConfig): void {
    this.config = config;
    console.log('[DhPortero] configured — baseUrl:', config.baseUrl);
  }

  /**
   * Obtiene los miembros de un grupo.
   * Devuelve un array vacío en entornos sin window (SSR).
   */
  static async getGroupMembers(groupId: string): Promise<MemberGroup[]> {
    if (typeof window === 'undefined') {
      return [];
    }
    if (!this.config) {
      console.warn('[DhPortero] getGroupMembers called before configure()');
      return [];
    }
    const token = this.getToken();
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
    if (!this.config) {
      console.warn('[DhPortero] getCurrentUser called before configure()');
      return null;
    }
    const token = this.getToken();
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
   * El Shell (diario-hilario-web-x1) debe llamar a este método cuando
   * el usuario inicie o cierre sesión.
   */
  static setAuthState(isLoggedIn: boolean, user: UserPayload | null = null, token?: string) {
    console.log('[DhPortero] setAuthState called — isLoggedIn:', isLoggedIn, '| token present:', !!token);
    if (token) {
      localStorage.setItem(this.STORAGE_KEY, token);
      console.log('[DhPortero] token saved to localStorage');
    } else if (!isLoggedIn) {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('[DhPortero] token removed from localStorage');
    } else {
      console.warn('[DhPortero] isLoggedIn=true but no token provided — localStorage NOT updated');
    }

    const state: AuthState = { isLoggedIn, user };

    // Emitir el evento global para todos los MFEs en la misma ventana
    const event = new CustomEvent(this.EVENT_NAME, {
      detail: state,
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
    console.log('[DhPortero] event dispatched:', this.EVENT_NAME, state);
  }

  /**
   * Comprobación síncrona de si el usuario está logueado.
   * Útil para los Remotos (paper) en su carga inicial, o directivas booleanas.
   */
  static isLoggedIn(): boolean {
    const result = localStorage.getItem(this.STORAGE_KEY) !== null;
    console.log('[DhPortero] isLoggedIn() called — result:', result, '| key in localStorage:', !!localStorage.getItem(this.STORAGE_KEY));
    return result;
  }

  /**
   * Suscribirse a los cambios en vivo del estado de autenticación.
   * Útil para que los Remotos reaccionen instantáneamente (ej. Signals, Behaviors).
   * @returns Función para de-suscribirse.
   */
  static onChange(callback: AuthStateCallback): () => void {
    console.log('[DhPortero] onChange listener registered');
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AuthState>;
      console.log('[DhPortero] onChange event received:', customEvent.detail);
      callback(customEvent.detail);
    };

    window.addEventListener(this.EVENT_NAME, handler);

    // Devolver la función para limpiar el listener en ngOnDestroy / onUnmounted
    return () => {
      window.removeEventListener(this.EVENT_NAME, handler);
    };
  }

  /**
   * Obtiene el token guardado, útil para interceptores HTTP.
   */
  static getToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }
}
