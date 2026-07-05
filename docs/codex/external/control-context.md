# External context: PI control

Source files:

- PI-Steuerung `docs/codex/exports/control-context-for-ui.md`
- PI-Steuerung `docs/codex/exports/control-output-data.md`
- PI-Steuerung `docs/codex/exports/control-risk-fields.md`
- PI-Steuerung `docs/codex/interfaces.md`
- UI `docs/codex/exports/ui-context-for-control.md`

## Summary for UI agents

The PI control service owns brewing runtime state, machine commands, water fill status, temperature readings, and confirmation workflow state. The UI displays and reacts to this data.

## Important conflict notes

- `GET /Available/` is the confirmed UI-facing availability endpoint.
- `currentTime` is a Unix timestamp/status update time and may be `0`; UI must not use it as duration/countdown/progress.
- `GET /WaterStatus` and `GET /WaterStatus/` are both supported and return an object `{ liters, openClose }` from startup.
- UI should keep legacy status normalization until structured control status is guaranteed.

---

# Control context for UI repositories

## Verification status

External UI context files are missing in this repository. Therefore React UI behavior is **Needs verification**. This file only identifies control fields that are likely UI-visible or UI-relevant based on API/status naming and existing API docs.

## Likely UI-visible control data

Potentially visible values:

- Process state: `process.state`.
- Current step: `currentStep.index`, `count`, `phase`, `mode`, `name`, `duration`, `elapsedTime`, `remainingTime`.
- Temperatures: `temperature.current`, `temperature.target`, `temperature.sensorHealth`, `temperature.sensorId`.
- Hardware indicators: `hardware.heater`, `hardware.agitator`.
- Confirmation state: `waiting.waitingFor`, `waiting.canConfirm`.
- Error display: `error.code`, `error.details`.
- Water status: `liters`, `openClose`.
- Raw temperature endpoint value from `GET /temperatur/<alter>`.

## UI-sensitive behavior

These fields may influence UI status display, progress/timeline display, button enablement, warnings, or labels, but this needs verification in the UI repository:

- `waiting.canConfirm` and `waiting.waitingFor` likely drive confirmation controls.
- `currentStep.phase` and `currentStep.mode` likely drive timeline/progress/status badges.
- `currentStep.index` and `count` likely drive step navigation/progress display.
- `currentStep.remainingTime`, `elapsedTime`, and `duration` likely drive countdown/progress bars.
- `temperature.current` and `target` likely drive gauges/charts.
- `hardware.heater` and `agitator` likely drive machine-state indicators.
- `temperature.sensorHealth` may drive sensor warnings.

## Not provided by this control app

No images/cameras, preview selections, positions, lanes, or tracks were found. If the UI displays these, their source is **Needs verification** and should not be attributed to this control app without external evidence.

## UI-breaking changes

Potentially breaking changes include renaming fields, changing enum values, changing timing units, changing temperature rounding/units, changing generated procedure names/phases/modes, changing confirmation command names, or making initial empty-string statuses impossible/possible in a different way without UI handling verification.

---

# Control output data

## Status output

See `docs/codex/interfaces.md` for full JSON shape. Important values:

- `process.state`: `IDLE`, `ACTIVE`, `FINISHED`, `ABORTED`, `ERROR`.
- `currentStep.phase`: `NONE`, `MASHING_IN`, `RAST`, `MASHING_OUT`, `COOKING`, `COOLING`, `FINISHED`.
- `currentStep.mode`: `NONE`, `HEATING`, `HOLDING`, `TIMER_RUNNING`, `WAITING`, `FINISHED`, `ERROR`.
- `waiting.waitingFor`: `NONE`, `USER_CONFIRMATION`, `IODINE_TEST`, `MASHING_IN_CONFIRMATION`, `MASHING_OUT_CONFIRMATION`, `COOKING_CONFIRMATION`, `BOILING_CONFIRMATION`, `DECOCTION_CONFIRMATION`.
- `temperature.sensorHealth`: `OK`, `MISSING`, `STALE`, `INVALID_READING`, `MULTIPLE_SENSORS_FOUND`, `NOT_CONFIGURED`.
- `hardware.heater` and `hardware.agitator`: `ON`, `OFF`, or `ERROR`.

## Water output

