# Nota de trabajo

Vamos a trabajar con la base de datos de Cloudflare D1 remota, no con la instancia local.

Flujo de trabajo:

1. Editar el código localmente en el repositorio.
2. Usar `wrangler d1 ... --remote` para ejecutar comandos SQL en la base de datos remota.
3. Hacer `git push` para desplegar en Cloudflare Pages.
4. Abrir la URL remota de Pages para ver la app en producción.

No usaremos `wrangler pages dev` para la base de datos remota, porque ese modo ejecuta D1 localmente.
