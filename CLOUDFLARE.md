# wppOffice-montevideo en Cloudflare

Publicado el 11 de noviembre de 2026: https://wppoffice-montevideo.a-paso-lento.workers.dev

Proyecto independiente: **wppoffice-montevideo**. Nunca usar `turbo-wpp`, que pertenece a officeGame.

Workers Static Assets sirve la oficina, personajes y audios. Un Durable Object SQLite por sala conserva en memoria la presencia, admisiones, posiciones, sillas, gestos y señalización WebRTC mientras la sala está conectada. La voz Kokoro se genera localmente una vez y se publica como WAV; no hay síntesis paga ni dependencia de la PC al visitar la web.

Preparación: `npm install`, `npm run cloudflare:voice` (solo si faltan audios; requiere el servidor local de voz), `npm run build`, `npm test`, `npx wrangler deploy --dry-run`. Publicación: `npm run cloudflare:deploy`.

Se publica solo `dist/`: HTML, CSS, módulos de ejecución, vendor, modelos/texturas/licencias y WAV. Quedan fuera artifacts, fotos de referencia generales y páginas QA; se incluyen únicamente las imágenes 02 y 13 usadas actualmente como fuentes de texturas del escenario. No se publican credenciales ni entornos Python. Cada archivo se verifica contra el máximo de 25 MiB.

El lobby público genera una sala y sus invitaciones. El presentador entra primero y admite a cliente y Brian. Cada nueva publicación puede interrumpir salas activas; hay que volver al lobby. Las salas no almacenan audio, pantalla ni historial persistente. Los micrófonos comienzan apagados y compartir pantalla requiere la elección del usuario en el navegador.

WebRTC usa conexión directa y STUN público de Cloudflare al entrar por Internet. No se configura TURN pago: redes que bloquean conexiones directas pueden impedir audio/pantalla aunque la visita 3D y la sincronización funcionen. Verificar desde dos redes antes de usar con clientes externos. No se habilitan servicios pagos automáticamente.

La publicación por CLI es manual. La conexión automática con un repositorio GitHub de este proyecto es un paso independiente; no reutilizar el repositorio ni las credenciales de builds de officeGame.

## Repositorio y próximo enlace de builds

Repositorio propio: https://github.com/rodrigobarbosa-prog/wppOffice-montevideo

Se desarrolla y revisa en localhost. No publicar cambios hasta que el usuario lo indique. Al habilitar Workers Builds, cada push a `main` publicará: reservar esos pushes para entregas autorizadas y trabajar en ramas para cambios en revisión.

Para vincular más adelante el Worker existente `wppoffice-montevideo` con este repositorio: raíz `/`, rama de producción `main`, comando de build `npm run build`, comando de deploy `npx wrangler deploy`. La instalación de dependencias debe ejecutarse antes del build. Esta configuración utiliza el Worker y Durable Object existentes; no crear otro proyecto ni seleccionar officeGame. La conexión aún no está habilitada.
