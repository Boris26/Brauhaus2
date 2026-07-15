# Brauhaus

Brauhaus is the web application used to operate and monitor the brewing system. It manages beer recipes and ingredients and provides a clear view of the largely automated brewing process.

During brewing, Brauhaus displays the current process step, temperatures, timers, hardware states, and upcoming steps. The actual process execution and hardware control are handled by a separate brewing controller.

Most heating, resting, timing, and process transitions are performed automatically. User interaction is only required for explicitly defined manual tasks or confirmations.

Brauhaus also provides manual controls for testing, troubleshooting, commissioning, and recovering from situations where an automatic transition did not complete as expected.

## Features

- View, create, edit, and delete beer recipes
- Import recipe files
- Manage hops, malts, yeasts, and additional ingredients
- Recalculate and scale recipes for different batch sizes
- Manage active and completed brews
- Document fermentation and maturation progress
- Prepare and transfer recipes to the brewing controller
- Start and monitor the automated brewing process
- Display current and upcoming brewing steps
- Show target and measured temperatures
- Display elapsed and remaining times
- Monitor water level, heater, and agitator states
- Request user confirmation only when a manual action is required
- Allow manual intervention for testing and troubleshooting
- Receive status updates through regular polling
- Receive push notifications for pending confirmations
- Generate shopping lists as PDF files
- Generate annual brewing reports for customs documentation
- Provide optimized desktop and mobile views
- Switch between light and dark themes

## Automated Brewing Process

After a brew is started, Brauhaus converts the selected recipe into the format expected by the brewing controller and transfers it to the controller.

The brewing controller then performs the recipe steps largely automatically. This includes heating, mash rests, timed phases, hardware control, process transitions, and completion of the brewing process.

Brauhaus continuously displays the current state so that the user can see:

- Which step is currently active
- Which phase will follow next
- The current and target temperatures
- Elapsed and remaining times
- Heater and agitator states
- Whether the controller is waiting for user input
- Whether an error or unexpected condition has occurred

Normal transitions between heating, resting, and timed phases are performed automatically. Manual progression is not required during the regular brewing process.

More details are available in the [brewing process documentation](docs/BREWING_PROCESS.md).

## System Overview

The brewing system consists of several separate applications:

```text
┌────────────────────────┐
│       Brauhaus         │
│   React / TypeScript   │
└────────────┬───────────┘
             │
             ├── /api/database
             │          │
             │          ▼
             │   Database backend
             │   Recipes, ingredients,
             │   and completed brews
             │
             └── /api/controller
                        │
                        ▼
                  Brewing controller
                  Process, sensors,
                  and hardware
```

This repository contains the Brauhaus frontend application only. Data storage and the actual brewing process control are implemented in separate applications.

## Technologies

- React 18
- TypeScript
- Create React App
- Redux
- Redux Toolkit
- Redux Observable
- Redux Thunk
- RxJS
- Axios
- Material UI
- React Bootstrap
- React Testing Library
- Jest
- Recharts
- React Google Charts
- Socket.IO Client

## Project Structure

```text
public/
├── index.html
├── manifest.json
├── service-worker.js
└── Images and icons

scripts/
├── build-with-version.js
└── resolve-app-version.js

src/
├── actions/
├── components/
├── containers/
├── epics/
├── enums/
├── model/
├── reducers/
├── repositorys/
├── utils/
├── global.ts
├── index.tsx
├── setupProxy.js
└── store.ts

docs/
├── API.md
├── BREWING_PROCESS.md
├── CUSTOMS_REPORT.md
├── DEPLOYMENT.md
├── TROUBLESHOOTING.md
└── WEB_PUSH.md
```

## Requirements

For development and building:

- Node.js
- npm
- A modern web browser

A specific Node.js version is currently not defined in the repository.

The complete brewing system additionally requires:

- The database backend
- The separate brewing controller
- A web server or reverse proxy for API routing
- A browser with Service Worker and Push API support for notifications

## Installation

Install the dependencies:

```bash
npm install
```

For reproducible installations, especially in CI or deployment environments:

```bash
npm ci
```

## Running Brauhaus

### Development Mode

```bash
npm start
```

The development server starts Brauhaus and uses `src/setupProxy.js` for requests below `/api`.

The proxy target depends on the local development environment and must be checked before use.

### Production Build

```bash
npm run build
```

The production build is created in the `build/` directory.

The web server must:

- Serve the static files from `build/`
- Forward `/api/database` to the database backend
- Forward `/api/controller` to the brewing controller
- Route browser requests for React pages back to `index.html`

See [Deployment](docs/DEPLOYMENT.md) for further details.

## Testing

Run the test suite:

```bash
npm test
```

Run the tests once:

```bash
CI=true npm test -- --watchAll=false
```

Verify the production build:

```bash
npm run build
```

## Documentation

More detailed information is available in the following documents:

- [Automated brewing process](docs/BREWING_PROCESS.md)  
  Automatic workflow, user confirmations, and manual intervention.

- [API documentation](docs/API.md)  
  Database and brewing controller routes used by Brauhaus.

- [Deployment](docs/DEPLOYMENT.md)  
  Production build, reverse proxy, version handling, and deployment notes.

- [Troubleshooting](docs/TROUBLESHOOTING.md)  
  Common problems with polling, communication, confirmations, and push notifications.

- [Customs and annual brewing reports](docs/CUSTOMS_REPORT.md)  
  Annual PDF reports containing brewed volume and original gravity information.

- [Web Push](docs/WEB_PUSH.md)  
  Browser notifications, subscriptions, permissions, and service-worker behavior.

## Security

The following information must not be committed to the repository or included in documentation:

- IP addresses
- Private hostnames
- Usernames and passwords
- API keys and tokens
- Push and VAPID keys
- Database credentials
- Private keys
- Absolute user or server paths
- Session secrets
- Authorization headers
- Connection strings

Use neutral placeholders in examples:

```env
API_HOST=<API_HOST>
API_PORT=<API_PORT>
PUSH_PUBLIC_KEY=<PUSH_PUBLIC_KEY>
API_TOKEN=<API_TOKEN>
```

Never copy real configuration values from source files, environment files, logs, deployment scripts, or test requests into the documentation.
