# Data flow

## Running BrewSession restoration

The existing Socket.IO transport maps the payload-free `brew-session-running` event to `BREW_SESSION_RUNNING_RECEIVED`. A production epic then reads `GET /api/controller/BrewSession`, reuses a matching beer from Redux or refreshes recipes through `BeerRepository.getBeers()`, and reconstructs the temporary plan with `BeerRecipeScaler` from `plannedVolume` and `plannedBrewhouseEfficiency`. Only after successful reconstruction does it set both `selectedBeer` and `beerToBrew` and dispatch `START_POLLING` when no poll is already active. This recovery path never posts a recipe or sends a brewing start command.

## Recipe import

The recipe editor opens a format/file dialog. The user selects `BRAUHAUS` or `MMUM`; `BRAUREKA` is not offered. The UI reads the file with `File.text()`, accepts only a syntactically valid JSON object, and passes that object unchanged as `recipe` in `{ format, recipe, idempotencyKey }` to `POST /api/database/importbeer`. The backend owns all source interpretation and persistence. The `RecipeImportResult.recipe` response flows through `ADD_IMPORTED_BEER` into the list/editor, while warnings, non-exact mappings, and created master data remain available for a user notice. Structured errors keep the dialog open. See `recipe-import-v2.md` for the audit.

BeerDatabase 2.x returns `RecipeImportResult`, including `replayed`; a replay is handled as a successful, non-duplicating import.

## Startup flow

- `src/index.tsx` dispatches `ApplicationActions.setTheme(resolveInitialTheme())` before rendering.
- `App` chooses mobile or desktop by viewport width.
- Desktop `Index` dispatches backend availability polling on mount.

## Recipe/database flow

- Main view dispatches `BeerActions.getBeers(true)` on mount.
- Beer epics call `BeerRepository.getBeers()` (`GET beers`).
- `beerDataReducer.GET_BEERS_SUCCESS` stores the list and selects the last returned recipe as `selectedBeer`.
- Table sorting is client-side on `name`, `type`, `color`, or `alcohol`.
- Selecting a row stores `selectedBeer`; clicking brew stores `beerToBrew`.
- Recipe-detail scaling initializes every selected recipe with its `referenceVolume` and the equipment plan default of `52` % SHA, then derives volume from `targetVolume / referenceVolume` and malt efficiency from `referenceBrewhouseEfficiency / targetBrewhouseEfficiency`. This initial plan is calculated immediately, including equipment-based water values. The scaled copy remains only in `selectedBeer`; the persisted entry in `beers` is unchanged. Clicking brew for that selected row stores this scaled copy as `beerToBrew`, so production and shopping-list consumers use the planned quantities rather than the original recipe.

Needs verification: backend ordering of `GET beers`, because the UI treats the last item as default selection.

## Production start flow

- Production view reads `beerDataReducer.beerToBrew` as `selectedBeer`.
- `mapBeerToBrewingData(selectedBeer)` extracts Einmaischen and Abmaischen temperatures, cooking temperature/time, and normalized timed/decoction steps. It emits explicit `RAST`/`DECOCTION` procedure types and upgrades legacy `CONFIRMATION_HOLD` steps to `DECOCTION`. Missing or invalid top-level cooking temperature is replaced with `99` °C in the UI mapping before sending control data.
- On success, `SEND_BREWING_DATA` posts `BrewingData` to `POST Recipe/` and expects HTTP 201. Recipe submission and the following `StartBrewing` call are one non-idempotent command lifecycle; repeated submit actions are ignored while that lifecycle is pending.
- After recipe submission, the UI calls `StartBrewing` with the connected default-namespace Socket.IO SID in the optional `X-Socket-ID` header. Only a successful controller response emits `START_POLLING`; `startPollingEpic$` owns the single `/Status/` loop and ignores repeated starts while it is active.
- Mounting or unmounting desktop/mobile Production never starts or stops process polling. A remote, refreshed, or reconnected client instead receives `brew-session-running`, restores `GET /BrewSession`, reconstructs the scaled beer, and emits `START_POLLING` when no poll is active.
- Temperature, sensor health/ID, heater output, agitator output, and alarms remain available without a brew through the app-lifetime Socket.IO connection. A new/reconnected controller snapshot `temperature-sensor-state-changed` replaces the global sensor snapshot; disconnect clears it as unknown. Production does not issue the legacy temperature REST read on mount.
- If successful, UI posts `Command/StartBrewing:""` and then begins status polling.

## Runtime status polling flow

- Poll interval is 1000 ms after start brewing.
- Each `GET Status/` response is passed through `normalizeBrewingStatus`.
- The normalizer carries the response's `alarms` list into `BrewingStatus.alarms` and defaults a missing legacy node to `[]`.
- The desktop production UI derives an active equipment alarm from `alarms` and displays it through the existing production modal and header status components. Dismissing the modal is local presentation state for the current continuous alarm cycle and does not dispatch an action or call an API.
- Normalized status is stored in `productionReducer.brewingStatus` and in `dataCollector`.
- Polling stops when normalized process state is `FINISHED`, `ABORTED`, or `ERROR`.

