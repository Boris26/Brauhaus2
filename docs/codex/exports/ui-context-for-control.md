# UI context for PI/control repository

## What the UI expects from control

- HTTP service at `http://192.168.178.37:5000/` with command and confirm subpaths.
- Recipe intake via `POST /Recipe/` returning HTTP 201.
- Brewing start via `POST /Command/StartBrewing:""` returning HTTP 200.
- Runtime status via `GET /Status/` returning structured `BrewingStatus` or legacy fallback fields.
- Availability via `GET /Available/` returning HTTP 200 when reachable.
- Temperature fallback via `GET /temperatur/0` returning a number.
- Water status via `GET /WaterStatus` returning `{ liters, openClose }`.
- Hardware commands for water, heater, agitator speed, and agitator interval.
- Confirm endpoints for waiting states.

## UI-owned behavior

- UI decides view state, status labels, confirm-dialog visibility, recipe-to-`BrewingData` mapping, hop reminders, and finish-dialog creation.
- UI normalizes legacy and structured status response shapes.

## Control-owned behavior assumed by UI

- Status fields use seconds for `elapsedTime`, `currentTime`, `currentStep.elapsedTime`, and `currentStep.remainingTime`.
- `process.state` reaches `FINISHED`, `ABORTED`, or `ERROR` to stop polling.
- `currentStep.phase === COOKING` and `currentStep.elapsedTime` allow hop reminders.
- `waiting.waitingFor` indicates the exact confirmation type required.
- `waiting.canConfirm` tells whether the UI should enable confirmation.
- `hardware.heater === 'ON'` and `hardware.agitator === 'ON'` are meaningful for display.

Needs verification in control repository: units, socket.io event shape, exact command grammar containing `:""`, trailing slash behavior, and whether `/temperatur/0` is the intended stable temperature read route.

