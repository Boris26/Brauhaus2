# UI ↔ PI Control Compatibility Audit

## Audit Scope

This audit verifies the current React UI behavior against the confirmed PI control API. It covers control URL generation, confirmation behavior, water status handling, command syntax, `currentTime` usage, error handling, and remaining verification questions.

## Executive Summary

- `GET /Available/` is confirmed as the UI-facing availability endpoint and remains the UI availability check.
- `GET /WaterStatus` is used by the UI; PI control also supports `GET /WaterStatus/`. The UI now normalizes failed, null, or malformed responses to `{ liters: 0, openClose: false }`.
- `POST /Command/TurnOn` and `POST /Command/TurnOff` remain no-value command endpoints; the UI does not add artificial `:""` values to them.
- `POST /Command/StartBrewing:""` and `POST /Command/AgitatorInterval:""` are preserved. `AgitatorInterval` sends command selection in the URL and actual mixer configuration in the JSON body.
- `Wait` is a status, not a valid confirmation command. The UI must not and no longer does generate `POST /Confirm/Wait`.
- `currentTime` is treated as a PI control timestamp/status field, not a UI duration/countdown/progress field. UI progress uses `elapsedTime` and `currentStep.duration`; countdown selection uses `currentStep.remainingTime` only.

## Confirmed Compatible Contracts

| Area | Confirmed behavior | UI alignment |
|---|---|---|
| Availability | `GET /Available/` returns HTTP 200 when reachable. | UI polls this endpoint and treats failures as unavailable. |
| Water status | `GET /WaterStatus` and `GET /WaterStatus/` return `{ liters, openClose }`. | UI calls `GET /WaterStatus` and normalizes to a safe object. |
| Status | `GET /Status/` returns structured status. | UI normalizes structured and legacy fallback fields. |
| Recipe | `POST /Recipe/` returns HTTP 201 on accepted recipe. | UI expects 201 and only starts brewing after success. |
| Heater | `POST /Command/TurnOn` and `/Command/TurnOff` are supported no-value aliases. | UI uses no-value aliases. |
| Start brewing | `POST /Command/StartBrewing:""` remains supported. | UI preserves this command URL. |
| Agitator interval | `POST /Command/AgitatorInterval:""` remains supported and accepts JSON body. | UI preserves URL and JSON body payload. |
| Confirmation | Valid confirmations are `Iodine`, `Mashup`, `Cooking`, `Boiling`, and `Decoction`. | UI only sends these concrete confirmation endpoints. |
| Next step | `POST /next` returns HTTP 200 on success. | UI uses root `/next`. |
| Temperature | `GET /temperatur/0` returns a numeric temperature. | UI uses this as fallback current temperature. |

## Endpoint Compatibility

See `docs/codex/compatibility/ui-control-url-audit.md` for exact final URL strings. The current endpoint compatibility status is:

| Method | Path | UI expectation | Verified? | Notes |
|---|---|---|---|---|
| GET | `/Available/` | 200 means available; body ignored. | Yes | UI-facing endpoint confirmed. |
| GET | `/WaterStatus` | 200 object `{ liters, openClose }`; failures normalize to default object. | Yes | `/WaterStatus/` is also supported by control. |
| GET | `/Status/` | 200 structured or legacy status. | Yes | Polling stops on `FINISHED`, `ABORTED`, or `ERROR`. |
| GET | `/temperatur/0` | 200 numeric body; failure returns 0. | Partially | Stable route name remains Needs verification in PI control repository. |
| POST | `/Recipe/` | 201 accepted; body ignored. | Yes | Uses `BrewingData`. |
| POST | `/Command/TurnOn` | 200; body ignored. | Yes | No-value command endpoint. |
| POST | `/Command/TurnOff` | 200; body ignored. | Yes | No-value command endpoint. |
| POST | `/Command/StartBrewing:""` | 200; body ignored. | Yes | Existing value-bearing syntax preserved. |
| POST | `/Command/FillWaterAutomatic:{liters}` | 200; body ignored. | Yes | Exact `liters` semantics remain Needs verification in PI control repository. |
| POST | `/Command/Speed:{speed}` | 200; body ignored. | Yes | Numeric speed in path. |
| POST | `/Command/AgitatorInterval:""` | 200; request body carries mixer configuration. | Yes | Value in body, command selector in path. |
| POST | `/Confirm/Iodine` | Concrete iodine confirmation. | Yes | Valid. |
| POST | `/Confirm/Mashup` | Concrete mash-in confirmation. | Yes | Valid. |
| POST | `/Confirm/Cooking` | Concrete cooking confirmation. | Yes | Valid. |
| POST | `/Confirm/Boiling` | Concrete boiling confirmation. | Yes | Valid. |
| POST | `/Confirm/Decoction` | Concrete decoction confirmation. | Yes | Valid. |
| POST | `/Confirm/Wait` | Must not be sent. | Yes | Removed/prevented by UI. |
| POST | `/next` | 200 advances current step. | Yes | Root path. |

## Field Compatibility