Automatic water filling follows the same at-most-once-while-pending rule: another `START_WATER_FILLING` is ignored until the active controller command and its water-status polling lifecycle finish.

## Production agitator configuration flow

- Production applies speed, interval, and mode edits as local drafts immediately. `PUT /Agitator/Config` is command-only; HTTP success does not confirm or replace controller state.
- The complete `agitator-state-changed` Socket.IO snapshot remains authoritative and is received by every client, including the client that sent the command. A local field draft is removed only when the snapshot contains the requested value; unrelated or older snapshots update confirmed state without making the edited value jump backwards.
- Normal configuration requests do not globally disable the agitator controls. The existing 300 ms speed debounce still coalesces slider movement before sending the complete desired configuration.

## Availability polling

- `CHECK_IS_BACKEND_AVAILABLE` starts a 20000 ms interval with an immediate first check.
- It calls `GET Available/` on the PI/control base URL, not the database URL.
- Result is displayed in the header as `Backend: Online/Offline`.

## Water-fill flow

- User selects liters and toggles water switch.
- UI posts `Command/FillWaterAutomatic:{liters}`.
- On success, an RxJS interval polls `GET WaterStatus` every 1000 ms and stores normalized `{ filledLiters, targetLiters, openClose }`; the confirmed control API also supports `GET WaterStatus/` and always returns an object shape.
- Needs verification: current `takeUntil` code uses a one-shot `from(ProductionRepository.getWaterStatus())`; confirm intended continuous stop behavior.
- The production UI keeps `recipeWaterFill.currentWaterLiters` as the committed vessel-water snapshot for the complete lifetime of a fill operation. Poll values are displayed as that stable base plus `WaterStatus.filledLiters`; they are not committed into the base while the valve is open.
- A newly dispatched fill does not immediately make the prior, closed `WaterStatus` current. The UI displays only the committed base until it observes `openClose: true` for the new operation. The first such status is displayed immediately, including a legitimate partial value such as `0.3` liters.
- On the first transition from `openClose: true` to `false`, the final measured `filledLiters` is committed exactly once. A final value above `targetLiters` remains visible and is not clamped because the controller contract defines `filledLiters` as the measured operation amount.

## Confirm/waiting flow

- Normalized status fields `process.state`, `currentStep.mode`, `waiting.waitingFor`, and `waiting.canConfirm` feed a central confirmation view model. On desktop it is rendered inline in `Aktueller Schritt`; on mobile the same model provides the inline action and confirm button. Regular control confirmations no longer open a modal.
- UI maps only concrete waiting reasons to confirm endpoints:
  - `IODINE_TEST` -> `Confirm/Iodine`
  - `MASHING_IN_CONFIRMATION` -> `Confirm/Mashup`
  - `MASHING_OUT_CONFIRMATION` -> `Confirm/Mashup`
  - `BOILING_CONFIRMATION` -> `Confirm/Boiling`
  - `COOKING_CONFIRMATION` -> `Confirm/Cooking`
  - `DECOCTION_CONFIRMATION` -> `Confirm/Decoction`
  - `DECOCTION_RETURN_CONFIRMATION` -> `Confirm/DecoctionReturned`
  - `USER_CONFIRMATION`, `NONE`, or unknown waiting reasons do not send a confirm command. `Wait` may be displayed as a status, but the UI must not call `Confirm/Wait`.
- During the return phase after a decoction, `heating.followsDecoction` selects return-specific Production copy. Heater activity is absent from REST and is driven exclusively by a connected `realtimeState.heatingRunning === true` Socket.IO snapshot; missing or disconnected snapshots are unknown and never show flames.
- `USER_CONFIRMATION` and unknown waiting reasons remain visibly marked as waiting inline but do not render a confirmation button.

## Hop reminder flow

- Production view computes reminder times from selected recipe hops as `(selectedBeer.cookingTime - hop.time) * 60`.
- During `COOKING`, it compares `brewingStatus.currentStep.elapsedTime` to those second offsets and shows a non-blocking inline reminder with the hop name once per offset. Control waiting confirmations have priority over this reminder.
- This means `hop.time` is assumed to be minutes before the end of boil, and `currentStep.elapsedTime` is assumed to be seconds elapsed in the cooking phase. Needs verification.

## Finished-brew completion flow

- When normalized process state becomes `FINISHED`, UI shows a finish dialog.
- Confirming stops polling and creates a `FinishedBrew` with generated UUID, selected beer name/id, date, default metrics, state `FERMENTATION`, active `true`, and `brewValues` JSON from `dataCollector`.
- It posts this through finished-brew repository via beer epics.
