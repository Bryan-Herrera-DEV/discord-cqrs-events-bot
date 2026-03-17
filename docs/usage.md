# Guia de uso (funcional)

Este documento resume lo que hace el bot, como usarlo y que comandos estan disponibles.

## Que funcionalidades incluye hoy

- Administracion general por guild (`/admin ...`).
- Moderacion con casos auditables (`/mod ...`).
- Sistema de niveles por actividad de mensajes y tiempo en voz (`/level ...`).
- Gestion de roles con validacion de jerarquia (`/role ...`).
- Bienvenida automatica con formato fijo e imagen.
- Despedida automatica con formato fijo e imagen.
- Observabilidad operativa (`/healthz`, `/readyz`, `/metrics`).

## Flujos automaticos (sin slash command)

### Al entrar un miembro

- Se publica `GuildMemberJoined`.
- Se crea/actualiza perfil interno del miembro.
- Se inicializa perfil de niveles para ese usuario.
- Se dispara flujo de bienvenida (`WelcomeMessageRequested`) con formato fijo e imagen del avatar.

### Al salir un miembro

- Se publica `GuildMemberLeft`.
- El perfil interno queda marcado como salido.
- Se dispara flujo de despedida (`GoodbyeMessageRequested`) con formato fijo e imagen del avatar.

### Al enviar mensajes

- Se ejecuta `GrantMessageXpCommand`.
- Se aplica cooldown de XP por usuario.
- Si supera umbral de nivel, se emite `MemberLeveledUp`.

### Al entrar/salir de llamada de voz

- Al entrar a voz se inicia una sesion interna.
- Al salir de voz se calcula la duracion y se ejecuta `GrantVoiceXpCommand`.
- El XP de voz suma al mismo perfil de niveles.

### Al borrar un rol en Discord

- Se emite evento `RoleDeleted`.
- Se limpia ese rol de la configuracion interna de roles.

## Referencia de comandos

## `/admin`

Permisos: `Administrator` o `ManageGuild` (o rol administrativo segun policy interna).

- `/admin ping`
  - Salud rapida, uptime y latencia.
- `/admin config [logs_channel] [leveling_enabled] [moderation_enabled] [language]`
  - Sin parametros: muestra configuracion actual.
  - Con parametros: actualiza campos de configuracion global.

## `/level`

Permisos: sin requisito especial.

- `/level me [user]`
  - Muestra tarjeta grafica con nivel, rank, XP y progreso.
- `/level leaderboard [limit]`
  - Muestra ranking de niveles (1-20, default 10).

## `/role`

Permisos: `ManageRoles` (o rol gestor de roles segun policy interna).

- `/role add user:<usuario> role:<rol> [reason]`
- `/role remove user:<usuario> role:<rol> [reason]`
- `/role list`

Comportamiento importante:

- Se valida jerarquia del actor, del objetivo y del bot.
- No permite roles gestionados por integraciones.
- Si no hay lista de roles configurables, todos se consideran configurables.

## Bienvenida y despedida

- No tienen comandos de configuracion.
- Usan un formato unico para todas las guilds.
- Incluyen imagen generada con avatar del usuario.
- Se publican en el canal por defecto del servidor (system channel o primer canal de texto disponible).

## `/mod`

Permisos base: permisos de moderacion nativos (ban/kick/moderate/manage messages) o rol moderador segun policy.

Subcomandos:

- `/mod warn user:<usuario> reason:<texto>`
- `/mod kick user:<usuario> reason:<texto>` (requiere `KickMembers`)
- `/mod ban user:<usuario> reason:<texto> [softban]` (requiere `BanMembers`)
- `/mod unban user_id:<id> reason:<texto>` (requiere `BanMembers`)
- `/mod timeout user:<usuario> minutes:<n> reason:<texto>` (requiere `ModerateMembers`)
- `/mod purge amount:<1-100> reason:<texto>` (requiere `ManageMessages`)
- `/mod case view number:<n>`

Cada accion crea caso de moderacion y, si hay `logs_channel`, envia log estructurado al canal de auditoria.

## Uso recomendado en una guild nueva

1. Ejecutar `/admin config logs_channel:<canal>` para auditoria.
2. Ajustar flags iniciales: `/admin config leveling_enabled:true moderation_enabled:true`.
3. Validar con `/admin ping` y luego probar flujo real con usuario de pruebas.

## Endpoints de observabilidad

- `GET /healthz`: estado general y uptime.
- `GET /readyz`: readiness (Mongo + Discord listos).
- `GET /metrics`: metricas Prometheus (`bot_commands_total`, `bot_command_failures_total`, `bot_events_total`, `bot_active_guilds`).
