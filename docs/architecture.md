# Arquitectura del bot

## Vision general

El proyecto combina DDD pragmatico, arquitectura hexagonal, event-driven interno y separacion CQRS-like.

- DDD por contextos: cada dominio vive en `src/contexts/<contexto>`.
- Hexagonal: la aplicacion usa puertos y las integraciones concretas viven en infraestructura.
- CQRS-like: comandos y queries se registran en buses diferentes (`InMemoryCommandBus`, `InMemoryQueryBus`).
- Event-driven: eventos internos via `InMemoryEventBus` para desacoplar reacciones.

## Componentes principales

- Composition root: `src/app.ts`.
- Registro de modulos: `src/modules.ts`.
- Gateway Discord: `src/platform/discord/DiscordGateway.ts`.
- Router de interacciones: `src/platform/discord/InteractionRouter.ts`.
- Registro de slash commands: `src/platform/discord/SlashCommandRegistry.ts`.
- Eventos de dominio tipados: `src/shared/domain/events/BotEvents.ts`.
- Infraestructura transversal: Mongo, health, metricas, logs, idempotencia, rate limit en `src/shared/infrastructure`.

## Estructura por contexto

Cada contexto sigue esta forma:

- `domain`: entidades, politicas, value objects.
- `application/commands`: casos de escritura.
- `application/queries`: casos de lectura.
- `application/events`: subscribers a eventos internos.
- `application/ports`: contratos hexagonales.
- `infrastructure`: adaptadores (Mongo, Discord, imagen, etc).
- `index.ts`: wiring del modulo (registro de handlers + slash commands).

## Ciclo de arranque

Secuencia simplificada de `startApp()` en `src/app.ts`:

1. Carga de env (`src/config/env.ts`) y conexion Mongo.
2. Inicializacion de outbox (`event_outbox`) e idempotencia (`command_idempotency`).
3. Creacion de buses en memoria y `DiscordGateway`.
4. Registro de modulos de `src/modules.ts` (comandos/queries/eventos).
5. Construccion del `InteractionRouter` con handlers slash.
6. Suscripcion a eventos nativos de Discord (`interactionCreate`, `guildMemberAdd`, `messageCreate`, etc).
7. Inicio de `HealthServer` y login del bot.

## Flujos principales

### 1) Slash command end-to-end

1. Discord envia `interactionCreate`.
2. `DiscordGateway` lo pasa a `InteractionRouter`.
3. `InteractionRouter` aplica:
   - rate limit por `guild:user:command`
   - idempotencia por `interaction.id`
   - conteo de metricas por comando
4. Se ejecuta un handler de `src/platform/discord/handlers/*`.
5. El handler dispara `commandBus.execute(...)` o `queryBus.execute(...)`.
6. El caso de uso del contexto responde y el handler devuelve embed/mensaje.

### 2) Ingreso de miembro (`GuildMemberJoined`)

1. `DiscordGateway.onGuildMemberAdd` publica `BotEvents.guildMemberJoined(...)`.
2. `members` escucha y ejecuta `RegisterMemberOnJoinCommand`.
3. `RegisterMemberOnJoinHandler` guarda perfil y publica `UserRegistered`.
4. `levels` escucha `UserRegistered` e inicializa perfil de nivel.
5. `welcome` escucha `GuildMemberJoined` y publica `WelcomeMessageRequested`.
6. `welcome` consume `WelcomeMessageRequested` y envia mensaje/imagen.

### 3) Salida de miembro (`GuildMemberLeft`)

1. `DiscordGateway.onGuildMemberRemove` publica `GuildMemberLeft`.
2. `members` marca el perfil como `left`.
3. `goodbye` publica y consume `GoodbyeMessageRequested` para enviar despedida.

### 4) Mensajes y XP

1. `DiscordGateway.onMessageCreate` ejecuta `GrantMessageXpCommand`.
2. `levels` valida cooldown + feature flag de niveles.
3. Guarda XP/level; si hay subida publica `MemberLeveledUp`.

### 5) Voz y XP

