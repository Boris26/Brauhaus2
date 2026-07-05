# UI risk fields for backend/control changes

Changing these fields or meanings can break UI behavior.

## Database/backend risk fields

- `Beer.id`: selection, deletion, brew selection, PDF export matching, finished brew linkage.
- `Beer.name`: visible title and finished brew name.
- `Beer.type`, `color`, `alcohol`: table sorting/display.
- `Beer.fermentation[].type`: strings `Einmaischen`, `Abmaischen`, and `Kochen` are significant in production mapping.
- `Beer.fermentation[].temperature`, `time`, `executionMode`: production validation and payload.
- `Beer.cookingTime`, `cookingTemperatur`: required for `BrewingData`.
- `Beer.wortBoiling.hops[].time`, `name`: hop reminders.
- Ingredient casing: `ebc` vs `EBC`, `evg` vs `EVG`, `alpha` string vs number.
- `FinishedBrew.id`, `state`, `brewValues`, `beer_id`, `startDate`, `endDate`.

## PI/control risk fields

- `process.state`: controls labels and polling termination.
- `currentStep.phase`: controls labels, hop reminders, mobile type, process display.
- `currentStep.mode`: controls waiting dialog, progress, flames/heating status.
- `currentStep.index`: process list highlighting.
- `currentStep.elapsedTime`: hop reminders.
- `currentStep.remainingTime` and `currentTime`: countdown/progress.
- `temperature.current` and `temperature.target`: gauges/mobile values.
- `hardware.heater` and `hardware.agitator`: flame and agitator display.
- `waiting.waitingFor` and `waiting.canConfirm`: confirm dialog and confirm endpoint.
- Legacy fallback fields if structured fields are omitted: `Temperature`, `TargetTemperature`, `Type`, `WaitingStatus`, `HeatUpStatus`, `HeatingStates`, `AgitatorStatus`, `Name`, `index`.