`GET /WaterStatus` and `GET /WaterStatus/` return `{'liters': <number>, 'openClose': <bool>}`. The default/initial value is `{'liters': 0, 'openClose': false}`. Exact `liters` semantics beyond the UI display value are **Needs verification**.

## Temperature output

`GET /temperatur/<alter>` returns the current DS18B20 controller temperature, rounded whole Celsius. Initial controller temperature is 0 until a valid read.

## Logs

Status and update log lines contain local timestamp plus `Status: <json>` or `Update: <json>`. DS18B20 health/discovery and other diagnostics are also written to the same log path.

## IDs/timestamps/order

- No run/event/message IDs are generated.
- No ordering guarantee exists beyond latest in-memory state and log write order.
- `currentTime` uses `time.time()` during loops; logs use formatted local datetime. UI must not treat `currentTime` as a duration.

---

# Control risk fields

Before changing these fields or their semantics, verify backend and UI consumers.

## Highest-risk output fields

- `process.state`
- `currentStep.index`
- `currentStep.count`
- `currentStep.phase`
- `currentStep.mode`
- `currentStep.name`
- `currentStep.duration`
- `currentStep.elapsedTime`
- `currentStep.remainingTime`
- `temperature.current`
- `temperature.target`
- `temperature.sensorHealth`
- `temperature.sensorId`
- `hardware.heater`
- `hardware.agitator`
- `waiting.waitingFor`
- `waiting.canConfirm`
- `error.code`
- `error.details`
- `WaterStatus.liters`
- `WaterStatus.openClose`

## Highest-risk input/command fields

- Recipe top-level fields: `MashupTemperature`, `MashdownTemperature`, `Rasten`, `CookingTime`, `CookingTemperature`.
- Rest fields: `type`, `temperature`, `time`, `executionMode`.
- Confirm names: `Iodine`, `Mashup`, `Cooking`, `Boiling`, `Decoction`. `Wait` is a status, not a valid confirmation command.
- Command names: `start`, `StartBrewing`, `StartCooking`, `TurnOn`, `TurnOff`, `Stop`, `Speed`, `Frq`, `FillWaterAutomatic`, `FillWaterManuel`, `FillWaterManual`, `FillWaterStop`, `AgitatorInterval`.
- `AgitatorInterval` payload keys expected by mixer code.

## Risk reasons

- There are no external context files proving backend/UI tolerance for changes.
- Status has no schema version.
- Status has no event ID/sequence number.
- Water status initial value is now a stable object; any other initial empty values are Needs verification in PI control repository.
- Several values are legacy German strings or misspelled names kept for compatibility.

---

# Interfaces

## HTTP API

Safe/read endpoints:

- `GET /` returns HTTP 200 with empty JSON response body.
- `GET /Status/` returns current status snapshot or `500 {"error": ...}`.
- `GET /WaterStatus` and `GET /WaterStatus/` return current water status object or `500 {"error": ...}`.
- `GET /temperatur/<alter>` returns current temperature or `500 {"error": ...}`. The `alter` path segment is not used by the service.
- `GET /type/` returns `main.getType()`, currently `ProcedureTyps.MASHING_IN`; semantics **Needs verification**.

Workflow/control endpoints:

- `POST /Recipe/` accepts required recipe JSON and returns 201 empty body on success.
- `POST /Command/<command>:<value>` dispatches workflow and hardware commands.
- `POST /Confirm/<confirm>` sets workflow confirmation flags for concrete confirmations only (`Iodine`, `Mashup`, `Cooking`, `Boiling`, `Decoction`); `Wait` must not be sent as a confirm command.
- `PUT /Extended/<time>` extends active rest by positive integer minutes.
- `POST /next` stops the current workflow step and proceeds.
- `POST /jump/<step_name>` requests a jump to an exact procedure name.

Disabled/legacy endpoints:

- `GET /Command/<command>:<value>` returns 405 JSON error.
- `GET /Confirm/<confirm>` is not implemented and Flask returns 405.
- `PUT /temperatur/<alter>` returns 410 JSON error instructing callers to use `POST /Recipe/`.

## Command values

`BrewingService` supports:

- Workflow: `start`, `StartBrewing`, `StartCooking`.
- Heater: `TurnOn`, `TurnOff` no-value command aliases are supported; value-bearing forms such as `TurnOn:""` and `TurnOff:""` also remain supported.
- Mixer: `Stop`, `Speed` integer, `Frq` integer, `AgitatorInterval` JSON object.
- Water: `FillWaterAutomatic` positive float liters, `FillWaterManuel`, `FillWaterManual`, `FillWaterStop`.

