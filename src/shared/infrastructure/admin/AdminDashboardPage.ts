export const renderAdminDashboardPage = (): string => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Discord Bot Admin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --surface-start: #f4f9ff;
        --surface-end: #e5f2f0;
        --surface-accent: rgba(21, 86, 141, 0.16);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 10% 10%, var(--surface-accent) 0%, transparent 50%),
          linear-gradient(140deg, var(--surface-start) 0%, var(--surface-end) 100%);
      }
    </style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@emotion/react@11/dist/emotion-react.umd.min.js"></script>
    <script src="https://unpkg.com/@emotion/styled@11/dist/emotion-styled.umd.min.js"></script>
    <script src="https://unpkg.com/@mui/material@5.15.20/umd/material-ui.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel" data-presets="env,react">
      const {
        Alert,
        AppBar,
        Box,
        Button,
        Chip,
        CircularProgress,
        Container,
        CssBaseline,
        FormControl,
        FormControlLabel,
        Grid,
        InputLabel,
        MenuItem,
        OutlinedInput,
        Paper,
        Select,
        Snackbar,
        Stack,
        Switch,
        TextField,
        ThemeProvider,
        Toolbar,
        Typography
      } = MaterialUI;

      const theme = MaterialUI.createTheme({
        palette: {
          mode: "light",
          primary: {
            main: "#13548a"
          },
          secondary: {
            main: "#15706a"
          },
          background: {
            default: "transparent",
            paper: "#ffffff"
          }
        },
        shape: {
          borderRadius: 14
        },
        typography: {
          fontFamily: "Sora, Segoe UI, sans-serif",
          h5: {
            fontWeight: 700
          },
          h6: {
            fontWeight: 600
          }
        }
      });

      const emptyForm = () => ({
        language: "es-ES",
        featureFlags: {
          moderationEnabled: true,
          levelingEnabled: true,
          levelUpAlertsEnabled: true,
          welcomeEnabled: true,
          goodbyeEnabled: true,
          rolesEnabled: true
        },
        channels: {
          newsChannelId: "",
          welcomeChannelId: "",
          goodbyeChannelId: "",
          logsChannelId: "",
          alertChannelId: "",
          musicCommandChannelId: "",
          administrationChannelIds: [],
          commandChannelId: ""
        }
      });

      const normalizeSettings = (settings) => {
        const defaults = emptyForm();
        return {
          language: settings.language || defaults.language,
          featureFlags: {
            ...defaults.featureFlags,
            ...(settings.featureFlags || {})
          },
          channels: {
            ...defaults.channels,
            ...(settings.channels || {}),
            newsChannelId: (settings.channels && settings.channels.newsChannelId) || "",
            welcomeChannelId: (settings.channels && settings.channels.welcomeChannelId) || "",
            goodbyeChannelId: (settings.channels && settings.channels.goodbyeChannelId) || "",
            logsChannelId: (settings.channels && settings.channels.logsChannelId) || "",
            alertChannelId: (settings.channels && settings.channels.alertChannelId) || "",
            musicCommandChannelId:
              (settings.channels && settings.channels.musicCommandChannelId) || "",
            administrationChannelIds:
              (settings.channels && settings.channels.administrationChannelIds) || [],
            commandChannelId:
              (settings.channels &&
                Array.isArray(settings.channels.botCommandChannelIds) &&
                settings.channels.botCommandChannelIds.length > 0 &&
                settings.channels.botCommandChannelIds[0]) ||
              ""
          }
        };
      };

      const channelTitle = (channel) => {
        if (!channel) {
          return "";
        }
        const prefix = channel.kind === "announcement" ? "[News] " : "";
        const base = "#" + channel.name;
        if (!channel.category) {
          return prefix + base;
        }
        return channel.category + " / " + prefix + base;
      };

      const usePersistentState = (storageKey, fallbackValue) => {
        const [value, setValue] = React.useState(() => {
          const stored = window.localStorage.getItem(storageKey);
          return stored === null ? fallbackValue : stored;
        });

        React.useEffect(() => {
          window.localStorage.setItem(storageKey, value);
        }, [storageKey, value]);

        return [value, setValue];
      };

      const App = () => {
        const [token, setToken] = usePersistentState("admin_api_token", "");
        const [actorId, setActorId] = usePersistentState("admin_actor_id", "admin-panel");
        const [guilds, setGuilds] = React.useState([]);
        const [channels, setChannels] = React.useState([]);
        const [selectedGuildId, setSelectedGuildId] = React.useState("");
        const [discordReady, setDiscordReady] = React.useState(false);
        const [loadingGuilds, setLoadingGuilds] = React.useState(false);
        const [loadingSettings, setLoadingSettings] = React.useState(false);
        const [saving, setSaving] = React.useState(false);
        const [form, setForm] = React.useState(emptyForm());
        const [toast, setToast] = React.useState({
          open: false,
          severity: "info",
          message: ""
        });

        const channelLabels = React.useMemo(() => {
          const map = {};
          for (const channel of channels) {
            map[channel.id] = channelTitle(channel);
          }
          return map;
        }, [channels]);

        const notify = (message, severity = "info") => {
          setToast({
            open: true,
            severity,
            message
          });
        };

        const buildHeaders = (withBody = false) => {
          const headers = {};
          if (withBody) {
            headers["Content-Type"] = "application/json";
          }
          if (token.trim()) {
            headers.Authorization = "Bearer " + token.trim();
          }
          if (actorId.trim()) {
            headers["X-Admin-User-Id"] = actorId.trim();
          }
          return headers;
        };

        const request = async (path, options = {}) => {
          const withBody = Boolean(options.body);
          const response = await fetch(path, {
            ...options,
            headers: {
              ...buildHeaders(withBody),
              ...(options.headers || {})
            }
          });

          const contentType = response.headers.get("content-type") || "";
          const data = contentType.includes("application/json") ? await response.json() : null;

          if (!response.ok) {
            const message = data && data.error ? data.error : "Error HTTP " + response.status;
            throw new Error(message);
          }

          return data;
        };

        const loadGuilds = async () => {
          setLoadingGuilds(true);
          try {
            const data = await request("/api/guilds");
            setDiscordReady(Boolean(data.ready));
            setGuilds(data.guilds || []);

            if (!selectedGuildId && data.guilds && data.guilds.length > 0) {
              setSelectedGuildId(data.guilds[0].id);
            }

            if (selectedGuildId && (!data.guilds || !data.guilds.some((guild) => guild.id === selectedGuildId))) {
              setSelectedGuildId(data.guilds && data.guilds.length > 0 ? data.guilds[0].id : "");
            }
          } catch (error) {
            notify(error.message || "No se pudieron cargar los servidores", "error");
          } finally {
            setLoadingGuilds(false);
          }
        };

        const loadGuildData = async (guildId) => {
          if (!guildId) {
            return;
          }
          setLoadingSettings(true);
          try {
            const [channelData, settingsData] = await Promise.all([
              request("/api/guilds/" + guildId + "/channels"),
              request("/api/guilds/" + guildId + "/settings")
            ]);

            setChannels(channelData.channels || []);
            setForm(normalizeSettings(settingsData.settings || {}));
          } catch (error) {
            notify(error.message || "No se pudo cargar la configuracion", "error");
          } finally {
            setLoadingSettings(false);
          }
        };

        React.useEffect(() => {
          void loadGuilds();
        }, []);

        React.useEffect(() => {
          if (selectedGuildId) {
            void loadGuildData(selectedGuildId);
          }
        }, [selectedGuildId]);

        const updateFeatureFlag = (key, value) => {
          setForm((current) => ({
            ...current,
            featureFlags: {
              ...current.featureFlags,
              [key]: value
            }
          }));
        };

        const updateChannelField = (key, value) => {
          setForm((current) => ({
            ...current,
            channels: {
              ...current.channels,
              [key]: value
            }
          }));
        };

        const save = async () => {
          if (!selectedGuildId) {
            return;
          }

          setSaving(true);
          try {
            await request("/api/guilds/" + selectedGuildId + "/settings", {
              method: "PUT",
              body: JSON.stringify({
                language: form.language,
                featureFlags: form.featureFlags,
                channels: {
                  newsChannelId: form.channels.newsChannelId || null,
                  welcomeChannelId: form.channels.welcomeChannelId || null,
                  goodbyeChannelId: form.channels.goodbyeChannelId || null,
                  logsChannelId: form.channels.logsChannelId || null,
                  alertChannelId: form.channels.alertChannelId || null,
                  musicCommandChannelId: form.channels.musicCommandChannelId || null,
                  administrationChannelIds: form.channels.administrationChannelIds,
                  botCommandChannelIds: form.channels.commandChannelId
                    ? [form.channels.commandChannelId]
                    : []
                }
              })
            });
            notify("Configuracion guardada correctamente", "success");
          } catch (error) {
            notify(error.message || "No se pudo guardar la configuracion", "error");
          } finally {
            setSaving(false);
          }
        };

        const renderChannelSelect = (label, value, onChange) => (
          <FormControl fullWidth size="small">
            <InputLabel>{label}</InputLabel>
            <Select
              value={value}
              label={label}
              onChange={(event) => {
                onChange(event.target.value);
              }}
            >
              <MenuItem value="">
                <em>Sin configurar</em>
              </MenuItem>
              {channels.map((channel) => (
                <MenuItem key={channel.id} value={channel.id}>
                  {channelTitle(channel)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

        return (
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: "blur(8px)" }}>
              <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography variant="h6" color="primary.main">
                  Panel admin del bot
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" color="primary" onClick={() => void loadGuilds()}>
                    Recargar
                  </Button>
                  <Button variant="contained" color="primary" onClick={() => void save()} disabled={saving || !selectedGuildId}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </Stack>
              </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: 3 }}>
              <Stack spacing={2.5}>
                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid rgba(19, 84, 138, 0.18)" }}>
                    <Typography variant="h6" gutterBottom>
                      Conexion
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Token API (Bearer)"
                        type="password"
                        value={token}
                        onChange={(event) => setToken(event.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Discord User ID (auditoria)"
                        value={actorId}
                        onChange={(event) => setActorId(event.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        variant="contained"
                        color="secondary"
                        fullWidth
                        sx={{ height: "100%" }}
                        onClick={() => void loadGuilds()}
                      >
                        Conectar
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {!discordReady && (
                  <Alert severity="warning">
                    El bot todavia no esta listo en Discord. Cuando quede ready apareceran los servidores.
                  </Alert>
                )}

                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid rgba(19, 84, 138, 0.18)" }}>
                  <Typography variant="h6" gutterBottom>
                    Servidor
                  </Typography>
                  {loadingGuilds ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={20} />
                      <Typography variant="body2">Cargando servidores...</Typography>
                    </Stack>
                  ) : (
                    <FormControl fullWidth size="small">
                      <InputLabel>Guild</InputLabel>
                      <Select
                        value={selectedGuildId}
                        label="Guild"
                        onChange={(event) => setSelectedGuildId(event.target.value)}
                      >
                        {guilds.map((guild) => (
                          <MenuItem key={guild.id} value={guild.id}>
                            {guild.name} ({guild.id})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Paper>

                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid rgba(19, 84, 138, 0.18)" }}>
                  <Typography variant="h6" gutterBottom>
                    Canales
                  </Typography>
                  {loadingSettings ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={20} />
                      <Typography variant="body2">Cargando configuracion del servidor...</Typography>
                    </Stack>
                  ) : (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          select
                          label="Idioma base"
                          value={form.language}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              language: event.target.value
                            }))
                          }
                        >
                          <MenuItem value="es-ES">Espanol</MenuItem>
                          <MenuItem value="en-US">English</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderChannelSelect("Canal de noticias", form.channels.newsChannelId, (value) =>
                          updateChannelField("newsChannelId", value)
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderChannelSelect("Canal de alertas", form.channels.alertChannelId, (value) =>
                          updateChannelField("alertChannelId", value)
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderChannelSelect("Canal de bienvenida", form.channels.welcomeChannelId, (value) =>
                          updateChannelField("welcomeChannelId", value)
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderChannelSelect("Canal de despedida", form.channels.goodbyeChannelId, (value) =>
                          updateChannelField("goodbyeChannelId", value)
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderChannelSelect("Canal de logs", form.channels.logsChannelId, (value) =>
                          updateChannelField("logsChannelId", value)
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderChannelSelect(
                          "Canal del bot de musica (solo comandos)",
                          form.channels.musicCommandChannelId,
                          (value) => updateChannelField("musicCommandChannelId", value)
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderChannelSelect("Canal publico para comandos", form.channels.commandChannelId, (value) =>
                          updateChannelField("commandChannelId", value)
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Canales de administracion</InputLabel>
                          <Select
                            multiple
                            value={form.channels.administrationChannelIds}
                            label="Canales de administracion"
                            input={<OutlinedInput label="Canales de administracion" />}
                            renderValue={(selected) => (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                {selected.map((channelId) => (
                                  <Chip key={channelId} label={channelLabels[channelId] || channelId} size="small" />
                                ))}
                              </Box>
                            )}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateChannelField(
                                "administrationChannelIds",
                                typeof value === "string" ? value.split(",") : value
                              );
                            }}
                          >
                            {channels.map((channel) => (
                              <MenuItem key={channel.id} value={channel.id}>
                                {channelTitle(channel)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  )}
                </Paper>

                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid rgba(19, 84, 138, 0.18)" }}>
                  <Typography variant="h6" gutterBottom>
                    Flags de modulos
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(form.featureFlags.moderationEnabled)}
                            onChange={(event) =>
                              updateFeatureFlag("moderationEnabled", event.target.checked)
                            }
                          />
                        }
                        label="Moderacion"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(form.featureFlags.levelingEnabled)}
                            onChange={(event) => updateFeatureFlag("levelingEnabled", event.target.checked)}
                          />
                        }
                        label="Sistema de niveles"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(form.featureFlags.levelUpAlertsEnabled)}
                            onChange={(event) =>
                              updateFeatureFlag("levelUpAlertsEnabled", event.target.checked)
                            }
                          />
                        }
                        label="Alertas de nivel"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(form.featureFlags.welcomeEnabled)}
                            onChange={(event) => updateFeatureFlag("welcomeEnabled", event.target.checked)}
                          />
                        }
                        label="Bienvenidas"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(form.featureFlags.goodbyeEnabled)}
                            onChange={(event) => updateFeatureFlag("goodbyeEnabled", event.target.checked)}
                          />
                        }
                        label="Despedidas"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(form.featureFlags.rolesEnabled)}
                            onChange={(event) => updateFeatureFlag("rolesEnabled", event.target.checked)}
                          />
                        }
                        label="Roles"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Stack>
            </Container>

            <Snackbar
              open={toast.open}
              autoHideDuration={4500}
              onClose={() => setToast((current) => ({ ...current, open: false }))}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
              <Alert
                severity={toast.severity}
                variant="filled"
                onClose={() => setToast((current) => ({ ...current, open: false }))}
              >
                {toast.message}
              </Alert>
            </Snackbar>
          </ThemeProvider>
        );
      };

      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(<App />);
    </script>
  </body>
</html>
`;
