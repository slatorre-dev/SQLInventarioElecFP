# Nota de trabajo

Vamos a trabajar con la base de datos de Cloudflare D1 remota, no con la instancia local.

Flujo de trabajo:

1. Editar el código localmente en el repositorio.
2. Usar `wrangler d1 ... --remote` para ejecutar comandos SQL en la base de datos remota.
3. Hacer `git push` para desplegar en Cloudflare Pages.
4. Abrir la URL remota de Pages para ver la app en producción.

No usaremos `wrangler pages dev` para la base de datos remota, porque ese modo ejecuta D1 localmente.
## Modo ahorro de tokens

### Respuesta
- Respuestas cortas y directas
- No explicaciones salvo que se pidan
- No introducciones ni conclusiones
- No repetir informacion
- No usar emojis
- No usar markdown innecesario
- No resumir al final

### Codigo
- Devolver solo el codigo necesario
- No devolver archivos completos salvo que se pidan
- Priorizar diffs o bloques modificados
- No comentar codigo salvo que se solicite
- Mantener nombres y estructura existente
- Evitar ejemplos innecesarios

### Analisis
- Analizar solo los archivos indicados
- No explorar todo el proyecto
- No abrir archivos relacionados automaticamente
- No leer binarios, imagenes ni carpetas grandes

### Contexto
- Mantener el minimo contexto posible
- Priorizar instrucciones recientes
- Ignorar conversaciones antiguas irrelevantes
- Evitar repetir contexto recibido

### Formato
- Preferir listas cortas
- Evitar texto redundante
- Una solucion principal en vez de varias alternativas
- Respuestas maximo 100-200 tokens salvo que se pida mas

### Logs
- Analizar solo fragmentos relevantes
- No repetir logs en la respuesta
- Centrarse unicamente en el error

### Objetivo general
Minimizar consumo de tokens manteniendo precision tecnica.

## Entorno de ejecucion

- El runtime requiere **PowerShell 7+ (pwsh.exe)** para ejecutar comandos shell.
- Si no esta instalado, NO se pueden hacer commits, push ni comandos de terminal.
- Instalar desde: https://aka.ms/powershell y reiniciar VS Code.
- Las memorias y documentacion deben estar en el repositorio GitHub, no en local.

## Service Worker

- Archivo: `sw.js`
- Subir VERSION (`vXXX`) en cada commit para forzar actualizacion en clientes.
- Version actual: v288