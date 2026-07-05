# Codex app context

## Repository role

This repository is a Create React App TypeScript UI named `test1`. It presents beer recipes, ingredient/database maintenance, finished brews, brewing calculations, settings, and production/control screens for a Brauhaus brewing setup. The UI talks to two hard-coded HTTP origins: a database/backend service at `http://192.168.178.72:5000/` and a brewing-control service at `http://192.168.178.37:5000/`.

## Entry points and shell

- `src/index.tsx` imports global color CSS, creates the React tree, wraps `App` in the Redux `Provider`, dispatches the initial theme, and registers `public/service-worker.js` through `process.env.PUBLIC_URL`.
- `src/containers/App.tsx` switches between a mobile-only UI and the desktop UI based on `window.innerWidth < 768`. There is no React Router in the code inspected; navigation is Redux view-state driven.
- Desktop shell renders `Header` plus `containers/index.tsx`. Mobile shell renders `MobileProductionView` directly.

## Navigation/routing model

The app does not use URL routes. Navigation is an enum in `src/enums/eViews.ts` and the active view is stored at `applicationReducer.view`:

- `MAIN`: recipe table and details.
- `PRODUCTION`: active brewing controls and status.
- `DATABASE`: beer recipe form.
- `FINISHED_BREWS`: finished-brew table.
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

- Temperature read on `GET_TEMPERATURES`.
- Agitator toggle and speed commands.
- Automatic water filling command plus a 1 second water-status polling stream while filling.
- Send brewing recipe, start brewing, then poll brewing status every 1000 ms until process state is `FINISHED`, `ABORTED`, or `ERROR`.
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

- Only explicit `localStorage` usage found is theme persistence under key `theme` in `src/utils/theme.ts`.
- Initial theme falls back to `window.matchMedia('(prefers-color-scheme: dark)')`.
- Mobile status view uses `navigator.vibrate` when status identity changes.
- Service worker registration occurs on window `load`.

## Build, deployment, and tests

Scripts from `package.json`:

- `npm start`: CRA dev server.
- `npm run build`: production build.
- `npm test`: CRA/Jest test runner.
- `npm run build-deploy`: build then `scp -r build/* boris@192.168.178.72:/srv/sites/braumeister`.
- `npm run deploy`: copy existing build to the same server path.
- Storybook scripts are present, but package script names use older `start-storybook` / `build-storybook` commands while Storybook 7 dependencies are installed. Needs verification.

