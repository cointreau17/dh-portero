# Changelog

All notable changes to `@diariohilario/portero` will be documented in this file.

## [1.2.1] - 2026-03-30

### Added
- `UserProfile` interface (`id`, `uuid`, `name`, `email`, `image`, `groups`, `createdAt`, `updatedAt`)
- `DhPortero.getCurrentUser()` — obtiene el perfil del usuario autenticado desde `/api/myuser`:
  - Envía la cabecera `Authorization: Bearer <token>` automáticamente
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