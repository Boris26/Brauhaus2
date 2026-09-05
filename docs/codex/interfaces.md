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

`BrewingStatus` is exclusively the authoritative process model returned immediately when polling starts and then every ten seconds by `GET /Status/`. Timed-step displays may interpolate elapsed and remaining step time locally between responses, but every response replaces that display projection and only the controller can declare step or process-state transitions:

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

`RealtimeControllerState` is the separate event-oriented hardware, alarm, and sensor model. Heater running feedback, agitator output, alarms, and temperature-sensor health have no polling fallback and are not slowed by the brewing-status interval. Water filling also retains its independent one-second `WaterStatus` poll. Legacy normalization remains only for independent process fields such as temperature, phase, mode, waiting, index, and elapsed time.

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

## Operational settings and heater-safety contract (Brauhaus2 #230/#231)

The controller owns all defaults and validation. The UI loads the complete snapshot with `GET /Settings`; no operational value is initialized from a UI default. `GET /Settings/{section}` remains available for `waterFilling`, `audio`, `processSafety`, and `heaterSafety`. A section is replaced with `PUT /Settings/{section}` using its complete payload, and the returned persisted section becomes confirmed UI state without a refetch.

| Section | Complete fields and units |
|---|---|
| `waterFilling` | `pulsesPerLiter` (impulses/liter), `sensorStartDelaySeconds` (seconds) |
| `audio` | `enabled` (boolean), `confirmationRepeatSeconds` (seconds), `alarmRepeatSeconds` (seconds) |
| `processSafety` | `heatingTimeoutMinutes` (minutes), `confirmationTimeoutMinutes` (minutes); zero disables the respective time limit |
| `heaterSafety` | `offGracePeriodSeconds` (seconds), `maxOffTemperatureRise` (degrees Celsius), `riseObservationWindowSeconds` (seconds) |

The controller still exposes `GET /Safety/Heater` and `POST /Safety/Heater/Reset`, each returning `{ state, latched }`; `state` is one of `DISARMED`, `HEATING`, `OVERSHOOT_GRACE`, `MONITORING`, `SUSPENDED`, or `HEATER_STUCK_ON`. The current UI does not use the safety-state GET as a Settings-page status source. Runtime alarm visibility is owned by the connected `alarm-state-changed` snapshot. An active `HEATER_STUCK_ON` opens one non-dismissible app-wide dialog above all desktop/mobile views. Its only action calls `POST /Safety/Heater/Reset`; request failure leaves the dialog open, and successful HTTP response does not hide it locally. The dialog closes only after the controller's global alarm snapshot no longer contains active `HEATER_STUCK_ON`. Settings exposes only the persistent heater-safety configuration and no reset button.

The complete `alarm-state-changed` snapshot may add the independent alarm type `HEATER_STUCK_ON`; it is never inferred from legacy overheat state. Existing `EQUIPMENT_ALARM` behavior is preserved. An active realtime `HEATER_STUCK_ON` blocks a normal brew start.

Push payloads may add backend-owned `severity: 'INFO' | 'WARNING' | 'ALARM'`. The service worker preserves legacy payload behavior when severity is absent and uses browser-supported notification options to make `ALARM` more prominent. It does not infer severity.

The Settings UI intentionally exposes none of the controller infrastructure fields: temperature tolerance/hysteresis, relay timing, buzzer, GPIO/pins/mode/warnings/debounce, host/port/threading, ALSA/player/sound paths, VAPID secrets, or subscription files. Temperature sensor ID is controller-discovered realtime diagnostic data and remains read-only.

## Interrupted-brew recovery (BeerDataStore #40 / Braumeister #146 / Brauhaus2 #246)

The existing default-namespace Socket.IO connection also consumes `brew-recovery-state-changed`. Its replacement payload is `{ available: false, recovery: null }` or `{ available: true, recovery: { version, brewSession, status, updatedAt } }`. `brewSession` uses the existing `beerId`, liter-valued `plannedVolume`, and percent-valued `plannedBrewhouseEfficiency`; recovery status contains only the saved process/current-step/waiting/heating snapshot required for display. Durations are controller-owned seconds.

The control command endpoints are `POST /BrewRecovery/Resume` with normal `BrewingData`, and `DELETE /BrewRecovery`. HTTP success acknowledges a command only. Only the existing `brew-session-running` event confirms that the process runs and triggers `GET /BrewSession` plus the existing status polling restoration.

## Fermentation contract (Brauhaus2 #249 / BeerDataStore #42)

BeerDataStore is the sole persistent source of truth. Brauhaus2 combines `GET fermentation/beers/{finishedBeerId}/recipe-actions` and `GET fermentation/beers/{finishedBeerId}/measurements`; it writes measurements to the matching `/measurements` route and completes/skips actions through `/recipe-actions/{actionId}/complete|skip`. Completion identity is always the pair `FinishedBrew.id` plus `actionId`. Existing device and sensor routes remain separate. Their deployed availability is **Needs verification** against BeerDataStore #42.

Temperatures are Celsius, Plato values are degrees Plato, timestamps are ISO-8601, and `windowSeconds` is seconds. Server `bubbleRatePerMinute` wins; otherwise the UI derives `bubbleCount * 60 / windowSeconds`. Persisted action states are `PENDING`, `COMPLETED`, and `SKIPPED`; `due` is a backend projection. Error envelopes, online threshold, and device-route deployment **Needs verification**.

## Finished-brew lifecycle and recipe-action additions

Normal state values are exactly `FERMENTATION`, `MATURATION`, and `FINISHED`. UI transitions are `FERMENTATION -> MATURATION | FINISHED` and `MATURATION -> FINISHED`; BeerDataStore is authoritative and may reject stale/invalid writes with HTTP 409 and code `INVALID_FINISHED_BEER_TRANSITION`. Unknown historic state strings are rendered defensively and are not offered as transitions.

Dry-hop and fermentation-phase additional-ingredient DTOs use one Recipe Action Contract: `actionId`, `triggerType`, `triggerValue`, `triggerUnit`, `contactTime`, and `contactTimeUnit`. Trigger types are `TIME_OFFSET | PLATO_THRESHOLD | MANUAL`; units are `MINUTES | HOURS | DAYS | PLATO`, while contact time accepts only the three time units. `PLATO_THRESHOLD` always uses `PLATO`, and `MANUAL` has no value/unit. Existing `Hop.time/timeUnit` retains boil/whirlpool semantics. Old browser form state containing `triggerOffset` or `triggerPlato` is read only by the explicit legacy normalizer and is never written back.

`FinishedBrew.fermentationStartedAt` is the optional, timezone-bearing canonical basis for `TIME_OFFSET`; it is not inferred from `startDate`. The normal production-completion workflow sets it to the current ISO-8601 instant, while legacy/manual records may leave it absent. Complete PUT payloads preserve the value unchanged.

Runtime actions retain the API field `actionId` (never silently renamed to `id`) and contain `sourceType`, `name`, `amount`, `unit`, the generic trigger/contact fields, `status`, `due`, `completedAt`, `skippedAt`, `contactEndsAt`, and `latestPlato`. `contactEndsAt` and `due` are backend-owned projections. Only the separately retained device/sensor route deployment and exact error envelopes remain **Needs verification**.
