interface MemberGroup {
    id: string;
    name: string;
    avatar: string;
}
interface UserProfile {
    id: number;
    uuid: string;
    name: string;
    email: string;
    createdAt?: string;
    updatedAt?: string;
    image?: string;
    groups: any[];
}
interface DhPorteroConfig {
    baseUrl: string;
}
interface UserPayload {
    id?: string | number;
    [key: string]: any;
}
interface AuthState {
    isLoggedIn: boolean;
    user: UserPayload | null;
}
type AuthStateCallback = (state: AuthState) => void;
declare class DhPortero {
    private static readonly EVENT_NAME;
    private static readonly STORAGE_KEY;
    private static config;
    /**
     * Inicializa la configuración global de la librería.
     * El Shell debe llamar a este método una sola vez al arrancar,
     * antes de que los remotos intenten hacer peticiones.
     */
    static configure(config: DhPorteroConfig): void;
    /**
     * Obtiene los miembros de un grupo.
     * Devuelve un array vacío en entornos sin window (SSR).
     */
    static getGroupMembers(groupId: string): Promise<MemberGroup[]>;
    /**
     * Obtiene el perfil del usuario autenticado desde la API.
     * Devuelve null si no hay sesión o si falla la petición.
     */
    static getCurrentUser(): Promise<UserProfile | null>;
    /**
     * Actualiza el estado de autenticación y lo emite a todos los listeners.
     * El Shell (diario-hilario-web-x1) debe llamar a este método cuando
     * el usuario inicie o cierre sesión.
     */
    static setAuthState(isLoggedIn: boolean, user?: UserPayload | null, token?: string): void;
    /**
     * Comprobación síncrona de si el usuario está logueado.
     * Útil para los Remotos (paper) en su carga inicial, o directivas booleanas.
     */
    static isLoggedIn(): boolean;
    /**
     * Suscribirse a los cambios en vivo del estado de autenticación.
     * Útil para que los Remotos reaccionen instantáneamente (ej. Signals, Behaviors).
     * @returns Función para de-suscribirse.
     */
    static onChange(callback: AuthStateCallback): () => void;
    /**
     * Obtiene el token guardado, útil para interceptores HTTP.
     */
    static getToken(): string | null;
}

export { type AuthState, type AuthStateCallback, DhPortero, type DhPorteroConfig, type MemberGroup, type UserPayload, type UserProfile };
