# UI context for PI/control repository

## What the UI expects from control

- HTTP service at `http://192.168.178.37:5000/` with command and confirm subpaths.
- Recipe intake via `POST /Recipe/` returning HTTP 201.
- Brewing start via `POST /Command/StartBrewing:""` returning HTTP 200.
- Runtime status via `GET /Status/` returning structured `BrewingStatus` or legacy fallback fields.
- Availability via `GET /Available/` returning HTTP 200 when reachable.
- Temperature fallback via `GET /temperatur/0` returning a number.
- Water status via `GET /WaterStatus` returning `{ filledLiters, targetLiters, openClose }`; control also supports `GET /WaterStatus/`.
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

Needs verification in control repository: exact operational meaning of `WaterStatus.filledLiters / WaterStatus.targetLiters`, long-term stability of `/temperatur/0`, socket.io `overheat` payload shape, and initial empty `Status` behavior.


## Final confirmed PI-control contract

See `docs/codex/compatibility/final-ui-control-compatibility-report.md` for the final UI ↔ PI control contract. Resolved items: `/Available/` is UI-facing availability while `/` remains preserved, both `/WaterStatus` and `/WaterStatus/` are supported with object/default shape, `TurnOn`/`TurnOff` no-value aliases are valid, value-bearing command aliases remain preserved, `Wait` is status-only and `/Confirm/Wait` is rejected by PI, and `currentTime` is a Unix timestamp not used for UI progress.

Remaining open items: exact operational meaning of `WaterStatus.filledLiters / WaterStatus.targetLiters`, long-term stability of `/temperatur/0`, socket.io `overheat` payload shape, and initial empty `Status` behavior.