`AgitatorInterval` payload is passed to `mixerController.start()` and the controller expects keys: `isTurnOn`, `rotationsPerMinute`, `runningTime`, `breakTime`, `isIntervalTurnOn`, and `isHeatingAndStirringTurnOn`.

## Status payload contract

Current status dict shape:

```json
{
  "elapsedTime": 0,
  "currentTime": 0,
  "process": {"state": "IDLE|ACTIVE|FINISHED|ABORTED|ERROR"},
  "currentStep": {
    "index": 1,
    "count": 4,
    "phase": "NONE|MASHING_IN|RAST|MASHING_OUT|COOKING|COOLING|FINISHED",
    "mode": "NONE|HEATING|HOLDING|TIMER_RUNNING|WAITING|FINISHED|ERROR",
    "name": "Einmaischen",
    "duration": 0,
    "elapsedTime": 0,
    "remainingTime": 0
  },
  "temperature": {
    "current": 20,
    "target": 65,
    "sensorHealth": "OK|MISSING|STALE|INVALID_READING|MULTIPLE_SENSORS_FOUND|NOT_CONFIGURED",
    "sensorId": "28-..."
  },
  "hardware": {"heater": "ON|OFF|ERROR", "agitator": "ON|OFF|ERROR"},
  "waiting": {"waitingFor": "NONE|USER_CONFIRMATION|IODINE_TEST|MASHING_IN_CONFIRMATION|MASHING_OUT_CONFIRMATION|COOKING_CONFIRMATION|BOILING_CONFIRMATION|DECOCTION_CONFIRMATION", "canConfirm": false},
  "error": {"code": null, "details": null}
}
```

No unique event ID or monotonic sequence number is generated for statuses. `currentTime` is a Unix timestamp while a timed/heating step is actively updating, but may be 0 immediately after entering a step. `elapsedTime`, `duration`, and `remainingTime` are seconds in status payloads; UI progress must use those explicit seconds-based fields instead of `currentTime`.

## Logs and diagnostics

`Logger.writeLog()` prefixes each line with local datetime formatted as `DD.MM.YYYY HH:MM:SS`, writes asynchronously to `BREWMASTER_LOG_PATH` or `Backend/Logging/log.txt`, creates parent directories, and prints failures to stderr.

---

## UI-side assumptions about control

# UI context for PI/control repository

## What the UI expects from control

- HTTP service at `http://192.168.178.37:5000/` with command and confirm subpaths.
- Recipe intake via `POST /Recipe/` returning HTTP 201.
- Brewing start via `POST /Command/StartBrewing:""` returning HTTP 200.
- Runtime status via `GET /Status/` returning structured `BrewingStatus` or legacy fallback fields.
- Availability via `GET /Available/` returning HTTP 200 when reachable.
- Temperature fallback via `GET /temperatur/0` returning a number.
- Water status via `GET /WaterStatus` or `GET /WaterStatus/` returning `{ liters, openClose }`.
- Hardware commands for water, heater, agitator speed, and agitator interval.
- Confirm endpoints for concrete waiting states only; `Wait` is display/status text, not `/Confirm/Wait`.

## UI-owned behavior

- UI decides view state, status labels, confirm-dialog visibility, recipe-to-`BrewingData` mapping, hop reminders, and finish-dialog creation.
- UI normalizes legacy and structured status response shapes.

## Control-owned behavior assumed by UI

- Status fields use seconds for `elapsedTime`, `currentStep.duration`, `currentStep.elapsedTime`, and `currentStep.remainingTime`; `currentTime` is a timestamp and must not be used as duration.
- `process.state` reaches `FINISHED`, `ABORTED`, or `ERROR` to stop polling.
- `currentStep.phase === COOKING` and `currentStep.elapsedTime` allow hop reminders.
- `waiting.waitingFor` indicates the exact confirmation type required.
- `waiting.canConfirm` tells whether the UI should enable confirmation.
- `hardware.heater === 'ON'` and `hardware.agitator === 'ON'` are meaningful for display.

Needs verification in control repository: units, socket.io event shape, exact command grammar containing `:""`, trailing slash behavior, and whether `/temperatur/0` is the intended stable temperature read route.