| Field | UI usage | Expected type/meaning | Risk if changed | Verification status |
|---|---|---|---|---|
| `elapsedTime` | Runtime display, progress numerator, timeline, data collector. | Seconds elapsed. | Wrong units break time/progress display. | Confirmed seconds-based field. |
| `currentTime` | Preserved in normalized status and data collection only. | PI control timestamp; may be 0. | Must not be used as duration/countdown/progress. | UI no longer uses it for display/progress. |
| `currentStep.duration` | Desktop/mobile target time and progress denominator. | Seconds duration. | Missing value yields safe `----`/0% progress. | Confirmed seconds-based field. |
| `currentStep.remainingTime` | Countdown selector value. | Seconds remaining. | Wrong units break countdown. | Confirmed seconds-based field. |
| `currentStep.elapsedTime` | Hop reminder timing during cooking. | Seconds elapsed in current step. | Wrong units break hop reminders. | Confirmed seconds-based field. |
| `WaterStatus.liters` | Water gauge/visualization. | Number. | Non-number could show NaN without normalization. | UI normalizes to number/default 0. |
| `WaterStatus.openClose` | Water polling stop condition. | Boolean. | Wrong polarity changes polling stop behavior. | Object shape confirmed; polarity semantics Needs verification in PI control repository. |
| `waiting.waitingFor` | Dialog label and concrete confirm endpoint mapping. | Waiting enum. | Unknown/generic waiting must not send invalid command. | UI only confirms concrete valid values. |
| `waiting.canConfirm` | Confirm action enablement. | Boolean. | Incorrect value can disable/enable confirmation. | Confirmed UI dependency. |

## Specific Findings

### `GET /Available/`

The UI calls `GET /Available/` through `ProductionRepository.checkIsBackendAvailable()`. This is now confirmed as the UI-facing PI control availability endpoint. Failures return `false`, producing a safe unavailable/offline state.

### `WaterStatus`

The UI expects an object `{ liters, openClose }`. The confirmed PI control API returns this object from both `/WaterStatus` and `/WaterStatus/`. The UI still keeps defensive normalization for null, undefined, malformed responses, non-200 responses, and caught HTTP failures, returning `{ liters: 0, openClose: false }` to avoid `NaN` or broken rendering.

### `Wait` and confirmation commands

`Wait` may be displayed as status text, but it is not a confirmation command. The UI no longer has a `ConfirmStates.WAITING` value and only maps concrete waiting reasons to `Iodine`, `Mashup`, `Cooking`, `Boiling`, or `Decoction`. Unknown/generic waiting states do not send any confirmation command.

### `TurnOn` and `TurnOff`

The UI keeps `POST /Command/TurnOn` and `POST /Command/TurnOff` as explicit no-value command endpoints. It does not add artificial `:""` values for these commands.

### `StartBrewing` and `AgitatorInterval`

The UI preserves `POST /Command/StartBrewing:""` and `POST /Command/AgitatorInterval:""`. `AgitatorInterval` sends actual mixer settings in the JSON request body; the path only selects the command.

### `currentTime`

`currentTime` is normalized and collected but no longer used by UI rendering as a target duration, countdown, or progress denominator. Desktop and mobile target time display use `currentStep.duration`; progress uses `elapsedTime / currentStep.duration`; countdown helper uses `currentStep.remainingTime` only. This avoids silently reinterpreting a PI control timestamp as elapsed seconds.

## Breaking Change Rules for Control App

- Keep `/Available/`, `/Status/`, `/Recipe/`, `/WaterStatus`, `/WaterStatus/`, `/next`, and `/temperatur/0` backward compatible unless UI and docs are updated together.
- Keep `WaterStatus` as an object with numeric `liters` and boolean `openClose` from startup.
- Keep `TurnOn` and `TurnOff` no-value command aliases.
- Keep existing value-bearing command syntax for `StartBrewing:""` and `AgitatorInterval:""`.
- Do not require or accept UI use of `/Confirm/Wait`; concrete confirmation endpoints must remain stable.
- Keep `elapsedTime`, `currentStep.duration`, `currentStep.elapsedTime`, and `currentStep.remainingTime` in seconds.
- Do not require the UI to interpret `currentTime` as a duration/countdown/progress value.

## Open Questions for PI Control Repository

- What is the exact operational meaning of `WaterStatus.liters` beyond the UI display value?
- Is `GET /temperatur/0` the intended long-term stable temperature read route?
- What exact socket.io `overheat` payload shape is emitted?

## Recommended Documentation Updates

This audit has been updated with the confirmed contracts. Keep `docs/codex/interfaces.md`, `docs/codex/data-flow.md`, `docs/codex/domain-model.md`, `docs/codex/external/control-context.md`, and `docs/codex/exports/ui-context-for-control.md` aligned when the PI control API changes.

## Final Verification Addendum

The final confirmed contract is now captured in `docs/codex/compatibility/final-ui-control-compatibility-report.md`.

Additional final confirmations:

- `GET /` remains preserved by PI control as an existing root route, but `/Available/` is the UI-facing availability endpoint.
- PI control supports both no-value heater aliases (`/Command/TurnOn`, `/Command/TurnOff`) and preserved value-bearing aliases (`/Command/TurnOn:""`, `/Command/TurnOff:""`). The UI uses the no-value aliases.
- PI control rejects `POST /Confirm/Wait` with a controlled error; UI does not generate this call.
- The only remaining open items are `WaterStatus.liters` operational meaning, `/temperatur/0` long-term stability, socket.io `overheat` payload shape, and initial empty `Status` behavior.
