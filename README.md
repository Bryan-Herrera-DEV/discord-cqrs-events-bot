# Discord Bot Profesional (TypeScript + DDD + Hexagonal + CQRS-like)

Base de bot de Discord lista para crecer en features, trafico y equipo.

## Que incluye

- Arquitectura por modulos (`guilds`, `guild-settings`, `members`, `levels`, `roles`, `welcome`, `goodbye`, `moderation`, `administration`).
- Comandos slash para administracion, moderacion, niveles y roles, mas flujos automaticos de bienvenida/despedida.
- Bot de musica con YouTube, cola de reproduccion y panel de controles por botones.
- Comando `/help` con respuesta contextual para usuarios y administradores.
- Panel web admin en React + API HTTP para configurar canales y feature flags por servidor.
- Mensajeria enriquecida con embeds para respuestas de comandos y errores operativos.
- Persistencia MongoDB con indices y preparacion para outbox.
- Historial de calculo de XP por voz en MongoDB (`voice_xp_history`) con detalle por sesion/usuario.
- Resiliencia con rate limit por usuario/comando e idempotencia por interaccion.
- Observabilidad con logs estructurados, health/readiness y metricas Prometheus.

## Documentacion

- Implementacion en cualquier servidor: `docs/deployment.md`
- Guia de uso funcional y comandos: `docs/usage.md`
- Documentacion arquitectonica y extension (eventos/comandos): `docs/architecture.md`

## Inicio rapido local

1. Crear `.env` tomando como base `.env.example`.
2. Levantar MongoDB local (o usar una instancia remota).
3. Instalar dependencias y registrar comandos.
4. Ejecutar el bot.

```bash
npm install
npm run register:commands
npm run dev
```

Nota: cuando cambies definiciones de slash commands, ejecuta de nuevo `npm run register:commands`.

## Scripts utiles

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run check`
- `npm run commitlint`
- `npm run release:dry-run`
- `npm run release`

## Versionamiento automatico entre ramas

Se configuro `semantic-release` para versionar en automatico segun la rama:

- `development` genera prereleases `x.y.z-dev.n`
- `qa` genera prereleases `x.y.z-qa.n`
- `main` genera releases estables `x.y.z`

Cada push a esas ramas ejecuta el workflow `Release` (`.github/workflows/release.yml`), crea tag `v*`, actualiza `CHANGELOG.md` y sincroniza version en `package.json`/`package-lock.json`.

Para que el versionado funcione correctamente, usa Conventional Commits (ejemplos: `feat: ...`, `fix: ...`, `feat!: ...`).

Tambien se agrego validacion automatica de mensajes de commit:

- Local: hook `commit-msg` con Husky (`.husky/commit-msg`).
- CI: workflow `Commit Message Lint` (`.github/workflows/commitlint.yml`) en pushes y PRs hacia `development`, `qa` y `main`.

Nota: para activar hooks locales, ejecuta `npm install` (dispara `npm run prepare`).

Prueba local sin publicar release:

```bash
npm run release:dry-run
```

## Variables de entorno

Revisa `.env.example`.

Minimas obligatorias:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `MONGO_URI`

Opcional para desarrollo rapido en una sola guild:

- `DISCORD_GUILD_ID`
- `LOG_PRETTY` (`true` para logs legibles en consola local)

Variables para panel admin:

- `ADMIN_PORT` (por defecto `3002`)
- `ADMIN_API_TOKEN` (opcional, recomendado en produccion)

Variables para musica (YouTube):

- `FFMPEG_PATH` (opcional, ruta a binario ffmpeg del sistema)
- `YOUTUBE_COOKIE` (opcional, se envia como header HTTP para mejorar compatibilidad en algunas URLs bloqueadas)

Dependencias oficiales de `discord-player` usadas en este proyecto:

- `discord-player`
- `@discord-player/extractor`
- `@discord-player/downloader` (bridge de streams para fuentes como Spotify)
- `@snazzah/davey` (soporte DAVE requerido por `discord-voip` en conexiones de voz)
- `mediaplex` (recomendado por la documentacion oficial para soporte Opus)

## Docker local

```bash
docker compose up --build
```

## Endpoints operativos

- `GET /healthz`
- `GET /readyz`
- `GET /metrics`

## Panel de configuracion

- URL base: `http://localhost:<ADMIN_PORT>`
- API:
  - `GET /api/guilds`
  - `GET /api/guilds/:guildId/channels`
  - `GET /api/guilds/:guildId/settings`
  - `PUT /api/guilds/:guildId/settings`
