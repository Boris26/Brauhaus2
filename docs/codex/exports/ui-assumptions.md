# UI assumptions needing backend/control awareness

## Backend/database assumptions

- `GET beers` returns a stable array; the UI selects the last item as default.
- Beer IDs are stable strings usable for selection, deletion, and `FinishedBrew.beer_id`.
- `POST beer` accepts `BeerDTO` with `fermentationSteps`, not `fermentation`.
- `POST finishedbeer` handles both create and update.
- `GET finishedbeers` returns records compatible with `FinishedBrew` TypeScript shape.
- Import endpoint accepts multipart field name `file`.

Needs verification: sorting/order guarantees, update semantics, import response shape, ID types, date formats.

## PI/control assumptions

- `POST Recipe/` returns 201 only when recipe is accepted.
- `POST Command/StartBrewing:""` starts the accepted recipe.
- `GET Status/` returns complete enough status every second.
- Status terminal states stop polling.
- `WaitingFor` enum values match UI mappings.
- `WaterStatus` is an object `{ liters, openClose }`; `openClose !== true` means water filling is no longer open/running.
- `Command/AgitatorInterval:""` accepts JSON body with `isTurnOn`, `rotationsPerMinute`, `runningTime`, `breakTime`, `isIntervalTurnOn`, `isHeatingAndStirringTurnOn`.

Needs verification: exact endpoint slash/case conventions, units, command syntax, water fill state semantics, safety constraints.


## Final PI-control assumptions

- `/Available/` is the UI-facing PI availability endpoint; `/` remains a preserved PI root route.
- `WaterStatus` success responses are objects and default to `{ liters: 0, openClose: false }`.
- `Wait` is status-only; UI must only send concrete confirmations and PI rejects `/Confirm/Wait` with a controlled error.
- `currentTime` is a Unix timestamp and is not a UI progress/duration/countdown field.
