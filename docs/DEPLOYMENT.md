# Deployment

[Back to the Brauhaus overview](../README.md)

## Production Build

Install the dependencies:

```bash
npm ci
```

Create the production build:

```bash
npm run build
```

The build output is created in:

```text
build/
```

## Web Server Requirements

The web server must:

- Serve the static files from `build/`
- Forward `/api/database` to the database backend
- Forward `/api/controller` to the brewing controller
- Route browser requests for React pages back to `index.html`
- Serve the manifest and service worker from the same origin when PWA features are used

## Relative API Routes

Brauhaus uses relative API routes:

```text
/api/database
/api/controller
/api/controller/Command/
/api/controller/Confirm/
```

The actual targets are configured outside the React build.

This avoids embedding installation-specific server addresses in the application.

## Development Proxy

During development, requests below `/api` are forwarded through:

```text
src/setupProxy.js
```

The target must match the local environment.

Documentation and committed examples must use placeholders:

```text
http://<API_HOST>:<PORT>
```

## Build Version

The application version is resolved during the build and provided through:

```text
REACT_APP_VERSION
```

The following sources are checked in order:

1. `BRAUHAUS_APP_VERSION`
2. `REACT_APP_VERSION`
3. `APP_VERSION`
4. `BUILD_BUILDNUMBER`
5. A Git tag provided through `BUILD_SOURCEBRANCH`
6. The output of `git describe`
7. The fallback value `unknown`

If the displayed version is `unknown`, verify that the required build variables or Git metadata are available.

## Deployment Scripts

Additional deployment scripts may be present in `package.json`.

Before using them, review:

- The target host
- The target user
- The destination path
- Authentication method
- File permissions
- Whether confidential values are embedded in the command

Installation-specific values must not be copied into public documentation.

## PWA Deployment

For PWA and Web Push support:

- Brauhaus must be served from a secure origin
- The service worker must be reachable
- The manifest must be reachable
- Browser notification permission must be granted
- Controller push endpoints must be available

See [Web Push](WEB_PUSH.md) for details.

## Security

Do not commit or document:

- Server IP addresses
- Private hostnames
- SSH credentials
- Passwords
- Tokens
- Private keys
- Absolute user paths
- Connection strings
- Push credentials

Use environment variables or external configuration where appropriate.

## Related Documentation

- [API documentation](API.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Web Push](WEB_PUSH.md)
