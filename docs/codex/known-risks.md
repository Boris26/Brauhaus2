# Known risks

- URLs are hard-coded LAN IP addresses in source; there is no discovered environment-based override.
- `productionWebSocketEpic$` appears to parse `event.data` as JSON although `WebSocketController` passes `{ event, data }`. Overheat handling may not work. Needs verification.
- `checkIsBackendAvailable` checks the PI/control `Available/` endpoint but the header labels it `Backend`; this can confuse database-backend availability with control availability.
- `ProductionProps.isBackenAvailable` is typed as `BackendAvailable`, but Redux state stores a boolean at `productionReducer.isBackenAvailable`; some component code treats it both ways.
- Recipe list default selection depends on the last item returned by `GET beers`. Backend ordering changes affect default preview.
- Hop reminders assume recipe hop `time` is minutes before end of boil and status `currentStep.elapsedTime` is seconds within cooking phase.
- `FinishedBrew` creation after production finish stores default numeric values (`liters`, `originalwort`, `residual_extract`) as `0`; real measurement ownership is unclear. Needs verification.
- Finished-brew create and update have distinct semantics: create uses `POST finishedbeer` with a UI-generated optional UUID that is reused for retries; full-record update uses `PUT finishedbeer` with the existing ID. Legacy clients may still omit the create ID, in which case BeerDataStore generates one and that individual legacy request is not retry-idempotent.
- A stable PI/control brew-run ID does not exist. Two independent UI clients completing the same physical brew can therefore still create different FinishedBrew UUIDs; cross-client deduplication is Needs verification and must not use `beer_id` alone because one recipe can be brewed repeatedly.
- Status normalization supports legacy fields; removing backend legacy fields is safe only if structured fields are complete.
- The app mixes Material UI v4 and MUI v5 dependencies.
- `build-deploy`/`deploy` assume SSH access to `boris@192.168.178.72:/srv/sites/braumeister`.
- Mobile/desktop split is computed once from initial `window.innerWidth`; resizing after load does not switch app shell.


## PI control confirmation and timing contracts

- `Wait` is a control status, not a confirmation command. The UI must not call `POST /Confirm/Wait`; only concrete confirmation endpoints (`Iodine`, `Mashup`, `Cooking`, `Boiling`, `Decoction`) are valid.
- Regular process confirmations are inline and therefore cannot be triggered by closing a modal. The shared `ModalDialog` still treats backdrop/Escape `onClose` as `onConfirm` when no cancel button is configured; this remains relevant to the finish workflow and other non-process-confirmation dialogs and must not be changed globally without auditing every consumer.
- `currentTime` is not a UI duration/countdown/progress field. UI progress should use explicit seconds-based fields such as `elapsedTime`, `currentStep.duration`, and `currentStep.remainingTime`.
- `WaterStatus` is expected as an object `{ filledLiters, targetLiters, openClose }`; keep defensive defaults for null, undefined, or failed HTTP responses to avoid broken rendering.


## Remaining PI control verification items

- Exact operational meaning of `WaterStatus.filledLiters / WaterStatus.targetLiters` beyond the UI display/control value remains Needs verification.
- The UI can distinguish a stale status/double count from controller overfill, but this repository contains no runtime PI log for a reported physical fill. If a 2-liter request finishes with `filledLiters: 2.3`, the resulting cumulative 4.3 liters is intentional UI behavior; the valve timing, sensor measurement, and water after-run are **Needs verification** in the PI-control repository/logs.
- Long-term stability of `GET /temperatur/0` remains Needs verification.
- Socket.io `overheat` payload shape remains Needs verification.
- Initial empty `Status` behavior remains Needs verification unless PI control guarantees a complete structured/default status object.

Resolved items that should not be reopened without new evidence: `/Available/`, `/WaterStatus` slash compatibility, WaterStatus object/default shape, no-value `TurnOn`/`TurnOff`, preserved value-bearing command aliases, `/Confirm/Wait` rejection, concrete confirmation values, and `currentTime` timestamp semantics.

## Lifecycle/action deployment risks

- BeerDataStore validation for the three-state lifecycle, HTTP 409 `INVALID_FINISHED_BEER_TRANSITION`, and atomic completion timestamps is **Needs verification**. The UI never treats its transition projection as authoritative.
- Recipe action fields are additive and optional for legacy compatibility. Backend persistence and runtime action materialization are **Needs verification**; the UI deliberately does not reinterpret legacy dry-hop `time`.
- `TIME_OFFSET` uses `FinishedBrew.fermentationStartedAt` as its only fermentation epoch; `startDate` is never a fallback. The browser sets a timezone-bearing ISO instant only when the production workflow first creates the concrete brew. BeerDataStore persistence and calculation remain **Needs verification**.
- This repository keys aggregate runtime state and measurements by `FinishedBrew.id`. The BeerDataStore `RecipeActionRuntime` foreign key and unique constraint could not be inspected here; it must be verified as semantically `(finished_beer_id, recipe_action_id)`, never `(recipe beer_id, recipe_action_id)`.
- Fermentation due/contact-ended messages are in-app. Reusing the installed push architecture for those BeerDataStore-owned events is **Needs verification**; no second push subsystem was introduced.
