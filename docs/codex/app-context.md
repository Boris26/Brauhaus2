# Codex app context

## Repository role

This repository is a Create React App TypeScript UI named `test1`. It presents beer recipes, ingredient/database maintenance, finished brews, brewing calculations, settings, and production/control screens for a Brauhaus brewing setup. The UI talks to Caddy-routed relative API paths on the current origin: `/api/database` for the database/backend service, `/api/controller` for the brewing-control service, and `/api/audio` for controller sound tests. In local CRA development, `src/setupProxy.js` forwards every method below `/api/*` to the Caddy HTTPS origin, without a path rewrite, for development only. Caddy must provide the matching downstream route; otherwise its upstream response (for example HTTP 405) is returned unchanged to the browser.

## Entry points and shell

- `src/index.tsx` eagerly imports the global color tokens, Bootstrap base CSS, SimpleBar base CSS, and `index.css` reset/theme defaults before it creates the React tree. It wraps `App` in the Redux `Provider`, dispatches the initial theme, and registers `public/service-worker.js` through `process.env.PUBLIC_URL`. Route components and their page-specific CSS remain lazy-loaded.
- `src/containers/App.tsx` switches between a mobile-only UI and the desktop UI based on `window.innerWidth < 768`. There is no React Router in the code inspected; navigation is Redux view-state driven, with lightweight browser path synchronization in `src/utils/viewRoutes.ts` for direct links such as `/dashboard`.
- `App` owns the global `HEATER_STUCK_ON` safety dialog above both desktop and mobile content. It opens from the app-lifetime `alarm-state-changed` snapshot. Because the controller alarm is latched, an already received active alarm stays visible through a temporary Socket.IO disconnect until a later controller snapshot explicitly clears it; current temperature/heater details are shown only while the realtime connection is live. Reset uses only `POST /api/controller/Safety/Heater/Reset`. The dialog is non-dismissible and does not disappear merely because that HTTP request succeeded. Production suppresses its legacy local safety modal while rendered below this app-shell owner. Regular `EQUIPMENT_ALARM` handling remains local to Production.
- Desktop shell renders the global safety layer plus `Header` and `containers/index.tsx`. Mobile shell renders the same global safety layer plus `MobileProductionView` directly.

## Navigation/routing model

The app does not use URL routes. Navigation is an enum in `src/enums/eViews.ts` and the active view is stored at `applicationReducer.view`:

- `DASHBOARD`: compact overview for recipes, finished brews, ingredient usage, history, and current production status.
- `MAIN`: recipe table and details.
- `PRODUCTION`: active brewing controls and status.
- `DATABASE`: beer recipe form.
- `FINISHED_BREWS`: finished-brew table.
- `MEASUREMENT_DATA`: deep-linked fermentation history for one finished brew at `/finished-brews/{finishedBeerId}/measurements`; direct entry first restores the existing finished-brew list and the shared fermentation detail component owns the aggregate load.
- `BREWING_CALCULATIONS`: calculators.
- `INGREDIENTS`: ingredient maintenance.
- `SETTINGS`: theme/settings.

The header icon bar dispatches `ApplicationActions.setViewState(...)` to select views.

## React architecture

The repository is mostly class-component React with Redux `connect(...)`. Function components are present for the top-level `App` and some controls. Major areas:

- `src/containers/MainView/`: recipe list/details, finished brews, header/status.
- `src/containers/Production/`: brewing production screen, process list, timeline.
- `src/containers/DatabaseOverview/`: recipe and ingredient forms.
- `src/containers/Mobile/`: mobile status, active finished brew, calculations.
- `src/components/`: reusable controls, modal, gauge, flame, water visual.
- The desktop header's explicitly confirmed shutdown action uses `SystemRepository` to send one `POST /api/system/shutdown`. It blocks duplicate requests and leaves the UI in a terminal state after HTTP success.
- `src/utils/`: calculations, recipe mapping, status normalization/selectors, PDF, theme, data collection.

## State management

Redux store setup is in `src/store.ts` using `@reduxjs/toolkit` `configureStore`, `redux-thunk`, and `redux-observable` epic middleware. `rootReducer` combines these slices:

- `applicationReducer`: current view, error dialog fields, user messages, theme.
- `beerDataReducer`: recipes, selected recipe, recipe selected for brewing, finished brews, imported beer, form state, scaling.
- `productionReducer`: temperature, agitator and water state, normalized brewing status, backend availability, polling flag, overheat flag.
- `hopsReducer`, `maltsReducer`, `yeastReducer`, `additionalIngredientsReducer`: ingredient lists and submit/fetch flags.

Redux Observable epics drive async API calls and polling. Thunk middleware is configured but the inspected async flows are primarily epics.

## RxJS / epics

Epics exist for beer, production, hops, malts, yeast, and additional ingredients. Production epics include:

