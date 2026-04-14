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
type HeaderImageCallback = (url: string | null, height: number | null) => void;
declare class DhPortero {
    private static readonly EVENT_NAME;
    private static readonly HEADER_IMAGE_EVENT;
    private static readonly STORAGE_KEY;
    private static readonly HEADER_IMAGE_KEY;
    private static readonly HEADER_IMAGE_HEIGHT_KEY;
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
    /**
     * Publica una URL de imagen de cabecera desde un proyecto federado.
     * El Shell recibirá el cambio mediante onHeaderImageChange().
     * Pasar null elimina la imagen actual.
     * @param height Alto en píxeles de la imagen. Pasar null elimina el alto almacenado.
     */
    static setHeaderImage(url: string | null, height?: number | null): void;
    /**
     * Suscribirse a los cambios de imagen de cabecera.
     * El Shell debe llamar a este método para reaccionar en tiempo real.
     * @returns Función para de-suscribirse.
     */
    static onHeaderImageChange(callback: HeaderImageCallback): () => void;
    /**
     * Lectura síncrona de la última URL de imagen de cabecera almacenada.
     * Útil para la carga inicial del Shell antes de que llegue ningún evento.
     */
    static getHeaderImage(): string | null;
    /**
     * Lectura síncrona del alto de imagen de cabecera almacenado.
     * Devuelve null si no se ha establecido ningún alto.
     */
    static getHeaderImageHeight(): number | null;
}

export { type AuthState, type AuthStateCallback, DhPortero, type DhPorteroConfig, type HeaderImageCallback, type MemberGroup, type UserPayload, type UserProfile };
