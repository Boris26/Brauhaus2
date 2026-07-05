# UI-visible backend/control data

## From database/backend

Visible recipe fields:

- `Beer.name`, `type`, `color`, `alcohol` in recipe table.
- Recipe details use recipe metrics, description, fermentation steps, malts, hops, yeast, and additional ingredients.
- `Beer.id` drives row selection, deletion, shopping-list export matching, and `beer_id` in finished brew.
- `Beer.cookingTime`, `cookingTemperatur`, and fermentation steps drive production recipe mapping.
- `wortBoiling.hops[].name` and `time` drive hop reminder dialogs.

Visible finished-brew fields:

- `FinishedBrew.name`, dates, liters, original wort, residual extract, note, active flag, state, optional `brewValues` for chart/export behavior.

Visible ingredient fields:

- Hops, malts, yeasts, and additional ingredient names/descriptions/metrics appear in ingredient forms and recipe forms.

## From PI/control

Visible runtime status fields:

- Current and target temperature.
- Current phase/type/name.
- Waiting yes/no and status label.
- Heating yes/no.
- Agitator on/off.
- Elapsed time and target/current time.
- Process status labels for idle, active, finished, aborted, and error.
- Hardware heater state drives flame animation.
- Water liters drives water display and water gauge.
- Backend/control availability displays as Online/Offline.


## PI control visible status notes

- Water display uses `WaterStatus.liters` from a `{ liters, openClose }` object and should fall back safely to `0` if a request fails.
- Waiting dialogs may display generic waiting/status text, but confirmation actions are only enabled for concrete PI control confirmation types.
- Production elapsed/target time displays use seconds-based status fields (`elapsedTime` and `currentStep.duration`), not `currentTime`.

## Final PI-control visible data contract

- Availability display is based on `GET /Available/`.
- Water UI consumes object-shaped `WaterStatus`; failures fall back to `0` liters and `openClose: false`.
- Confirmation UI can display waiting status text, but concrete confirm actions exist only for `Iodine`, `Mashup`, `Boiling`, `Cooking`, and `Decoction`.
