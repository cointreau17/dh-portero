# Changelog

All notable changes to `@diariohilario/portero` will be documented in this file.

## [2.0.0] - 2026-09-19

### Changed — BREAKING
- El token **ya no se persiste en `localStorage`**. La copia duradera es la cookie de sesión que escribe el Shell (`access_token`), la misma que recibe el SSR en la cabecera `Cookie`.
  - `localStorage` no caduca: una sesión muerta dejaba ahí un JWT para siempre e `isLoggedIn()` seguía devolviendo `true` indefinidamente.
  - Al llamar a `configure()` se borra la clave heredada `dh_auth_token`, para que nadie arrastre ese estado al actualizar.
- `DhPortero.isLoggedIn()` — pasa a leer la cookie de sesión en vez de `localStorage`. Sigue siendo síncrono, pero ahora **caduca con el token**.
- `DhPortero.setAuthState(isLoggedIn, user?, token?)` — mantiene la firma, pero `token` ya no se persiste: alimenta solo la copia en memoria. El Shell debe llamarlo también en cada renovación.
- `DhPortero.getToken()` — mantiene la firma síncrona (`string | null`). Sirve la copia en memoria y, si está fría, la ceba desde la cookie. **Los consumidores no necesitan cambios.**

### Added
- `DhPorteroConfig.getToken?: () => Promise<string | null>` — proveedor de token del Shell. `getCurrentUser()` y `getGroupMembers()` lo usan para trabajar siempre con un token recién renovado en vez de una copia guardada.
- `DhPorteroConfig.sessionCookieName?: string` — nombre de la cookie de sesión (por defecto `access_token`).
- `DhPortero.getTokenAsync(): Promise<string | null>` — token fresco vía el proveedor del Shell. Preferible a `getToken()` siempre que el llamante pueda esperar.
- `configure()` admite llamadas parciales y sucesivas: el Shell fija `baseUrl` al arrancar y añade `getToken` cuando Auth0 ya está disponible.

### Fixed
- Guardas SSR en `setAuthState()` e `isLoggedIn()`, que tocaban `localStorage` sin comprobar `window` y podían romper el render server-side.
- Se retiran los `console.log` de cada llamada. `isLoggedIn()` se invoca en rutas de render y ensuciaba la consola en cada pintado.

## [1.4.0] - 2026-04-14

### Changed
- `DhPortero.setHeaderImage(url, height?)` — nuevo parámetro opcional `height: number | null`:
  - Persiste el alto en `localStorage` bajo la clave `dh_header_image_height`
  - Pasar `null` (o omitir) elimina el alto almacenado
  - El `CustomEvent` `dh-header-image-changed` incluye ahora `{ url, height }` en el `detail`
- `HeaderImageCallback` — actualizado a `(url: string | null, height: number | null) => void`
- `DhPortero.onHeaderImageChange(callback)` — el callback recibe ahora el segundo argumento `height`

### Added
- `DhPortero.getHeaderImageHeight()` — lectura síncrona del alto guardado en `localStorage`:
  - Devuelve `number | null` (`null` si no se ha establecido o en SSR)

## [1.3.0] - 2026-04-10

### Added
- `HeaderImageCallback` type alias `(url: string | null) => void`
- `DhPortero.setHeaderImage(url)` — el proyecto federado publica una URL de imagen de cabecera:
  - Persiste la URL en `localStorage` bajo la clave `dh_header_image`
  - Emite el `CustomEvent` `dh-header-image-changed` en `window` para notificar al Shell en tiempo real
  - Pasar `null` elimina la imagen y emite el evento con `url: null`
  - Guard SSR: no ejecuta nada en entornos sin `window`
- `DhPortero.onHeaderImageChange(callback)` — el Shell se suscribe a los cambios de imagen:
  - Devuelve una función de limpieza para desuscribirse (`() => void`)
- `DhPortero.getHeaderImage()` — lectura síncrona de la última URL guardada en `localStorage`:
  - Útil para la carga inicial del Shell antes de que llegue ningún evento
  - Devuelve `null` en SSR o si no hay imagen almacenada

## [1.2.1] - 2026-03-30

### Added
- `UserProfile` interface (`id`, `uuid`, `name`, `email`, `image`, `groups`, `createdAt`, `updatedAt`)
- `DhPortero.getCurrentUser()` — obtiene el perfil del usuario autenticado desde `/api/myuser`:
  - Envía la cabecera `Authorization: Bearer <t de loken>` automáticamente
  - Devuelve `null` si no hay token, si el servidor responde 401, o en entornos SSR
  - Lanza error para cualquier otro fallo HTTP

### Changed
- `DhPortero.getGroupMembers(groupId)` — manejo explícito del 401 Unauthorized:
  - Devuelve `[]` si el token es inválido o ha expirado (en lugar de lanzar excepción)

## [1.1.1]

### Added
- `MemberGroup` interface (`id`, `name`, `avatar`)
- `DhPorteroConfig` interface
- `DhPortero.configure({ baseUrl })` — inicialización global de la URL base (el Shell debe llamarlo al arrancar)
- `DhPortero.getGroupMembers(groupId)` — obtiene los miembros de un grupo via `fetch` nativo:
  - Envía automáticamente la cabecera `Authorization: Bearer <token>` si el usuario está autenticado
  - Guard SSR: devuelve `[]` en entornos sin `window`
  - Requiere llamada previa a `DhPortero.configure({ baseUrl })` por parte del Shell

## [1.0.1] - 2026-03-28

### Added
- Logging support in the main module

### Build
- Include compiled dist files in the repository
- Add `ignoreDeprecations` flag to TypeScript config

### Chores
- Update package configuration and `.gitignore`

## [1.0.0] - 2026-03-28

### Added
- First version of the package
- TypeScript source (`src/index.ts`) with core functionality
- Build setup with `tsup` (ESM + CJS output with type declarations)
- GitHub Actions CI workflow
- `tsconfig.json` configuration
- Initial `README.md` documentation