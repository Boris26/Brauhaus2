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