- A legacy one-shot temperature read remains available through `GET_TEMPERATURES`, but Production no longer dispatches it on mount; current temperature and sensor health/ID come from the app-lifetime Socket.IO sensor snapshot.
- Production loads persistent agitator defaults and current detail status once; current runtime configuration wins, while production edits use only the runtime config endpoint.
- Automatic water filling command plus a 1 second water-status polling stream while filling.
- Send brewing recipe and start brewing (including the optional connected default-namespace Socket.IO ID as `X-Socket-ID`), then emit `START_POLLING` after success. The single polling epic reads brewing status immediately and then every 10000 ms until process state is `FINISHED`, `ABORTED`, or `ERROR`; Production view mount/unmount does not own that lifecycle. Timed-step displays use a local wall-clock projection between responses and resynchronize to every controller status without deriving process transitions locally.
- Backend availability polling every 20000 ms after `CHECK_IS_BACKEND_AVAILABLE`.
- `POST /next` workflow step advancement.
- Socket.io connection for `overheat` events. Needs verification: the epic currently tries `JSON.parse(event.data)`, but `WebSocketController` passes an object `{ event, data }`, not a browser `MessageEvent`.

## API clients

Database CRUD uses `BaseRepository`, an axios instance with `baseURL: DatabaseURL`. Production/control calls use direct axios calls in `ProductionRepository` and URL constants from `src/global.ts`.

See `interfaces.md` and `docs/frontend-api-usage.md` for endpoint details.

## Error handling

- `BaseRepository` logs failed GET/POST/DELETE/POST-file requests and rethrows.
- Most production/control methods catch errors, log `Fehler beim API-Aufruf`, and return a safe fallback (`false`, `0`, or unavailable status).
- Epics often convert errors to `{ type: 'NO_OP' }`, failure actions, or backend-unavailable state.
- UI production start validates recipe-to-control mapping and shows a modal if required temperatures/times are invalid.

## LocalStorage and browser APIs

- Theme persistence uses key `theme` in `src/utils/theme.ts`. The browser-local UI role uses `brauhaus.uiMode`, accepts `desktop` and `controller`, and safely defaults to `desktop` when storage is missing, invalid, or unavailable.
- Initial theme falls back to `window.matchMedia('(prefers-color-scheme: dark)')`.
- Mobile status view uses `navigator.vibrate` when status identity changes.
- Service worker registration occurs on window `load`.

## Build, deployment, and tests

Scripts from `package.json`:

- `npm start`: version wrapper around the CRA dev server; CRA loads `src/setupProxy.js` for local `/api` proxying.
- `npm run build`: production build.
- `npm test`: CRA/Jest test runner.
- `npm run build-deploy`: build then `scp -r build/* boris@192.168.178.72:/srv/sites/braumeister`.
- `npm run deploy`: copy existing build to the same server path.
- Storybook scripts are present, but package script names use older `start-storybook` / `build-storybook` commands while Storybook 7 dependencies are installed. Needs verification.


## Application version

The desktop UI has a `Version` view in the header information area. The page displays the frontend build version from `REACT_APP_VERSION`, injected before `react-scripts` runs. `scripts/resolve-app-version.js` prefers explicit CI variables (`BRAUHAUS_APP_VERSION`, `REACT_APP_VERSION`, `APP_VERSION`, `BUILD_BUILDNUMBER`, or an Azure `refs/tags/*` source branch), then `git describe --tags --always --dirty`, and finally `unknown` when Git metadata is unavailable.

## Finished-brew lifecycle and fermentation actions

The normal UI lifecycle is centrally restricted to `FERMENTATION -> MATURATION | FINISHED` and `MATURATION -> FINISHED`; `FINISHED` is terminal. **Gärung bezeichnet die gesamte Zeit im Gärbehälter. Es gibt keinen regulären globalen Status für Hauptgärung oder Nachgärung. Dry Hop und weitere Zugaben werden über einzelne Rezeptaktionen innerhalb der Gärung gesteuert.** Lifecycle controls live in the fermentation/detail view. `finished-brews` shows status read-only for existing rows; only manual historic creation exposes an explicitly labelled administrative status.

The detail view reloads the BeerDataStore fermentation aggregate after saving Plato/temperature measurements and after completing actions. Due/pending/completed actions and contact-time status are in-app notifications. Existing PI/control Web Push remains unchanged; delivery of fermentation action/contact-time push events is **Needs verification** in BeerDataStore and the deployment push owner.

Production sets the concrete `FinishedBrew.fermentationStartedAt` once, as a timezone-bearing ISO timestamp, when the completed brewing workflow creates the fermentation record. Retry reuses the same payload/timestamp. Detail displays never substitute `startDate`; legacy records without the canonical timestamp show no inferred fermentation day.
