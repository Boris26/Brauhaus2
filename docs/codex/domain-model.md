# Domain model

## Beer recipe (`Beer`)

Visible/used fields include:

- Identity/display: `id`, `name`, `type`, `color`, `description`, `rating`.
- Metrics: `alcohol`, `originalwort`, `bitterness`, `mashVolume`, `spargeVolume`, `cookingTime`, `cookingTemperatur`.
- Production steps: `fermentation: FermentationSteps[]` where step `type` names `Einmaischen`, `Abmaischen`, and regular rests are significant.
- Ingredients: `malts`, `wortBoiling.hops`, `fermentationMaturation.yeast`, optional `additionalIngredients`.

`BeerDTO` differs from `Beer` for submission: `fermentationSteps` instead of `fermentation`, ingredient DTOs, and nullable `wortBoiling`/`fermentationMaturation`.

## Production recipe (`BrewingData`)

The PI/control payload is:

- `MashdownTemperature`: from recipe step `Abmaischen.temperature`.
- `MashupTemperature`: from recipe step `Einmaischen.temperature`.
- `CookingTemperature`: from `beer.cookingTemperatur`.
- `CookingTime`: from `beer.cookingTime`.
- `Rasten`: normalized fermentation steps excluding fixed process step types `Einmaischen`, `Abmaischen`, and `Kochen`, unless a step uses `executionMode: CONFIRMATION_HOLD`.

Validation rejects missing/non-positive temperatures and timed rests without `time > 0`.

## Brewing runtime status

Runtime status is normalized into process state, current step, temperature, hardware, waiting, and error groups. UI behavior depends on:

- `process.state`: controls active/finished/aborted/error labels and polling termination.
- `currentStep.phase`: drives labels, hop reminders, mobile type display, and process display.
- `currentStep.mode`: distinguishes heating, holding, timer, waiting, finished/error.
- `currentStep.index`: highlights process list step.
- `currentStep.name`: progress display label.
- `currentStep.elapsedTime`: cooking-phase hop reminders.
- `currentStep.duration`, `currentStep.elapsedTime`, and `currentStep.remainingTime`: duration/progress/countdown values in seconds. `currentTime` is preserved in collected status data but must not be used as a duration/countdown unless the PI control contract changes.
- `temperature.current`/`target`: gauges and mobile display.
- `hardware.heater`/`agitator`: flames, water-control agitator visual, mobile agitator display.
- `waiting.waitingFor`/`canConfirm`: modal content and confirm endpoint mapping.

## Finished brew (`FinishedBrew`)

Fields: `id`, `name`, `startDate`, optional `endDate`, `liters`, `originalwort`, nullable `residual_extract`, `note`, `active`, optional `beer_id`, `state`, optional `brewValues`.

`state` values are `FERMENTATION`, `MATURATION`, and `FINISHED`, with German labels `Hauptgärung`, `Reifung`, and `Fertig`.

## Ingredients

- `Hops`: `id`, `name`, `type`, `alpha`, `description`.
- Recipe hop entries: `id`, `name`, `description`, numeric `alpha`, `quantity`, `time`, optional `usage`, optional `timeUnit`.
- `Malts`: `id`, `name`, `description`, `ebc`; recipe malt uses uppercase `EBC` and `quantity`.
- `Yeasts`: `id`, `name`, `description`, `temperature`, `type`, `evg`; recipe yeast uses `EVG`, `temperature`, `type`, and `quantity`.
- `AdditionalIngredient`: `id`, `name`, optional `description`; recipe additional ingredient has `quantity`, `unit`, `phase`, optional `time`, `timeUnit`, `description`.

Needs verification: backend/database canonical casing for malt `ebc` vs recipe malt `EBC`, yeast `evg` vs recipe yeast `EVG`, and hop `alpha` string vs number.

