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
    if (token) {
      localStorage.setItem(this.STORAGE_KEY, token);
    } else if (!isLoggedIn) {
      localStorage.removeItem(this.STORAGE_KEY);
    }

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
   */
  static isLoggedIn(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  /**
   * Suscribirse a los cambios en vivo del estado de autenticación.
   * Útil para que los Remotos reaccionen instantáneamente (ej. Signals, Behaviors).
   * @returns Función para de-suscribirse.
   */
  static onChange(callback: AuthStateCallback): () => void {
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
   * Obtiene el token guardado, útil para interceptores HTTP.
   */
  static getToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }
}
