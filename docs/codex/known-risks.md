# Known risks

- URLs are hard-coded LAN IP addresses in source; there is no discovered environment-based override.
- `productionWebSocketEpic$` appears to parse `event.data` as JSON although `WebSocketController` passes `{ event, data }`. Overheat handling may not work. Needs verification.
- `checkIsBackendAvailable` checks the PI/control `Available/` endpoint but the header labels it `Backend`; this can confuse database-backend availability with control availability.
- `ProductionProps.isBackenAvailable` is typed as `BackendAvailable`, but Redux state stores a boolean at `productionReducer.isBackenAvailable`; some component code treats it both ways.
- Recipe list default selection depends on the last item returned by `GET beers`. Backend ordering changes affect default preview.
- Hop reminders assume recipe hop `time` is minutes before end of boil and status `currentStep.elapsedTime` is seconds within cooking phase.
- `FinishedBrew` creation after production finish stores default numeric values (`liters`, `originalwort`, `residual_extract`) as `0`; real measurement ownership is unclear. Needs verification.
- `finishedbeer` create and update both use `POST finishedbeer`; changing backend semantics could break update behavior.
- Status normalization supports legacy fields; removing backend legacy fields is safe only if structured fields are complete.
- The app mixes Material UI v4 and MUI v5 dependencies.
- `build-deploy`/`deploy` assume SSH access to `boris@192.168.178.72:/srv/sites/braumeister`.
- Mobile/desktop split is computed once from initial `window.innerWidth`; resizing after load does not switch app shell.

