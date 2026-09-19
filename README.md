# dh-portero

A lightweight framework-agnostic authentication library designed for federated frontends and microfrontend architectures for diariohilario.

Esta librería sirve para compartir y sincronizar el estado de la autenticación de usuarios entre un **Shell** (aplicación contenedora, ej. `diario-hilario-web-x1`) y **Remotos** (micro frontends, ej. `paper`) en una arquitectura de Module Federation que comparten el mismo entorno de origin y `window`.

## Arquitectura

`dh-portero` usa los recursos nativos del navegador (cookies, `localStorage` y `CustomEvent` en `window`) para compartir estado de manera segura a nivel cliente.
Dado que se ejecuta en el modelo de Micro Frontends (vía Native Federation), tanto el Shell como los Remotos comparten la misma instancia y contexto visual del navegador. Por lo tanto:
- El token que el Shell escribe en la cookie de sesión (`access_token`) estará disponible instantáneamente para los Remotos. **Desde v2 el token no se guarda en `localStorage`**: la cookie es la única copia duradera, y a diferencia de `localStorage` caduca junto al token. Ver [Dónde vive el token](#dónde-vive-el-token).
- Los eventos o `CustomEvent` sobre cambios de login/logout que el Shell emita con `dh-portero`, serán escuchados y procesados de inmediato por los Remotos.
- Las URLs de imagen publicadas por un Remoto via `dh-portero` (`dh_header_image`) serán recibidas por el Shell en tiempo real.

## Integración en el Shell (`diario-hilario-web-x1`)

Para que esta librería funcione y notifique a todos los micro frontends suscritos, el Shell asume la directiva de gestionar el login y logout centralizados (mediante Auth0, etc), y notificar a `dh-portero` los resultados.

### 1. Iniciar sesión en el Shell

Cuando el usuario completa la autenticación principal en el Shell de forma exitosa, debes integrarlo así:

```typescript
import { DhPortero } from 'dh-portero';

// Al arrancar: baseUrl y el proveedor de token. `configure` admite llamadas
// parciales y sucesivas, así que puedes añadir el proveedor más tarde, cuando
// tu SDK de autenticación esté listo.
DhPortero.configure({
  baseUrl: 'https://api.diariohilario.com',
  getToken: () => auth.getAccessTokenSilently(),
});

// ... después de iniciar sesión con Auth0 o tu proveedor:
const tokenDeAuth0 = "eyJhbG..."; // Tu token o un identificador de sesión
const datosUsuario = { id: 'user123', name: 'Usuario1' }; // Opcional

DhPortero.setAuthState(true, datosUsuario, tokenDeAuth0);
```

> **⚠️ El Shell es responsable de la cookie.** `setAuthState` ya no persiste el token: solo actualiza la copia en memoria y avisa a los Remotos. Quien tiene que escribir —y **mantener fresca**— la cookie `access_token` es el Shell, en cada renovación y no solo al iniciar sesión. Si el Shell deja de refrescarla, la cookie caduca con el token y los Remotos verán al usuario como anónimo aunque su sesión siga viva. En `diario-hilario-web-x1` eso lo hace `TokenSyncService`.

### 2. Cerrar sesión en el Shell

Cuando el usuario cierra su sesión en el proceso del Shell:

```typescript
import { DhPortero } from 'dh-portero';

// Limpia la copia en memoria y emite el evento a los Remotos de que la
// sesión finalizó. Borrar la cookie `access_token` le corresponde al Shell.
DhPortero.setAuthState(false);
```

## Dónde vive el token

| Sitio | Qué es | Caduca |
|---|---|---|
| Cookie `access_token` | Única copia duradera. La escribe el Shell y la comparte con el SSR, que la recibe en la cabecera `Cookie`. | Sí, con el token |
| Memoria del proceso | Copia efímera para que `getToken()` pueda ser síncrono (XHR, interceptores). Se ceba desde la cookie si está fría. | Con la pestaña |
| ~~`localStorage`~~ | Así era en v1.x. Se retiró porque **no caduca nunca**: una sesión muerta dejaba ahí un JWT para siempre e `isLoggedIn()` seguía diciendo `true`. | — |

`configure()` borra la clave heredada `dh_auth_token` al arrancar, para que nadie arrastre ese estado al actualizar desde v1.

Para credenciales prefiere `getTokenAsync()`, que pide al Shell un token recién renovado. Usa `getToken()` solo donde no puedas esperar a una promesa.

## Integración en Remotos (`paper` u otros MFE)

En las aplicaciones MFE, `dh-portero` actúa principalmente como un **"listener"** puro para tomar decisiones sin tener que reimplementar Auth0 o flujos complejos. No necesitas ni debes hacer llamadas a un endopint de login en el MFE, el usuario ya estará logueado vía el Shell.

### 1. Comprobación inicial (Síncrona)

Muy útil para usar como guard de permisos al entrar en una ruta o inicializar el render primario en el MFE:

```typescript
import { DhPortero } from 'dh-portero';

if (DhPortero.isLoggedIn()) {
  console.log("Comprobación positiva: El usuario está logueado a través del Shell");
  // Continuar operando las vistas protegidas
} else {
  // Manejo de restricciones o mostrar contenido bloqueado
}
```

### 2. Suscribirse a cambios en vivo (Reactivo)

Para mantener a los remotos al tanto de un cierre de sesión imprevisto (ej. desde un tab separado, el usuario da "logout" en la top-bar del site), este flujo detectará los eventos Custom emitidos por el Shell.

```typescript
import { DhPortero } from 'dh-portero';

// Suscribirse dentro del ciclo de vida (ej. ngOnInit o constructor)
const unsubscribe = DhPortero.onChange((estado) => {
  console.log("El estado de autenticación cambió en tiempo real:", estado.isLoggedIn);
  
  if (estado.isLoggedIn) {
     console.log("Datos del usuario transmitidos:", estado.user);
     // Mostrar la app al usuario
  } else {
     console.log("El usuario cerró sesión desde el app padre.");
     // Cambiar flag a no autorizado o redirigir
  }
});

// ¡Recuerda desuscribirte cuando sea necesario desmantelar el componente!
// unsubscribe();
```

## Imagen de cabecera dinámica

Los proyectos federados pueden publicar una URL de imagen hacia el Shell en tiempo real. El Shell la recibe mediante un `CustomEvent` y puede mostrarla en cualquier componente (cabecera, hero, portada, etc.).

### Desde el Remoto — publicar la URL

Llama a `setHeaderImage` cada vez que la imagen deba cambiar, por ejemplo al entrar en una pantalla de detalle:

```typescript
import { DhPortero } from '@diariohilario/portero';

// Publicar una imagen (p. ej. portada de una película)
DhPortero.setHeaderImage(
  'https://image.tmdb.org/t/p/original/tmU7GeKVybMWFButWEGl2M4GeiP.jpg'
);

// Limpiar la imagen al salir del detalle
DhPortero.setHeaderImage(null);
```

La URL se persiste automáticamente en `localStorage` (`dh_header_image`), por lo que si el usuario recarga la página el Shell podrá recuperarla sin que el Remoto deba volver a emitirla.

### Desde el Shell (Angular) — recibir y mostrar la imagen

Combina `getHeaderImage()` para la carga inicial con `onHeaderImageChange()` para actualizaciones en tiempo real:

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DhPortero } from '@diariohilario/portero';

@Component({
  selector: 'app-header',
  template: `<img *ngIf="headerImageUrl" [src]="headerImageUrl" alt="Cabecera" />`,
})
export class HeaderComponent implements OnInit, OnDestroy {
  headerImageUrl: string | null = null;
  private unsubscribe!: () => void;

  ngOnInit() {
    // Valor persistido de sesiones anteriores o recargas
    this.headerImageUrl = DhPortero.getHeaderImage();

    // Escuchar cambios en tiempo real desde cualquier Remoto
    this.unsubscribe = DhPortero.onHeaderImageChange((url) => {
      this.headerImageUrl = url;
    });
  }

  ngOnDestroy() {
    this.unsubscribe();
  }
}
```

### Resumen de métodos

| Método | Quién lo llama | Descripción |
|---|---|---|
| `setHeaderImage(url)` | Remoto | Publica la URL (`string` o `null`) y la persiste en `localStorage` |
| `onHeaderImageChange(callback)` | Shell | Suscribe al evento; devuelve función de limpieza |
| `getHeaderImage()` | Shell (`ngOnInit`) | Lectura síncrona del último valor guardado |
