# UI context for PI/control repository

## What the UI expects from control

- HTTP service at `http://192.168.178.37:5000/` with command and confirm subpaths.
- Recipe intake via `POST /Recipe/` returning HTTP 201.
- Brewing start via `POST /Command/StartBrewing:""` returning HTTP 200.
- Runtime status via `GET /Status/` returning structured `BrewingStatus` or legacy fallback fields.
- Availability via `GET /Available/` returning HTTP 200 when reachable.
- Temperature fallback via `GET /temperatur/0` returning a number.
- Water status via `GET /WaterStatus` returning `{ liters, openClose }`; control also supports `GET /WaterStatus/`.
- Hardware commands for water, heater, agitator speed, and agitator interval.
- Confirm endpoints only for concrete waiting states: `Iodine`, `Mashup`, `Cooking`, `Boiling`, and `Decoction`. `Wait` may be displayed as a status but must not be sent as `/Confirm/Wait`.

## UI-owned behavior

- UI decides view state, status labels, confirm-dialog visibility, recipe-to-`BrewingData` mapping, hop reminders, and finish-dialog creation.
- UI normalizes legacy and structured status response shapes.

## Control-owned behavior assumed by UI

- Status timing fields `elapsedTime`, `currentStep.duration`, `currentStep.elapsedTime`, and `currentStep.remainingTime` use seconds. `currentTime` is a PI-control timestamp and must not be used by the UI as duration/countdown/progress unless the contract changes.
- `process.state` reaches `FINISHED`, `ABORTED`, or `ERROR` to stop polling.
- `currentStep.phase === COOKING` and `currentStep.elapsedTime` allow hop reminders.
- `waiting.waitingFor` indicates the exact confirmation type required.
- `waiting.canConfirm` tells whether the UI should enable confirmation.
- `hardware.heater === 'ON'` and `hardware.agitator === 'ON'` are meaningful for display.

Needs verification in control repository: units, socket.io event shape, exact command grammar containing `:""`, trailing slash behavior, and whether `/temperatur/0` is the intended stable temperature read route.

