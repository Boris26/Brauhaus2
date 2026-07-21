# Final UI ↔ PI Control Compatibility Report

## Executive Summary

The React UI and PI control application are compatible for the finalized availability, water status, command, confirmation, and process timing contracts documented here.

The UI-facing availability endpoint is `GET /Available/`; PI control also preserves `GET /` as an existing root route. Water status is stable as an object from both `GET /WaterStatus` and `GET /WaterStatus/`, and the UI defensively normalizes failed or malformed water responses to `{ "filledLiters": 0, "targetLiters": 0, "openClose": false }`. Heater commands use the no-value aliases `POST /Command/TurnOn` and `POST /Command/TurnOff`, while value-bearing command routes such as `StartBrewing:""` and `AgitatorInterval:""` remain valid.

`Wait` is status-only. The UI must not call `POST /Confirm/Wait`; PI control must reject that route with a controlled error. The UI only sends concrete confirmations (`Iodine`, `Mashup`, `Boiling`, `Cooking`, `Decoction`) and does not dispatch a confirm request when only a generic waiting state is known.

`currentTime` is a PI-control Unix timestamp in seconds from `time.time()`. The UI must not use it as duration, countdown, elapsed process time, or progress. UI progress and timing display use explicit process/step fields such as `elapsedTime`, `currentStep.duration`, and `currentStep.remainingTime`.

## Confirmed Fixed Issues

| Area | Previous issue | Final contract | Status |
|---|---|---|---|
| Availability | `/Available/` was previously documented as uncertain. | `GET /Available/` is the UI-facing availability endpoint; `GET /` remains preserved as an existing PI route. | Confirmed fixed; UI usage verified in code, PI support verified by counterpart repository. |
| WaterStatus route | UI called `/WaterStatus` while PI docs previously emphasized `/WaterStatus/`. | PI supports both `GET /WaterStatus` and `GET /WaterStatus/`. | Confirmed fixed; UI usage verified in code, PI support verified by counterpart repository. |
| WaterStatus shape | Startup or malformed water status could be unclear. | Successful responses are always objects; default shape is `{ "filledLiters": 0, "targetLiters": 0, "openClose": false }`; UI normalizes null, malformed, failed, and non-200 responses. | Confirmed fixed; UI behavior verified in code/tests, PI support verified by counterpart repository. |
| Heater commands | No-value `TurnOn`/`TurnOff` aliases were previously unclear. | UI may call `POST /Command/TurnOn` and `POST /Command/TurnOff`; PI also preserves value-bearing aliases `TurnOn:""` and `TurnOff:""`. | Confirmed fixed; UI usage verified in code/tests, PI support verified by counterpart repository. |
| StartBrewing command | Existing empty-value syntax needed to remain stable. | `POST /Command/StartBrewing:""` remains supported. | Confirmed fixed; UI usage verified in code/tests, PI support verified by counterpart repository. |
| AgitatorInterval command | URL/body split needed clarification. | `POST /Command/AgitatorInterval:""` remains supported; actual configuration values are sent in the JSON request body. | Confirmed fixed; UI usage verified in code/tests, PI support verified by counterpart repository. |
| `/Confirm/Wait` | UI could previously map unknown waiting reasons to `Confirm/Wait`. | `Wait` is status-only; UI must not send it; PI must reject `POST /Confirm/Wait` with a controlled error. | Confirmed fixed; UI prevention verified in code/tests, PI rejection verified by counterpart repository. |
| Concrete confirmations | Confirmation command set needed to be explicit. | Valid confirmation values are `Iodine`, `Mashup`, `Boiling`, `Cooking`, and `Decoction`. | Confirmed fixed; UI mapping verified in code/tests, PI support verified by counterpart repository. |
| `currentTime` | UI previously treated `currentTime` as duration/progress. | `currentTime` is Unix timestamp seconds from `time.time()` and must not be used as duration/countdown/progress. | Confirmed fixed; UI timing behavior verified in code/tests, PI meaning verified by counterpart repository. |

## Endpoint Contract

