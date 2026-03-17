# Implementacion en cualquier servidor

Esta guia explica como desplegar el bot en VPS, cloud VM o contenedores.

## 1) Requisitos base

- Node.js `>=20.11.0`
- npm
- MongoDB accesible desde el servidor
- Token de bot y `client id` de Discord

Importante: este bot mantiene conexion websocket con Discord, por lo que debe correr como proceso persistente (no como funcion serverless corta).

## 2) Preparar aplicacion de Discord

1. Crear aplicacion en Discord Developer Portal.
2. En seccion **Bot**:
   - generar token (`DISCORD_TOKEN`)
   - habilitar intents requeridos:
     - `SERVER MEMBERS INTENT` (GuildMembers)
     - `MESSAGE CONTENT INTENT` (MessageContent)
     - `GUILD VOICE STATES` (VoiceStateUpdate para XP por voz)
3. Guardar `Application ID` como `DISCORD_CLIENT_ID`.
4. Invitar el bot al servidor con scopes:
   - `bot`
   - `applications.commands`

Permisos recomendados del bot (ajusta segun tu operacion):

- View Channels / Send Messages / Embed Links
- Manage Roles
- Kick Members / Ban Members / Moderate Members
- Manage Messages
- Read Message History

## 3) Configurar variables de entorno

Crear `.env` usando `.env.example`.

Variables clave:

- `DISCORD_TOKEN` (obligatoria)
- `DISCORD_CLIENT_ID` (obligatoria)
- `MONGO_URI` (obligatoria)
- `DISCORD_GUILD_ID` (opcional, recomendado en desarrollo para registrar comandos solo en una guild)
- `HEALTH_PORT` (default `3001`)
- `COMMAND_RATE_LIMIT_PER_MINUTE` (default `20`)
- `IDEMPOTENCY_TTL_SECONDS` (default `600`)

## 4) Despliegue con Node.js (sin Docker)

En el servidor:

```bash
npm ci
npm run build
npm run register:commands
npm run start
```

Notas:

- Ejecuta `npm run register:commands` cada vez que cambies slash commands.
- Si `DISCORD_GUILD_ID` esta definido, el registro es por guild (mas rapido para pruebas).
- Si `DISCORD_GUILD_ID` no esta definido, el registro es global (puede tardar en propagarse).

## 5) Mantener el proceso vivo

### Opcion A: PM2

```bash
npm install -g pm2
pm2 start "npm run start" --name discord-bot
pm2 save
pm2 startup
```

### Opcion B: systemd (Linux)

Crear `/etc/systemd/system/discord-bot.service`:

```ini
[Unit]
Description=Discord Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/discord-bot
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Luego:

```bash
sudo systemctl daemon-reload
sudo systemctl enable discord-bot
sudo systemctl start discord-bot
sudo systemctl status discord-bot
```

## 6) Despliegue con Docker

Si usas el `Dockerfile` y `docker-compose.yml` del repo:

```bash
docker compose up -d --build
```

Si cambias slash commands, registra nuevamente:

```bash
docker compose run --rm bot npm run register:commands
```

## 7) Verificacion post-deploy

Validaciones minimas:

1. Logs indican `discord.login.ok` y luego `discord.ready`.
2. Health endpoint responde:
   - `GET /healthz`
   - `GET /readyz`
3. Slash commands visibles en Discord.
4. Prueba funcional basica:
   - `/admin ping`
   - `/level me`

## 8) Operacion y actualizaciones

Flujo recomendado para upgrades:

```bash
git pull
npm ci
npm run build
npm run register:commands
```

Despues, reiniciar proceso (`pm2 restart discord-bot` o `systemctl restart discord-bot`).

## 9) Problemas comunes

- Comandos no aparecen: volver a correr `npm run register:commands` y revisar `DISCORD_CLIENT_ID`/`DISCORD_GUILD_ID`.
- Error de permisos en moderacion/roles: validar permisos del bot y jerarquia de roles.
- No sube XP: revisar `MESSAGE CONTENT INTENT` y `featureFlags.levelingEnabled`.
- Mensajes de bienvenida/despedida no salen: verificar canal configurado y permisos de envio/embed en ese canal.
