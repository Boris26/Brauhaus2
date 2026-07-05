# Data flow

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

Needs verification: backend ordering of `GET beers`, because the UI treats the last item as default selection.

## Production start flow

- Production view reads `beerDataReducer.beerToBrew` as `selectedBeer`.
- `mapBeerToBrewingData(selectedBeer)` extracts Einmaischen and Abmaischen temperatures, cooking temperature/time, and normalized timed/confirmation rests.
- On success, `SEND_BREWING_DATA` posts `BrewingData` to `POST Recipe/` and expects HTTP 201.
- If successful, UI posts `Command/StartBrewing:""` and then begins status polling.

## Runtime status polling flow

- Poll interval is 1000 ms after start brewing.
- Each `GET Status/` response is passed through `normalizeBrewingStatus`.
- Normalized status is stored in `productionReducer.brewingStatus` and in `dataCollector`.
- Polling stops when normalized process state is `FINISHED`, `ABORTED`, or `ERROR`.

## Availability polling

- `CHECK_IS_BACKEND_AVAILABLE` starts a 20000 ms interval with an immediate first check.
- It calls `GET Available/` on the PI/control base URL, not the database URL.
- Result is displayed in the header as `Backend: Online/Offline`.

## Water-fill flow

- User selects liters and toggles water switch.
- UI posts `Command/FillWaterAutomatic:{liters}`.
- On success, an RxJS interval polls `GET WaterStatus` every 1000 ms and stores `{ liters, openClose }`.
- Needs verification: current `takeUntil` code uses a one-shot `from(ProductionRepository.getWaterStatus())`; confirm intended continuous stop behavior.

## Confirm/waiting flow

- Normalized status fields `process.state`, `currentStep.mode`, `waiting.waitingFor`, and `waiting.canConfirm` determine whether a modal appears.
- UI maps waiting reasons to confirm endpoints:
  - `IODINE_TEST` -> `Confirm/Iodine`
  - `MASHING_IN_CONFIRMATION` -> `Confirm/Mashup`
  - `BOILING_CONFIRMATION` -> `Confirm/Boiling`
  - `COOKING_CONFIRMATION` -> `Confirm/Cooking`
  - `DECOCTION_CONFIRMATION` -> `Confirm/Decoction`
  - default -> `Confirm/Wait`

## Hop reminder flow

- Production view computes reminder times from selected recipe hops as `(selectedBeer.cookingTime - hop.time) * 60`.
- During `COOKING`, it compares `brewingStatus.currentStep.elapsedTime` to those second offsets and shows a modal with the hop name once per offset.
- This means `hop.time` is assumed to be minutes before the end of boil, and `currentStep.elapsedTime` is assumed to be seconds elapsed in the cooking phase. Needs verification.

## Finished-brew completion flow

- When normalized process state becomes `FINISHED`, UI shows a finish dialog.
- Confirming stops polling and creates a `FinishedBrew` with generated UUID, selected beer name/id, date, default metrics, state `FERMENTATION`, active `true`, and `brewValues` JSON from `dataCollector`.
- It posts this through finished-brew repository via beer epics.

