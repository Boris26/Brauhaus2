# Interfaces and external contracts

## Database/backend REST endpoints

Base URL: `DatabaseURL` (`/api/database`).

Recipe scaling requires optional numeric `referenceVolume` (liters) and `referenceBrewhouseEfficiency` (percent) on `Beer`/`BeerDTO`. The UI preserves supplied import/existing-recipe values and sends defaults of `10` and `52` for recipes newly created in the UI. Database DTO validation, storage, read-back, and import extraction of the source recipe volume/efficiency are **Needs verification**. Until confirmed, legacy responses without these fields use a compatibility fallback and cannot safely distinguish an originally imported 20-/30-l basis.

| Method | Path | UI use | Payload/response expected |
|---|---|---|---|
| GET | `beers` | Load recipes | `Beer[]` |
| POST | `beer` | Create recipe | `BeerDTO` without `id`, returns `{ id, message, beer: { id } }` |
| PUT | `beer/{id}` | Update recipe | `BeerDTO` with matching `id` or no body id, returns `{ id, message, beer: { id } }`; unknown id returns `404 BEER_NOT_FOUND` |
| DELETE | `beer/{id}` | Delete recipe | no body |
| POST | `importbeer` | Import recipe JSON (Recipe Import V2) | `{ format: 'BRAUHAUS' \| 'MMUM', recipe: Record<string, unknown>, idempotencyKey: string }`, returns `RecipeImportResult` with `recipe`, `warnings`, `ingredientMappings`, `createdMasterData`, and `replayed` |
| GET | `finishedbeers` | Load finished brews | `FinishedBrew[]` |
| POST | `finishedbeer` | Create finished brew | Complete payload without `id`; backend generates the UUID and returns the created `FinishedBrew` |
| PUT | `finishedbeer` | Update finished brew | Complete `FinishedBrew` including its existing `id`; returns the updated `FinishedBrew` |
| DELETE | `finishedbeer/{id}` | Delete finished brew | no body |
| GET | `hops` | Load hops | `Hops[]` |
| POST | `hop` | Create hop | `Hops` |
| PUT | `hop/{id}` | Update hop master data | Body without `id`: `name`, `description`, `type`, numeric `alpha`; returns complete `Hops` |
| DELETE | `hop/{id}` | Delete hop | no body |
| GET | `malts` | Load malts | `Malts[]` |
| POST | `malt` | Create malt | `Malts` |
| PUT | `malt/{id}` | Update malt master data | Body without `id`: `name`, `description`, numeric `ebc`; returns complete `Malts` |
| DELETE | `malt/{id}` | Delete malt | no body |
| GET | `yeasts` | Load yeasts | `Yeasts[]` |
| POST | `yeast` | Create yeast | `Yeasts` |
| PUT | `yeast/{id}` | Update yeast master data | Body without `id`: `name`, `description`, numeric `evg`, numeric `temperature`, `type`; returns complete `Yeasts` |
| DELETE | `yeast/{id}` | Delete yeast | no body |
| GET | `additionalingredients` | Load additional ingredients | `AdditionalIngredient[]` |
| POST | `additionalingredient` | Create additional ingredient | `AdditionalIngredientCreatePayload` |
| PUT | `additionalingredient/{id}` | Update additional-ingredient master data | Body without `id`: `name`, `description`; returns complete `AdditionalIngredient` |
| DELETE | `additionalingredient/{id}` | Delete additional ingredient | no body |

## PI/control REST endpoints

Base URL: `BaseURL` (`/api/controller`), `CommandsURL` (`/api/controller/Command/`), and `ConfirmURL` (`/api/controller/Confirm/`).