1. `DiscordGateway.onVoiceStateUpdate` detecta entrada/salida de canal.
2. `app.ts` crea perfil de niveles al entrar a voz si no existe.
3. `app.ts` abre sesion por canal al primer ingreso y la cierra cuando el canal queda sin usuarios humanos.
4. Al cerrar la sesion, `app.ts` calcula participacion por usuario y ejecuta `GrantVoiceXpCommand`.
5. `levels` suma XP de voz al mismo perfil, publica `MemberLeveledUp` si corresponde y guarda historial de calculo (`voice_xp_history`).

## Persistencia MongoDB

Colecciones actuales:

- `guilds`
- `guild_settings`
- `member_profiles`
- `level_profiles`
- `voice_xp_history`
- `role_configurations`
- `moderation_cases`
- `moderation_actions`
- `command_idempotency`
- `event_outbox`

Patrones de indices:

- unicidad por identidad natural (por ejemplo `guildId + userId`, `guildId + caseNumber`)
- indices de lectura por ranking/historial (`guildId + xp`, `guildId + targetUserId + createdAt`)
- TTL para idempotencia en `command_idempotency.expiresAt`

## Resiliencia y observabilidad

- Rate limit en memoria por comando (`InMemoryRateLimiter`).
- Idempotencia en Mongo por interaccion (`MongoCommandIdempotencyStore`).
- Retries de handlers de eventos (`InMemoryEventBus`, max retries configurable).
- Outbox interno para eventos (`MongoEventOutboxRepository`).
- Endpoints operativos:
  - `/healthz`
  - `/readyz`
  - `/metrics`

## Como agregar un nuevo comando

### Caso A: nuevo subcomando en un comando raiz existente

1. Crear `Command` y `CommandHandler` en el contexto, por ejemplo en `src/contexts/<context>/application/commands`.
2. Registrar el handler en `register()` del modulo (`src/contexts/<context>/index.ts`).
3. Agregar el subcomando en `registerSlashCommands()` del mismo modulo.
4. Extender el handler de plataforma existente en `src/platform/discord/handlers/<Root>SlashCommandHandler.ts`.
5. Ejecutar `npm run register:commands`.

### Caso B: nuevo comando raiz (por ejemplo `/tickets`)

1. Crear/actualizar modulo con su `registerSlashCommands()`.
2. Crear `TicketsSlashCommandHandler` en `src/platform/discord/handlers`.
3. Inyectar ese handler en la lista de `InteractionRouter` en `src/app.ts`.
4. Registrar comandos de nuevo con `npm run register:commands`.

Plantilla minima para command de aplicacion:

```ts
export class ExampleCommand implements Command<void> {
  public static readonly type = "example.run";
  public readonly type = ExampleCommand.type;
  public constructor(public readonly payload: { guildId: string }) {}
}
```

## Como agregar un nuevo evento

1. Definir payload + factory en `src/shared/domain/events/BotEvents.ts` (o crear evento de dominio equivalente).
2. Publicar el evento desde un caso de uso o desde `src/app.ts`.
3. Crear subscriber en `src/contexts/<context>/application/events`.
4. Suscribirlo en `register()` del modulo con `context.eventBus.subscribe(...)`.
5. Si el evento nace de Discord nativo, agregar el hook en `DiscordGateway` y cablearlo en `src/app.ts`.

Plantilla minima de subscriber:

```ts
export class OnExampleEventHandler {
  public build(): DomainEventHandler<DomainEvent<ExamplePayload>> {
    return async (event) => {
      // reaccion de aplicacion
    };
  }
}
```

## Regla importante de orden de modulos

Algunos modulos usan repositorios expuestos por otros modulos en `AppContext` (por ejemplo `guild-settings` es requerido por `levels` y `moderation`).

- Mantener `createModules()` en `src/modules.ts` con un orden coherente de dependencias.
- Si agregas dependencias cruzadas nuevas, documentalas y evita ciclos.

## Checklist de extension segura

- Registrar handler en `CommandBus` o `QueryBus`.
- Registrar slash command en el modulo correcto.
- Actualizar el slash handler de plataforma.
- Registrar comandos en Discord (`npm run register:commands`).
- Agregar pruebas unitarias y de handler.
- Verificar `npm run check` antes de merge/deploy.
