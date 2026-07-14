# Dependencies and configuration

## Package/runtime dependencies

Core dependencies observed in `package.json`:

- React 18, React DOM, TypeScript 4.9, Create React App `react-scripts` 5. The CRA development server uses `src/setupProxy.js` for the local `/api` proxy.
- Redux stack: `redux`, `@reduxjs/toolkit`, `react-redux`, `redux-observable`, `rxjs`, `redux-thunk`.
- HTTP/realtime: `axios`, `socket.io-client`; local development proxy: `http-proxy-middleware` as a direct development dependency for CRA `src/setupProxy.js`.
- UI: MUI v5 packages, Material UI v4 core, React Bootstrap/Bootstrap, Font Awesome, SimpleBar, react-switch, react-dial-knob, react-thermometer-component, Recharts, React Google Charts, Konva/react-konva, gantt-task-react.
- PDF/export: `pdfmake`, `pdf-lib`, `file-saver`.
- Utilities: lodash, fuse.js.

Needs verification: the app mixes Material UI v4 and MUI v5 packages, which can affect theming/bundle size.

## URL configuration

`src/global.ts` exports relative API URLs for the Caddy-routed production origin:

- `DatabaseURL = '/api/database'`
- `BaseURL = '/api/controller'`
- `CommandsURL = '/api/controller/Command/'`
- `ConfirmURL = '/api/controller/Confirm/'`

No environment override is used for API origins. In local CRA development only, `src/setupProxy.js` proxies `/api/*` to `https://192.168.178.72/api/*` without path rewriting. `PUBLIC_URL` is used only for CRA public assets/service worker.

## Scripts

- `start`: version wrapper around the CRA development server; CRA loads `src/setupProxy.js` for the local `/api` development proxy.
- `build`: CRA production build to `build/`.
- `test`: CRA/Jest runner.
- `build-deploy`: build then copy build output to `boris@192.168.178.72:/srv/sites/braumeister`.
- `deploy`: copy existing build output to the same target.
- `storybook`, `build-storybook`: Storybook commands. Needs verification with installed Storybook 7 tooling.

## Static assets and PWA

Assets live in `public/`. The app registers `public/service-worker.js` at runtime. Icons/images are referenced both by relative paths such as `beer.png` and through `process.env.PUBLIC_URL` in some components.

## Test setup

Jest/React Testing Library setup uses CRA defaults plus `src/setupTests.ts`. Existing tests cover:

- Production repository endpoint methods and HTTP method choices.
- Brewing status normalization/selectors.
- Production recipe mapping.
- Fermentation and hop defaults.