| Method | Path | UI use | Success expectation |
|---|---|---|---|
| GET | `/` | Preserved PI root route, not UI-facing availability | `200`, empty JSON body |
| GET | `temperatur/0` | Current temperature fallback | `200`, numeric body |
| GET | `WaterStatus` | Water fill status | `200`, `{ filledLiters, targetLiters, openClose }`; PI control also supports `WaterStatus/` |
| GET | `Status/` | Runtime brewing status | `200`, structured or legacy status |
| GET | `Agitator/Status` | Load current production agitator state; active modes take priority over defaults | `200`, full `{ config, inputs, runtime }` detail status |
| PUT | `Agitator/Config` | Replace agitator configuration | Full `{ mode, speedPercent, runningMinutes, breakMinutes }` payload; success acknowledges only the command, while `agitator-state-changed` confirms controller state |
| GET | `Agitator/Defaults` | Load persistent agitator defaults for Settings and initial Production runtime values | `{ speed, intervalOnMinutes, intervalOffMinutes }` in percent/minutes |
| PUT | `Agitator/Defaults` | Replace persistent agitator defaults without changing runtime | Full `{ speed, intervalOnMinutes, intervalOffMinutes }`; response contains the confirmed configuration |
| POST | `Agitator/Pause` | Pause the selected active mode | `200` success |
| POST | `Agitator/Resume` | Resume the selected active mode | `200` success |
| GET | `Available/` | Availability heartbeat | `200` means available |
| POST | `Recipe/` | Send `BrewingData` | `201` |
| GET | `BrewSession` | Restore the currently running brew after the payload-free Socket.IO signal | `{ beerId, plannedVolume, plannedBrewhouseEfficiency }`; errors including `404` are propagated and do not start polling |
| POST | `Command/StartBrewing:""` | Start brew | `200` |
| POST | `Command/FillWaterAutomatic:{liters}` | Water fill | `200` |
| POST | `Command/TurnOn` | Heater on using no-value command alias | `200` |
| POST | `Command/TurnOff` | Heater off using no-value command alias | `200` |
| POST | `Command/Speed:{speed}` | Set agitator speed | `200` |
| POST | `Command/AgitatorInterval:""` | Set agitator interval body | `200` |
| POST | `next` | Advance process step | `200` |
| POST | `Confirm/{confirmState}` | Confirm concrete waiting state only (`Iodine`, `Mashup`, `Cooking`, `Boiling`, `Decoction`, `DecoctionReturned`) | `200`; `DECOCTION_RETURN_CONFIRMATION` maps to `Confirm/DecoctionReturned`; UI must not send `Confirm/Wait` |

## Audio REST endpoint

The Settings UI tests the control system's existing logical sounds through `POST /api/audio/test` with JSON `{ "sound": SoundType }`. Supported values are exactly `ALARM`, `WARNING`, `CONFIRMATION`, `REST_FINISHED`, `BREW_FINISHED`, and `SUCCESS`. HTTP 200 returns `{ "success": true, "sound": SoundType }`; invalid input returns HTTP 400 and playback errors return HTTP 500 with `{ "success": false, "error": string }`.

## System REST endpoint

The desktop header sends `POST /api/system/shutdown` without a request body only after explicit confirmation. Any successful HTTP response transitions the UI into its terminal shutdown state; the response message is not used as a control signal. The request is never retried or polled.

## Socket.io

- URL is derived from `BaseURL` by replacing leading `http` with `ws`.
- `WebSocketController` uses `socket.io-client` and subscribes to `overheat`, `brew-session-running`, and all Realtime State Contract events on one shared connection.
- On `overheat`, it calls the configured handler with `{ event: 'overheat', data }`.
- On `brew-session-running`, it calls the same configured handler with `{ event: 'brew-session-running', data }`; `data` may be absent. The UI converts this to `BREW_SESSION_RUNNING_RECEIVED`, loads `GET /BrewSession`, reconstructs the scaled recipe, and starts the existing status poll if it is not already running.
- The production epic maps the controller's structured handler object directly and ignores unknown event names.
- `agitator-defaults-changed` carries the complete persistent `{ speed, intervalOnMinutes, intervalOffMinutes }` snapshot on the same default-namespace connection; it updates Settings without a follow-up GET and remains separate from runtime agitator state.
- The same shared connection reports `connect` as `{ connected: true, socketId: socket.id }` and `disconnect` as `{ connected: false, socketId: undefined }` through the production Redux flow. The Socket.IO ID is transient diagnostic data only; the UI does not persist it or use it as a client/device identity.
- When this client starts a brew, it sends that transient default-namespace SID as optional `X-Socket-ID` on `POST Command/StartBrewing:""`. The header is omitted while disconnected. This lets the controller suppress only the initiating client's `brew-session-running` notification; the successful REST response starts that client's polling instead.

