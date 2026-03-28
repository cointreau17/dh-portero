# dh-portero

A lightweight framework-agnostic authentication library designed for federated frontends and microfrontend architectures for diariohilario.

Esta librería sirve para compartir y sincronizar el estado de la autenticación de usuarios entre un **Shell** (aplicación contenedora, ej. `diario-hilario-web-x1`) y **Remotos** (micro frontends, ej. `paper`) en una arquitectura de Module Federation que comparten el mismo entorno de origin y `window`.

## Arquitectura

`dh-portero` usa los recursos nativos del navegador (`localStorage` y `CustomEvent` en `window`) para compartir la sesión de manera segura a nivel cliente.
Dado que se ejecuta en el modelo de Micro Frontends (vía Native Federation), tanto el Shell como los Remotos comparten la misma instancia y contexto visual del navegador. Por lo tanto:
- Los tokens guardados por el Shell en `localStorage` por `dh-portero` (`dh_auth_token`) estarán disponibles instantáneamente para su lectura en los Remotos.
- Los eventos o `CustomEvent` sobre cambios de login/logout que el Shell emita con `dh-portero`, serán escuchados y procesados de inmediato por los Remotos.

## Integración en el Shell (`diario-hilario-web-x1`)

Para que esta librería funcione y notifique a todos los micro frontends suscritos, el Shell asume la directiva de gestionar el login y logout centralizados (mediante Auth0, etc), y notificar a `dh-portero` los resultados.

### 1. Iniciar sesión en el Shell

Cuando el usuario completa la autenticación principal en el Shell de forma exitosa, debes integrarlo así:

```typescript
import { DhPortero } from 'dh-portero';

// ... después de iniciar sesión con Auth0 o tu proveedor:
const tokenDeAuth0 = "eyJhbG..."; // Tu token o un identificador de sesión
const datosUsuario = { id: 'user123', name: 'Usuario1' }; // Opcional

// Es MUY IMPORTANTE pasar siempre el token en el inicio de sesión para guardarlo
DhPortero.setAuthState(true, datosUsuario, tokenDeAuth0);
```

> **⚠️ Advertencia sobre el código actual:** Si llamas a `DhPortero.setAuthState(true, userData)` pero omites el parámetro `token`, `dh-portero` NO guardará la huella en `localStorage` (como está programado actualmente en `src/index.ts`). Como consecuencia, si un remoto de otra ruta comprueba la autenticación con `DhPortero.isLoggedIn()`, recibirá `false` asumiendo que el usuario está desconectado al no haber traza de un token guardado. Asegúrate de pasar el identificador.

### 2. Cerrar sesión en el Shell

Cuando el usuario cierra su sesión en el proceso del Shell:

```typescript
import { DhPortero } from 'dh-portero';

// Eliminará automáticamente las claves en el localStorage y emitirá
// el evento a los Remotos de que la sesión finalizó.
DhPortero.setAuthState(false);
```

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