| Method | Path | Owner | UI usage | PI support | Compatibility status |
|---|---|---|---|---|---|
| GET | `/Available/` | PI control | UI calls through `checkIsBackendAvailable()` and treats HTTP 200 as online; failures become offline/unavailable. | Verified by counterpart repository. | Compatible. |
| GET | `/` | PI control | UI does not call this route. | Preserved existing route; verified by counterpart repository. | Compatible; not UI-facing. |
| GET | `/WaterStatus` | PI control | UI calls this path and expects/normalizes `{ filledLiters, targetLiters, openClose }`. | Verified by counterpart repository. | Compatible. |
| GET | `/WaterStatus/` | PI control | UI does not currently call this path, but it is accepted by PI for slash compatibility. | Verified by counterpart repository. | Compatible. |
| GET | `/Status/` | PI control | UI polls brewing status and normalizes structured/legacy fields; polling stops on terminal states. | Verified by counterpart repository. | Compatible; initial empty `Status` remains open if not covered by structured/default status. |
| GET | `/temperatur/0` | PI control | UI uses this as current-temperature fallback and returns `0` on failure. | Current route verified by counterpart repository; long-term route stability remains open. | Compatible now; stability Needs verification. |
| POST | `/Recipe/` | PI control | UI sends `BrewingData` and expects HTTP 201 before starting brewing. | Verified by counterpart repository. | Compatible. |
| POST | `/Command/TurnOn` | PI control | UI sends no request body and expects HTTP 200. | Verified by counterpart repository. | Compatible. |
| POST | `/Command/TurnOff` | PI control | UI sends no request body and expects HTTP 200. | Verified by counterpart repository. | Compatible. |
| POST | `/Command/TurnOn:""` | PI control | UI does not call this value-bearing alias. | Preserved by PI; verified by counterpart repository. | Compatible as backwards-compatible route. |
| POST | `/Command/TurnOff:""` | PI control | UI does not call this value-bearing alias. | Preserved by PI; verified by counterpart repository. | Compatible as backwards-compatible route. |
| POST | `/Command/StartBrewing:""` | PI control | UI calls this after accepted recipe; body ignored; HTTP 200 starts status polling. | Verified by counterpart repository. | Compatible. |
| POST | `/Command/FillWaterAutomatic:{liters}` | PI control | UI sends liters in the path and expects HTTP 200. | Verified by counterpart repository for route support; `liters` is the requested amount sent to the controller. | Compatible. |
| POST | `/Command/Speed:{speed}` | PI control | UI sends numeric speed in the path and expects HTTP 200. | Verified by counterpart repository. | Compatible. |
| POST | `/Command/AgitatorInterval:""` | PI control | UI sends command in path and real settings in JSON body. | Verified by counterpart repository. | Compatible. |
| POST | `/Confirm/Iodine` | PI control | UI sends only for `IODINE_TEST`. | Verified by counterpart repository. | Compatible. |
| POST | `/Confirm/Mashup` | PI control | UI sends only for `MASHING_IN_CONFIRMATION`. | Verified by counterpart repository. | Compatible. |
| POST | `/Confirm/Boiling` | PI control | UI sends only for `BOILING_CONFIRMATION`. | Verified by counterpart repository. | Compatible. |
| POST | `/Confirm/Cooking` | PI control | UI sends only for `COOKING_CONFIRMATION`. | Verified by counterpart repository. | Compatible. |
| POST | `/Confirm/Decoction` | PI control | UI sends only for `DECOCTION_CONFIRMATION`. | Verified by counterpart repository. | Compatible. |
| POST | `/Confirm/Wait` | PI control | UI must not call this path. | PI rejects with controlled error; verified by counterpart repository. | Compatible because UI does not send it. |
| POST | `/next` | PI control | UI posts to root `/next` and expects HTTP 200. | Verified by counterpart repository. | Compatible. |
| socket.io | `overheat` event at `ws://192.168.178.37:5000/` | Shared | UI subscribes to `overheat`, but payload-shape handling remains unclear. | Not fully verified in this repository. | Needs verification. |

## Field Contract

| Field | Type | Owner | Meaning | UI usage | Breaking change rule |
|---|---|---|---|---|---|
| `WaterStatus.filledLiters` | number | PI control | Current filled amount for the active fill operation; each new fill starts at `0`. | UI uses this for tank height, current liter text, gauge pointer, completion storage. | Keep name/type stable. |
| `WaterStatus.targetLiters` | number | PI control | Requested target amount for the active fill operation. | UI uses this only for gauge target marker/target text, not as current fill. | Keep name/type stable. |
| `WaterStatus.openClose` | boolean | PI control | Water-fill open/running state. | UI polling logic treats values other than `true` as not open/running. | Keep boolean and polarity stable. |
| `elapsedTime` | number | PI control | Elapsed process seconds. | UI displays Laufzeit, uses as progress numerator, timeline value, and collected brew data. | Keep seconds unit and numeric type stable. |
| `currentTime` | number | PI control | Unix timestamp seconds from `time.time()`; may be `0`. | UI may collect/preserve it but must not use it as duration, countdown, elapsed time, or progress. | Do not redefine as duration without coordinated UI/docs change. |
| `currentStep.duration` | number | PI control | Current step duration in seconds. | UI displays target time and uses as progress denominator. | Keep seconds unit and numeric type stable. |
| `currentStep.elapsedTime` | number | PI control | Current step elapsed seconds. | UI uses for cooking hop reminders. | Keep seconds unit and numeric type stable. |
| `currentStep.remainingTime` | number | PI control | Current step remaining seconds. | UI uses as countdown value where needed. | Keep seconds unit and numeric type stable. |
| `process.state` | string enum | PI control | Process lifecycle state. | UI labels and polling terminal-state decisions. | Preserve enum strings `IDLE`, `ACTIVE`, `FINISHED`, `ABORTED`, `ERROR`. |
| `currentStep.phase` | string enum | PI control | Current brewing phase. | UI labels, hop reminders, mobile display. | Preserve documented enum strings. |
| `currentStep.mode` | string enum | PI control | Current step mode. | UI labels, heating/progress/waiting decisions. | Preserve documented enum strings. |
| `waiting.waitingFor` | string enum | PI control | Concrete wait/confirmation reason or status. | UI maps only concrete values to confirmation endpoints; generic values do not dispatch. | Do not rename concrete confirmation enum values without coordinated UI update. |
| `waiting.canConfirm` | boolean | PI control | Whether confirmation may be submitted. | UI enables confirm button only when a concrete confirm exists and `canConfirm` is true. | Keep boolean semantics stable. |
| `temperature.current` | number | PI control | Current temperature in Celsius. | UI gauges/mobile display; fallback from `/temperatur/0` if missing/zero. | Keep Celsius and numeric type stable. |
| `temperature.target` | number | PI control | Target temperature in Celsius. | UI target gauge/mobile display. | Keep Celsius and numeric type stable. |
| `hardware.heater` | string enum | PI control | Heater state. | UI flame display. | Preserve `ON`, `OFF`, `ERROR`. |
| `hardware.agitator` | string enum | PI control | Agitator state. | UI agitator display/animation. | Preserve `ON`, `OFF`, `ERROR`. |

