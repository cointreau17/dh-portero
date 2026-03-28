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
