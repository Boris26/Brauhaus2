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

## Production measurement cards

The two equal-size cards below the existing process control reuse `Gauge` for
water (0–70 liters) and temperature (0–100 °C). The existing component renders a
responsive SVG dial directly from its props, without a Google Charts loader,
mirrored measurement state, or a remount on each status/sensor update. Missing
readings retain the dial with a neutral `--` value and no measurement needle.

The water card reads `productionReducer.waterStatus.filledLiters` directly. This
is the measurement for one controller fill operation, including MANUAL, MASH,
SPARGE and legacy AUTO fills; it is **not** the kettle's total contents. Its
target is the same snapshot's positive `targetLiters`, never the editable manual
quantity or a recipe total. Remaining water is `max(0, targetLiters - filledLiters)`.
Over-target readings remain visible; only the pointer/arc is bounded to the dial.
Closed/terminal states do not hide an available measurement. A new reported zero
is accepted as the new operation's value, without carrying over the previous fill.
No inferred kettle level or malt displacement is implemented.

The existing fill epic already reads WaterStatus immediately after a successful
start and every second thereafter, dispatches every measurement through
`SET_WATER_STATUS`, and includes the final terminal snapshot before stopping.
The reducer preserves that snapshot. No polling, Socket.IO, endpoint, DTO, or
hardware changes are needed for these cards. The view does not add status reads
on mount; after a page reload, only water data already available in Redux can be
displayed until the existing lifecycle supplies another snapshot.

The prior Production layout rendered only the temperature dial. The left tank's
`getDisplayedWaterLiters` selector uses local recipe accumulation and can return
zero for an inactive fill even when WaterStatus has a nonzero measurement. It is
therefore intentionally not the source for the new water dial. Repository,
reducer, polling, and view tests check the existing measurement path and changing
fractional values. A historical physical report of constant zero cannot be
reproduced without live controller responses; pulse measurement and deployment
remain **Needs verification** on the Pi.

Current temperature still comes exclusively from a connected, healthy realtime
temperature-sensor snapshot; zero is valid. The target comes from the existing
brewing status and is neutral when absent, non-finite, or stale. The tank,
heater, process controls, water controls, and temperature timeline are unchanged.
