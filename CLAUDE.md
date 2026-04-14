# dh-portero

Librería npm **`@diariohilario/portero`** — sincronización de estado de autenticación e imagen de cabecera entre los micro-frontends de DiarioHilario. Sin dependencias en runtime, solo APIs nativas del navegador.

## Qué hace

Resuelve el problema de compartir estado entre micro-frontends independientes (Native Federation) sin acoplamiento directo:

- **Auth state sync**: el shell publica login/logout, los remotes se suscriben vía `CustomEvent` + `localStorage`
- **Header image**: los remotes publican una URL de imagen que el shell muestra en la cabecera
- **API helpers**: métodos para obtener perfil de usuario y miembros de un grupo desde el backend

## Stack

- **TypeScript** puro, sin dependencias de runtime
- **tsup** para compilar a CJS + ESM con tipos y sourcemaps
- Publicado en **GitHub Packages** como paquete privado

## Comandos

```bash
npm run build   # Compila a dist/ (CJS + ESM + tipos)
npm run dev     # Watch mode
```

No hay servidor de desarrollo ni puerto — es una librería, no una app.

## Instalación en otros proyectos

```bash
npm install git+ssh://git@github.com/cointreau17/dh-portero.git#v1.3.0
```

Requiere un GitHub PAT con acceso al repo privado (configurado en el Dockerfile y CI de los proyectos que lo consumen).

## API pública (`src/index.ts`)

**Configuración:**
```typescript
DhPortero.configure({ baseUrl: 'https://api.diariohilario.local:9443' })
```

**Auth:**
```typescript
DhPortero.setAuthState(isLoggedIn, user?, token?)  // Publica estado + emite evento
DhPortero.isLoggedIn()                              // Lectura síncrona desde localStorage
DhPortero.getToken()                                // Token desde localStorage
DhPortero.onChange(callback)                        // Suscripción — devuelve unsubscribe fn
```

**Header image:**
```typescript
DhPortero.setHeaderImage(url)                       // Remote publica imagen
DhPortero.getHeaderImage()                          // Lectura síncrona
DhPortero.onHeaderImageChange(callback)             // Suscripción — devuelve unsubscribe fn
```

**API calls:**
```typescript
DhPortero.getCurrentUser()                          // GET /api/myuser
DhPortero.getGroupMembers(groupId)                  // GET /group/{groupId}/members
```

**Claves en localStorage:**
- `dh_auth_token` — token de autenticación
- `dh_header_image` — URL de imagen de cabecera

## Build y publicación

- **Entrada**: `src/index.ts`
- **Salida**: `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (tipos)
- CI en GitHub Actions: verifica build en Node 18, 20 y 22
- Versiones con tags git (`#v1.x.x`) — actualizar el tag en los `package.json` de los proyectos consumidores al publicar nueva versión

## Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v1.3.0 | 10 abr 2026 | Header image management |
| v1.2.1 | 30 mar 2026 | getCurrentUser + getGroupMembers |
| v1.1.1 | 28 mar 2026 | Configuración baseUrl |
| v1.0.1 | 28 mar 2026 | Primera versión — auth state sync |

## Consideraciones

- Siempre pasar el `token` explícitamente en `setAuthState(true, user, token)` — si se omite, `isLoggedIn()` devolverá `false` tras recargar la página (el token no persiste)
- Los métodos son estáticos (patrón singleton) — una sola instancia por contexto de ventana
- Seguro para SSR: los accesos a `window`/`localStorage` están protegidos con `typeof window === 'undefined'`
- Los proyectos consumidores son: `diario-hilario-web-x1` (shell), `paper` y `billboard` (remotes)