# Guia de uso (funcional)

Este documento resume lo que hace el bot, como usarlo y que comandos estan disponibles.

## Que funcionalidades incluye hoy

- Administracion general por guild (`/admin ...`).
- Moderacion con casos auditables (`/mod ...`).
- Sistema de niveles por actividad de mensajes y tiempo en voz (`/level ...`).
- Respuestas de comandos en embeds consistentes (exitos, avisos y errores).
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
- Si las alertas estan activas, se publica una card NAPI en chat con el nivel/tier alcanzado.

### Al entrar/salir de llamada de voz

- Si un usuario entra a voz y no tiene perfil de niveles, se crea automaticamente.
- La sesion de voz inicia cuando entra el primer usuario humano al canal.
- La sesion termina cuando ya no quedan usuarios humanos en ese canal.
- Al cerrar la sesion se calcula XP por cada participante y se ejecuta `GrantVoiceXpCommand`.
- Se guarda historial detallado del calculo en Mongo (`voice_xp_history`).

### Formato visual de bienvenida y despedida

- Se envia embed con menciones, metadata y card grafica.
- La card se genera en servidor con patron geometrico, avatar y nombre del usuario.
- Si falla la generacion de imagen, el embed se envia con thumbnail y texto fallback.

### Al borrar un rol en Discord

- Se emite evento `RoleDeleted`.
- Se limpia ese rol de la configuracion interna de roles.

## Referencia de comandos

## `/help`

Permisos: sin requisito especial.

- Muestra comandos para usuarios comunes.
- Si quien lo ejecuta tiene perfil admin, añade bloque de comandos administrativos.

## `/admin`

Permisos: `Administrator` o `ManageGuild` (o rol administrativo segun policy interna).

- `/admin ping`
  - Salud rapida, uptime y latencia.
- `/admin config [logs_channel] [leveling_enabled] [moderation_enabled] [language]`
  - Sin parametros: muestra configuracion actual.
  - Con parametros: actualiza campos de configuracion global.
- `/admin levels [alerts_enabled] [alerts_channel]`
  - Sin parametros: muestra configuracion de alertas de niveles.
  - Con parametros: activa/desactiva alertas y define el canal de anuncios.

## `/level`

Permisos: sin requisito especial.

- `/level me [user]`
  - Muestra tarjeta grafica con nivel, rank, XP, progreso y tier actual.
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
3. Configurar alertas de nivel: `/admin levels alerts_enabled:true alerts_channel:<canal>`.
4. Validar con `/admin ping` y luego probar flujo real con usuario de pruebas.

## Endpoints de observabilidad

- `GET /healthz`: estado general y uptime.
- `GET /readyz`: readiness (Mongo + Discord listos).
- `GET /metrics`: metricas Prometheus (`bot_commands_total`, `bot_command_failures_total`, `bot_events_total`, `bot_active_guilds`).
