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
    private static readonly HEADER_IMAGE_KEY;
    private static readonly HEADER_IMAGE_HEIGHT_KEY;
    /**
     * Clave heredada de v1.x, cuando el token se persistía en localStorage.
     * Ya no se escribe; solo se borra (ver `purgeLegacyToken`).
     */
    private static readonly LEGACY_STORAGE_KEY;
    private static readonly DEFAULT_SESSION_COOKIE;
    private static config;
    /**
     * Copia EN MEMORIA del token. Muere con la pestaña: no es un almacén
     * persistente, solo evita releer la cookie en cada llamada y permite que
     * `getToken()` siga siendo síncrono para los consumidores que lo necesitan
     * (XHR de subida de imágenes en paper).
     */
    private static token;
    /**
     * Inicializa la configuración global de la librería. Admite llamadas
     * parciales y sucesivas: el Shell fija `baseUrl` al arrancar y añade
     * `getToken` más tarde, cuando Auth0 ya está disponible.
     */
    static configure(config: Partial<DhPorteroConfig>): void;
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
    private static purgeLegacyToken;
    /**
     * Lee la cookie de sesión que escribe el Shell.
     *
     * Es la única copia persistente del token y la comparte con el SSR, que la
     * recibe en la cabecera `Cookie`. Al llevar `expires` = `exp` del JWT, el
     * navegador la borra sola al caducar: su mera presencia ya significa
     * "sesión viva", sin necesidad de decodificar nada.
     */
    private static readSessionCookie;
    /**
     * Token fresco para las llamadas asíncronas.
     *
     * Prefiere el proveedor del Shell (que renueva contra Auth0) y cae a la
     * cookie si no está configurado —por ejemplo si un remoto se carga antes de
     * que el Shell termine de inicializarse—.
     */
    private static resolveToken;
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
     * El Shell (diario-hilario-web-x1) debe llamar a este método cuando el
     * usuario inicie o cierre sesión, y cada vez que renueve el token.
     *
     * A partir de v2 el token NO se persiste aquí: quien manda es la cookie de
     * sesión, que escribe el Shell y comparte con el SSR. Lo que se pasa en
     * `token` alimenta solo la copia en memoria.
     */
    static setAuthState(isLoggedIn: boolean, user?: UserPayload | null, token?: string): void;
    /**
     * Comprobación síncrona de si el usuario está logueado.
     * Útil para los Remotos (paper) en su carga inicial, o directivas booleanas.
     *
     * Mira la cookie de sesión, no memoria: sobrevive a la recarga y caduca
     * cuando caduca el token. En v1.x miraba localStorage, que no caduca nunca,
     * y devolvía `true` indefinidamente con una sesión muerta.
     */
    static isLoggedIn(): boolean;
    /**
     * Suscribirse a los cambios en vivo del estado de autenticación.
     * Útil para que los Remotos reaccionen instantáneamente (ej. Signals, Behaviors).
     * @returns Función para de-suscribirse.
     */
    static onChange(callback: AuthStateCallback): () => void;
    /**
     * Obtiene el token de forma síncrona, útil para XHR e interceptores que no
     * pueden esperar a una promesa.
     *
     * Sirve la copia en memoria y, si está fría, la ceba desde la cookie. Para
     * llamadas que puedan esperar es preferible `getTokenAsync()`, que pide al
     * Shell un token recién renovado.
     */
    static getToken(): string | null;
    /**
     * Token fresco: pide al Shell que lo renueve si hace falta.
     * Preferible a `getToken()` siempre que el llamante pueda esperar.
     */
    static getTokenAsync(): Promise<string | null>;
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
