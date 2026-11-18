# Landing para clubes

Fecha: 2026-11-18
Estado: esperando aprobación

## Por qué

RTL necesita una página que convenza a los dueños de complejos deportivos de contratar el servicio. Hoy la propuesta para clubes está dentro de "Sobre Nosotros", detrás del buscador pensado para jugadores.

## Objetivo

Que un responsable de club entienda rápidamente qué ofrece RTL, vea el producto real y complete la solicitud de alta.

## Fuera de alcance

- Cambios en el buscador, las reservas o los paneles.
- Pagos en línea o alta automática. La solicitud sigue llegando al panel de RTL.
- Modo oscuro.

## Lo que haría fallar esta página

- Que un club real parezca cliente o recomiende RTL sin haberlo autorizado.
- Inventar testimonios, cantidad de clubes u otras métricas.
- Que las capturas sean ilegibles o rompan el diseño en celular.
- Que el llamado a la acción quede escondido.

## Enfoques

1. **Nueva aplicación liviana dentro del proyecto (elegido).** `/clubes` carga su propio módulo React, reutiliza el tema y el formulario existente, y no descarga el catálogo.
2. **Nueva pestaña del sitio público.** Reutiliza más estructura, pero mezcla jugadores y clubes y carga código que la landing no necesita.
3. **Página HTML independiente.** Es simple de servir, pero duplica estilos y formulario.

## Decisiones del usuario

- El público es el club que puede contratar RTL.
- La página muestra la lista completa de funciones de los planes actuales.
- La dirección visual es la mezcla de los mockups B y C: bloque verde, mensaje a la izquierda y panel en computadora y celular.

## Diseño

### Ruta y carga

- La landing vive en `/clubes/`; `/clubes` redirige allí.
- `client/src/main.jsx` carga `client/src/landing/LandingApp.jsx` para esa ruta.
- Se actualizan `server/frontend.cjs`, `server/index.cjs` y `vercel.json`.
- `/` sigue abriendo el buscador para jugadores.
- El footer y el menú móvil del sitio público suman un enlace "Para clubes".

### Estructura de la página

1. **Encabezado:** logo RTL, Funciones, Planes y "Solicitar alta".
2. **Hero verde:** etiqueta "RTL PARA CLUBES", título "Menos caos. Más canchas en juego.", bajada, botones "Quiero sumar mi club" y "Ver planes", captura de computadora y captura de celular superpuesta.
3. **Beneficios:** Agenda clara, Canchas bajo control y Cobros ordenados.
4. **Recorrido del producto:** tres bloques alternados con capturas de agenda, canchas y clientes o cobros.
5. **Cómo empezar:** enviar la solicitud, recibir el contacto del equipo y comenzar a configurar el complejo.
6. **Planes:** Pro y Elite con precios y listas actuales, más la opción de hablar con un asesor.
7. **Cierre verde:** repite el llamado a solicitar el alta.
8. **Footer:** enlace al sitio de reservas y contacto actual.

### Conversión

- Todos los botones de alta abren el `ClubModal` existente.
- Los botones generales envían el plan "Personalizado"; los de cada tarjeta envían Pro o Elite.
- Los datos de planes pasan a `client/src/public/clubPlans.js`, usado por "Sobre Nosotros" y la landing, para evitar diferencias.

### Capturas

- Se guardan como WebP en `assets/landing/`, con versiones para computadora y celular.
- Se generan desde el servidor de prueba en memoria.
- Muestran un complejo ficticio, "Complejo Demo RTL", y clientes ficticios con reservas de ejemplo. No aparecen clubes ni personas reales.
- Tienen texto alternativo, dimensiones explícitas y carga diferida fuera de la primera pantalla.

### Estilo y movimiento

- Usa `theme.css`: fondo `#eef2f7`, sombras neumórficas, degradado verde y texto oscuro sobre verde.
- Los estilos propios van en `client/src/landing/landing.css`.
- En celular el contenido pasa a una columna y las capturas quedan debajo del mensaje.
- Las secciones aparecen con un movimiento suave al desplazarse. Con movimiento reducido se muestran directamente.

## Verificación

- `npm test` y `npm run build` pasan.
- Las pruebas cubren la ruta, los enlaces y la presencia de capturas con dimensiones.
- En navegador, `/clubes/` funciona a 1440, 768, 375 y 320 px, sin desplazamiento lateral.
- El formulario se envía correctamente al servidor de prueba y la solicitud aparece en superadmin.
- El foco por teclado es visible y no hay errores de consola.

## A criterio de quien implemente

Espaciado exacto, tamaño de las sombras, curvas de animación y orden interno del CSS, siempre que respeten este diseño.
