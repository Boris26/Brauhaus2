# Cross-repository contracts

## Purpose

These rules tell Codex when a change in one repository may break another repository.

Codex must check this file before changing API-facing, UI-visible, database-facing, or generated control data.

## UI ↔ Database/backend

The React UI consumes database/backend data for:

- beer recipes,
- finished brews,
- ingredient master data,
- imported recipe data.

The database/backend owns:

- persistent IDs,
- stored recipe fields,
- finished-brew records,
- ingredient master data,
- response shapes,
- database defaults and derived values.

Before changing any database/backend field or endpoint, check whether the UI uses it for:

- table display,
- selection,
- deletion,
- finished-brew linkage,
- recipe-to-control mapping,
- ingredient forms,
- production start,
- PDF/export/shopping-list behavior.

### High-risk UI/database fields

- `Beer.id`
- `Beer.name`
- `Beer.type`
- `Beer.color`
- `Beer.alcohol`
- `Beer.cookingTime`
- `Beer.cookingTemperatur`
- `Beer.fermentation` / `fermentationSteps`
- `Beer.fermentation[].type`
- `Beer.fermentation[].temperature`
- `Beer.fermentation[].time`
- `Beer.fermentation[].executionMode`
- `Beer.wortBoiling.hops[].name`
- `Beer.wortBoiling.hops[].time`
- `FinishedBrew.id`
- `FinishedBrew.beer_id`
- `FinishedBrew.name`
- `FinishedBrew.state`
- `FinishedBrew.brewValues`
- `FinishedBrew.startDate`
- `FinishedBrew.endDate`

## UI ↔ PI control

The PI control app produces runtime/control data that the UI displays and uses for workflow behavior.

Before changing control output, check whether the UI uses it for:

- status labels,
- production polling,
- countdown/progress,
- hop reminders,
- waiting/confirmation dialogs,
- heater/flame display,
- agitator display,
- water fill display,
- online/offline state.

### High-risk UI/control fields

- `process.state`
- `currentStep.index`
- `currentStep.count`
- `currentStep.phase`
- `currentStep.mode`
- `currentStep.name`
- `currentStep.duration`
- `currentStep.elapsedTime`
- `currentStep.remainingTime`
- `currentTime`
- `elapsedTime`
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

## Known compatibility conflicts

### Finished beer update

- UI currently documents/calls update through `POST finishedbeer`.
- Database documentation says update is `PUT /finishedbeer`.

Until this is resolved, do not change finished-brew update behavior without checking both repositories.

### Control availability endpoint

- UI expects `GET /Available/`.
- PI control documentation does not list `/Available/`.

Until this is resolved, do not remove or rename availability checks and verify deployed control behavior.

### Status `currentTime`

- UI documentation says `currentTime` behaves like seconds.
- PI control documentation says `currentTime` is a Unix timestamp during active updates and may be `0`.

Do not change time fields without checking UI progress/countdown code.

### `WaterStatus`

- UI expects `{ liters, openClose }`.
- PI control documentation says initial value can be an empty string.

UI must tolerate startup/empty status, or the control app must guarantee a stable object. Do not change this silently.

### `POST /beer` response

- UI documentation expects a created/imported `Beer`.
- Database documentation says `POST /beer` returns only a message.

Do not rely on this response without checking actual UI code and backend behavior.

## Compatibility rule

If a changed field, endpoint, enum, unit, or response shape is listed in this file or in `docs/codex/external/`, Codex must:

1. identify the affected repository,
2. explain the compatibility impact,
3. preserve backward compatibility where possible,
4. update the related Codex documentation,
5. mark unresolved cross-repo work as `Needs verification`.
