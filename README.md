# Discord Bot Profesional (TypeScript + DDD + Hexagonal + CQRS-like)

Base de bot de Discord lista para crecer en features, trafico y equipo.

## Que incluye

- Arquitectura por modulos (`guilds`, `guild-settings`, `members`, `levels`, `roles`, `welcome`, `goodbye`, `moderation`, `administration`).
- Comandos slash para administracion, moderacion, niveles y roles, mas flujos automaticos de bienvenida/despedida.
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

## Docker local

```bash
docker compose up --build
```

## Endpoints operativos

- `GET /healthz`
- `GET /readyz`
- `GET /metrics`