## Confirmation Contract

`Wait` is a status only. It is not a valid confirmation command and must not be sent as `POST /Confirm/Wait`.

Valid confirmation command values are:

- `Iodine`
- `Mashup`
- `Boiling`
- `Cooking`
- `Decoction`

The UI maps only concrete PI waiting reasons to those command values. If the UI only knows a generic waiting state, `USER_CONFIRMATION`, `NONE`, or any unknown waiting reason, it must not dispatch a confirm request. PI control must reject `POST /Confirm/Wait` with a controlled error so accidental clients fail safely.

## Remaining Open Questions

Only these items remain unresolved in this repository:

2. Long-term stability of `GET /temperatur/0` as the temperature read route: Needs verification.
3. Socket.io `overheat` payload shape and whether the UI parsing path matches the emitted payload: Needs verification.
4. Initial empty `Status`: Needs verification unless PI control guarantees a complete structured/default status object before the first brew update.

Resolved items that should no longer be treated as open: `/Available/`, `/WaterStatus` vs `/WaterStatus/`, WaterStatus object shape/default, no-value `TurnOn`/`TurnOff`, preserved value-bearing command routes, `/Confirm/Wait`, concrete confirmation values, and `currentTime` timestamp semantics.

## Breaking Change Rules

- Preserve `GET /Available/` as the UI-facing availability endpoint; preserve `GET /` as an existing PI route unless all clients migrate.
- Preserve both `GET /WaterStatus` and `GET /WaterStatus/` and keep successful responses object-shaped.
- Keep the default WaterStatus shape `{ "filledLiters": 0, "targetLiters": 0, "openClose": false }`.
- Keep UI defensive handling for null, malformed, failed, or non-200 WaterStatus responses.
- Preserve no-value heater command aliases `POST /Command/TurnOn` and `POST /Command/TurnOff`.
- Preserve value-bearing command routes `POST /Command/TurnOn:""`, `POST /Command/TurnOff:""`, `POST /Command/StartBrewing:""`, and `POST /Command/AgitatorInterval:""` for compatibility.
- Keep `AgitatorInterval:""` request-body configuration keys stable unless UI/docs are updated together.
- Do not use `Wait` as a confirmation command; keep PI rejection of `/Confirm/Wait` controlled and safe.
- Preserve concrete confirmation values and endpoints: `Iodine`, `Mashup`, `Boiling`, `Cooking`, `Decoction`.
- Keep `currentTime` as a Unix timestamp seconds field, not a duration/progress field.
- Keep progress/time UI fields explicit and seconds-based: `elapsedTime`, `currentStep.duration`, `currentStep.elapsedTime`, and `currentStep.remainingTime`.
- Update this final report, `interfaces.md`, exported UI context, and imported external control context whenever any PI/UI contract changes.

## Concise Summary

- Confirmed compatible areas: availability, water status routes/shape/default, heater commands, value-bearing command compatibility, concrete confirmations, `currentTime` semantics, status timing fields, recipe submission, start brewing, agitator interval, next-step, and temperature fallback.
- Resolved mismatches: `/Available/` uncertainty, `/WaterStatus` trailing slash mismatch, WaterStatus startup shape, no-value `TurnOn`/`TurnOff`, `/Confirm/Wait`, and UI misuse of `currentTime` as duration/progress.
- Remaining open questions: long-term `/temperatur/0` stability, socket.io `overheat` payload shape, and initial empty `Status` behavior.
- Compatibility conclusion: UI and PI control are compatible now for the finalized REST/status contracts documented above; only the listed open questions remain for future verification.