## Normalized brewing status expected by UI

`BrewingStatus` is exclusively the process model returned by the one-second `GET /Status/` poll:

```ts
interface BrewingStatus {
  elapsedTime: number;
  process: { state: 'IDLE' | 'ACTIVE' | 'FINISHED' | 'ABORTED' | 'ERROR' };
  currentStep: {
    index?: number; count?: number;
    phase: 'NONE' | 'MASHING_IN' | 'RAST' | 'DECOCTION' | 'MASHING_OUT' | 'COOKING' | 'COOLING' | 'FINISHED';
    mode: 'NONE' | 'HEATING' | 'HOLDING' | 'TIMER_RUNNING' | 'WAITING' | 'FINISHED' | 'ERROR';
    name?: string; duration?: number; elapsedTime?: number; remainingTime?: number; type?: string;
  };
  temperature: { current?: number; target?: number };
  heating?: { followsDecoction?: boolean };
  waiting: { waitingFor: WaitingFor; canConfirm: boolean };
  error: { code?: string | null; details?: string | null };
}
```

`RealtimeControllerState` is the separate event-oriented hardware, alarm, and sensor model. Heater running feedback, agitator output, alarms, and temperature-sensor health have no polling fallback. Legacy normalization remains only for independent process fields such as temperature, phase, mode, waiting, index, and elapsed time.

## PI/control Web Push endpoints

Additional controller API endpoints expected by the PWA:

| Method | Path | Payload/response expected |
|---|---|---|
| GET | `/push/public-key` | `200 { "publicKey": "<VAPID_PUBLIC_KEY>" }`; never returns the private key |
| POST | `/push/subscriptions` | Browser `PushSubscription` JSON; idempotently stores by endpoint |
| DELETE | `/push/subscriptions` | `{ "endpoint": "..." }`; removes the stored subscription for that endpoint |
| POST | `/push/test` | Sends a test notification to registered subscriptions |

These paths are consumed through the existing relative UI base URL `/api/controller`. Backend implementation, durable storage, and process-state event detection are **Needs verification** in the PI/control repository.

### Realtime State Contract v1

The exact events `heating-running-changed`, `agitator-state-changed`, `alarm-state-changed`, and `temperature-sensor-state-changed` use the existing shared connection. The temperature snapshot is `{ current: number | null, health: 'OK' | 'MISSING' | 'STALE' | 'INVALID_READING' | 'MULTIPLE_SENSORS_FOUND' | 'NOT_CONFIGURED', sensorId: string | null }`. Numeric zero is valid; `null` means that no valid reading exists. Alarm arrays replace rather than merge state. Socket disconnect makes received hardware state stale. The controller sends a fresh temperature snapshot to new and reconnected clients; end-to-end behavior on hardware **Needs verification**.

The Production interval indicator is prepared to consume an optional controller-owned `intervalProgressPercent` (number, clamped by the UI to `0..100`) in `GET Agitator/Status.runtime` and `agitator-state-changed`. The currently confirmed controller contract does not provide a phase position, elapsed duration, or start timestamp. Until the controller supplies and resends this value on connect/reconnect, the UI deliberately renders a static, muted ring instead of starting a local timer. Adding and populating this field in Braumeister is **Needs verification**.
