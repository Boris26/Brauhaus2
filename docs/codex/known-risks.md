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


## PI control confirmation and timing contracts

- `Wait` is a control status, not a confirmation command. The UI must not call `POST /Confirm/Wait`; only concrete confirmation endpoints (`Iodine`, `Mashup`, `Cooking`, `Boiling`, `Decoction`) are valid.
- `currentTime` is not a UI duration/countdown/progress field. UI progress should use explicit seconds-based fields such as `elapsedTime`, `currentStep.duration`, and `currentStep.remainingTime`.
- `WaterStatus` is expected as an object `{ filledLiters, targetLiters, openClose }`; keep defensive defaults for null, undefined, or failed HTTP responses to avoid broken rendering.


## Remaining PI control verification items

- Exact operational meaning of `WaterStatus.filledLiters / WaterStatus.targetLiters` beyond the UI display/control value remains Needs verification.
- Long-term stability of `GET /temperatur/0` remains Needs verification.
- Socket.io `overheat` payload shape remains Needs verification.
- Initial empty `Status` behavior remains Needs verification unless PI control guarantees a complete structured/default status object.

Resolved items that should not be reopened without new evidence: `/Available/`, `/WaterStatus` slash compatibility, WaterStatus object/default shape, no-value `TurnOn`/`TurnOff`, preserved value-bearing command aliases, `/Confirm/Wait` rejection, concrete confirmation values, and `currentTime` timestamp semantics.
