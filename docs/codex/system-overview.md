# System overview

## Responsibility split

### UI repository responsibilities

- Render beer recipe, ingredient, finished-brew, calculations, settings, mobile, and production views.
- Hold client-side UI state in Redux and local component state.
- Convert selected beer recipes into the brewing-control `BrewingData` payload.
- Display normalized runtime brewing status and status dialogs.
- Dispatch HTTP commands to backend/database and brewing-control APIs.
- Persist only the selected theme in localStorage.

### Backend/database application responsibilities inferred from UI calls

The UI expects a database/backend service at `DatabaseURL` to own persistent recipe and ingredient data:

- Beer recipes (`beers`, `beer`, `beer/{id}`, `importbeer`).
- Finished brews (`finishedbeers`, `finishedbeer`, `finishedbeer/{id}`).
- Hops, malts, yeasts, and additional ingredients.

Needs verification in backend repository: persistence rules, validation rules, create-vs-update semantics for `POST finishedbeer`, import response schema, ordering guarantees for `GET beers`, and whether IDs are strings or numbers for every entity.

### PI/control application responsibilities inferred from UI calls

The UI expects a brewing-control service at `BaseURL`/`CommandsURL`/`ConfirmURL` to own hardware and runtime process behavior:

- Current temperature, water status, brewing status, and availability.
- Accepting mapped recipe payloads.
- Starting brewing and advancing workflow steps.
- Hardware commands for water filling, heater, agitator speed, and agitator interval.
- Confirmation commands for waiting states.
- Socket.io `overheat` event.

Needs verification in PI/control repository: exact command syntax, status schema, whether trailing slashes are required, whether temperature alter `0` is fixed, socket.io payload shape, safety behavior, and units.

## Runtime topology

The UI has hard-coded LAN addresses in `src/global.ts`:

- Database/backend: `http://192.168.178.72:5000/`.
- Brewing control base: `http://192.168.178.37:5000/`.
- Brewing control commands: `http://192.168.178.37:5000/Command/`.
- Brewing control confirmations: `http://192.168.178.37:5000/Confirm/`.

No `.env`-based URL configuration was found in inspected source. Changing deployment target currently requires source/config changes.

## High-level UI flows

1. App starts, resolves and applies theme, renders desktop or mobile shell.
2. Desktop index dispatches backend availability polling.
3. Recipe main view fetches beers and selects the last beer returned as default.
4. User marks a recipe as the beer to brew.
5. Production view maps the selected recipe into `BrewingData`, sends it to control, starts brewing, then polls status every second until terminal state.
6. Runtime status updates drive progress display, confirm dialogs, timeline grouping, hop-addition reminders, finish dialog, and saved finished-brew records.
7. Finished brew completion stores collected status samples as JSON in `FinishedBrew.brewValues`.

