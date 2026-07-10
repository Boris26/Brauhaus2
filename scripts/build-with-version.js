const { spawnSync } = require('child_process');
const { resolveAppVersion } = require('./resolve-app-version');

const script = process.argv[2] || 'build';
const appVersion = resolveAppVersion(process.env);
const result = spawnSync(process.platform === 'win32' ? 'node_modules/.bin/react-scripts.cmd' : 'node_modules/.bin/react-scripts', [script], {
  stdio: 'inherit',
  env: {
    ...process.env,
    REACT_APP_VERSION: appVersion,
  },
});

process.exit(result.status === null ? 1 : result.status);
