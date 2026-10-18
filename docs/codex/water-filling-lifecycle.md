# Water filling lifecycle

Production keeps the equipment order: prepare Nachguss (SPARGE) before Hauptguss
(MASH). A recipe whose spargeVolume is exactly zero does not require that gate;
missing/invalid volumes do not silently bypass it. Failed/interrupted recipe
fills remain retryable rather than appearing completed.

The manual quantity control remains bounded by its displayed liters, initially
1 liter, and explains this to the user. All three controls call
POST /api/controller/Command/FillWaterAutomatic:<positive finite liters>, with
optional JSON metadata `{mode: MANUAL | MASH | SPARGE}`. Legacy calls without
metadata remain valid AUTO operations. The controller's separate unbounded
FillWaterManual/FillWaterManuel commands are not used by this control.

OFF dispatches STOP_WATER_FILLING and sends POST
/api/controller/Command/FillWaterStop:"". ProductionRepository waits for an
in-flight fill-start HTTP request before issuing the stop, preventing a rapid
OFF from arriving before ON. The poll cancels on explicit OFF; the stop epic
fetches the confirmed status. Another start is blocked while stopping. A failed
stop is visible and can be retried; the UI does not claim a successful close.

GET /api/controller/WaterStatus retains mandatory filledLiters, targetLiters,
openClose, with optional fillId, mode, state, reason, error. Numeric values are
finite non-negative liters. The initial zero/closed object remains compatible.
Operation states are IDLE, STARTING, RUNNING, COMPLETED, STOPPED and ERROR.
STARTING can be closed and must continue polling. A terminal response can arrive
without the client observing an intermediate open response. COMPLETED with
TARGET_REACHED and measured target attainment commits recipe completion; a partial
stop/error never does. Actual measured water remains visible rather than being
clamped to the requested quantity. Legacy snapshots use an observed open/close
transition and measured target checks, with bounded initial-start observation.

A water-status request failure or the 30-minute UI limit attempts a controller
stop. The Pi independently enforces no-flow and maximum-duration guards. The Pi
validates interrupt setup before opening, settles with the valve closed, and
publishes a terminal snapshot even when interrupt cleanup fails. See the matching
Braumeister docs/codex/water-filling-lifecycle.md and its OpenAPI contract.

API paths, original response fields, liters, and hardware command acknowledgements
are unchanged. Additional operation IDs are controller-local, not persistent
recipe/brew IDs. BeerDataStore schemas/APIs are unaffected. Target-Pi deployment,
flow calibration, integrated valve switching noise and mechanical after-run are
**Needs verification**; openClose is not physical valve-position feedback.

Tests cover zero-Nachguss recipes, pending startup, immediate zero-liter failure,
completion without an observed open phase, bounded manual filling, explicit stop,
start/stop HTTP ordering, metadata normalization and timeout shutdown.

Fill-start HTTP errors propagate with their response data instead of being
collapsed to false. A server rejection is displayed using its `error` message
and a diagnostic WaterStatus snapshot; a failed status read does not overwrite
the original cause. Rejection does not automatically stop another client's
operation or retry the start. A transport failure with uncertain acceptance
still attempts a stop. Explicit OFF queued behind a rejected ON is still sent.
