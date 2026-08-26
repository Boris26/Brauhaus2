# Domain model

## Beer recipe (`Beer`)

Visible/used fields include:

- Identity/display: `id`, `name`, `type`, `color`, `description`, `rating`.
- Metrics: `alcohol`, `originalwort`, `bitterness`, `mashVolume`, `spargeVolume`, `cookingTime`, `cookingTemperatur`.
- New recipes initialize `cookingTemperatur` to `100` °C in the recipe UI. Existing and imported values are preserved. The read-only `Kochen` row derives its display from this top-level form value; the persisted fixed step is synchronized from it only when the existing recipe DTO is submitted.
- Production steps: `fermentation: FermentationSteps[]` where `procedureType` classifies mash steps as `RAST` or `DECOCTION`; freely configurable steps have a UI-generated stable UUID `stepId`, and every decoction references exactly one normal rest through `relatedRastId`. Legacy `CONFIRMATION_HOLD` steps without a procedure type normalize to `DECOCTION`; missing legacy IDs are generated in the UI model and a missing decoction reference is migrated only to the last preceding RAST. Step `type` remains the display name.
- Recipe-editor mash plans defensively contain exactly one each of the fixed `Einmaischen`, `Abmaischen`, and `Kochen` steps. `Einmaischen` and `Abmaischen` carry temperature but no UI-generated `time`; whether the database/backend accepts an omitted `time` for these persisted fixed steps is **Needs verification**.
- Recipe-editor validation requires every normalized `DECOCTION` to have a `relatedRastId` that resolves to the `stepId` of an existing non-fixed `RAST`. Choosing the relationship repositions the decoction directly after its rest (after already-associated decoctions), while retaining stable IDs and relative decoction order.
- Ingredients: `malts`, `wortBoiling.hops`, `fermentationMaturation.yeast`, optional `additionalIngredients`.

`BeerDTO` differs from `Beer` for submission: `fermentationSteps` instead of `fermentation`, ingredient DTOs, and nullable `wortBoiling`/`fermentationMaturation`.

## Production recipe (`BrewingData`)

The PI/control payload is:

- `MashdownTemperature`: from recipe step `Abmaischen.temperature`.
- `MashupTemperature`: from recipe step `Einmaischen.temperature`.
- `CookingTemperature`: from `beer.cookingTemperatur`, with UI fallback `99` °C only when the stored cooking temperature is missing or invalid.
- `CookingTime`: from `beer.cookingTime`.
- `Rasten`: normalized fermentation steps excluding fixed process step types `Einmaischen`, `Abmaischen`, and `Kochen`. Normal rests are sent with `stepId` and `procedureType: RAST`; decoctions use `stepId`, `relatedRastId`, `procedureType: DECOCTION`, and `executionMode: CONFIRMATION_HOLD` and omit both `temperature` and `time`. Control-side resolution of `relatedRastId` to the referenced RAST temperature **Needs cross-repository update**.

Validation rejects missing/non-positive mash-in, mash-out, and rest temperatures and timed rests without `time > 0`; missing/invalid top-level cooking temperature is not rejected and maps to the UI fallback `99` °C.

## Brewing runtime status

Runtime status is normalized into process state, current step, temperature, hardware, waiting, and error groups. UI behavior depends on:

- `alarms`: a normalized list of `{ type, active }` control alarms. A missing legacy field becomes `[]`. The desktop production UI evaluates only an explicitly active `EQUIPMENT_ALARM`, shows it in the existing modal system, and prioritizes its text in the existing header status display; unknown alarm types remain ignored.

- `process.state`: controls active/finished/aborted/error labels and polling termination.
- `currentStep.phase`: drives labels, hop reminders, mobile type display, and process display.
- `currentStep.mode`: distinguishes heating, holding, timer, waiting, finished/error.
- `currentStep.index`: highlights process list step.
- `currentStep.name`: progress display label.
- `currentStep.elapsedTime`: cooking-phase hop reminders.
- `currentStep.duration`, `currentStep.elapsedTime`, and `currentStep.remainingTime`: duration/progress/countdown values in seconds. `currentTime` is preserved in collected status data but must not be used as a duration/countdown unless the PI control contract changes.
- `temperature.current`/`target`: gauges and mobile display.
- `hardware.heater`/`agitator`: flames, water-control agitator visual, mobile agitator display.
- `waiting.waitingFor`/`canConfirm`: central inline confirmation content and confirm endpoint mapping for desktop and mobile. `MASHING_OUT_CONFIRMATION` uses the existing `Confirm/Mashup` control confirmation value. Generic or unknown waiting values are displayed without an action button.

## Finished brew (`FinishedBrew`)

Fields: `id`, `name`, `startDate`, optional `endDate`, `liters`, `originalwort`, nullable `residual_extract`, `note`, `active`, optional `beer_id`, `state`, optional `brewValues`.

`state` values are `FERMENTATION`, `MATURATION`, and `FINISHED`, with German labels `Hauptgärung`, `Reifung`, and `Fertig`.

## Ingredients

- `Hops`: `id`, `name`, `type`, `alpha`, `description`.
- Recipe hop entries: `id`, `name`, `description`, numeric `alpha`, `quantity`, optional `time`, optional `usage`, optional `timeUnit`. BRAUHAUS-v1 hop usage values are `FIRST_WORT`, `BOIL`, `WHIRLPOOL`, and `DRY_HOP`; a supplied time requires one of `MINUTES`, `HOURS`, or `DAYS`, while an untimed addition has no unit. Missing legacy `usage` remains `BOIL`.
- `Malts`: `id`, `name`, `description`, `ebc`; recipe malt uses uppercase `EBC` and `quantity`.
- `Yeasts`: `id`, `name`, `description`, `temperature`, `type`, `evg`; recipe yeast uses `EVG`, `temperature`, `type`, and `quantity`.
- `AdditionalIngredient`: `id`, `name`, optional `description`; recipe additional ingredient has `quantity`, `unit`, `phase`, optional `time`, `timeUnit`, `description`.

Needs verification: backend/database canonical casing for malt `ebc` vs recipe malt `EBC`, yeast `evg` vs recipe yeast `EVG`, and hop `alpha` string vs number.
