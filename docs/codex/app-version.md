# Application version page

The React UI shows version information on the `Version` page, available from the desktop header information button. This project uses Redux view-state navigation instead of URL routes, so the route identifier is `Views.VERSION`.

The page displays three components:

- `UI`: the frontend build version.
- `Control`: the PI/control application diagnostic version.
- `Database`: the database/backend application diagnostic version.

## UI version injection

The UI version is resolved before `react-scripts` starts the Webpack build. Browser code does not call Git. The build wrapper in `scripts/build-with-version.js` injects the resolved value through `REACT_APP_VERSION`, which Create React App passes to Webpack's compile-time environment replacement.

Version priority:

1. Explicit CI/build variables: `BRAUHAUS_APP_VERSION`, `REACT_APP_VERSION`, `APP_VERSION`, or `BUILD_BUILDNUMBER`.
2. Azure DevOps tag builds via `BUILD_SOURCEBRANCH=refs/tags/<tag>`.
3. Local Git metadata from `git describe --tags --always --dirty`.
4. `unknown` when no explicit version or Git metadata is available.

For release builds, prefer setting `BRAUHAUS_APP_VERSION` to the release tag. Git metadata is a local-development fallback and the build remains usable from exported source archives.

## Diagnostic endpoints

The version page loads backend diagnostics when the page opens. Requests are independent, so one unavailable service does not hide the other versions.

- Control application: `GET /diag` through the configured control `BaseURL`.
- Database application: `GET /diag` through the configured database `DatabaseURL` axios client.

Expected successful or fallback response contract:

```json
{
  "version": "v1.2.3"
}
```

Only the `version` property is consumed. Missing, empty, or invalid diagnostic responses are displayed as `unknown`. A backend response of `{"version":"unknown"}` is displayed as `unknown` and is not treated as a request failure. Failed requests are displayed as `Unavailable`. Pending requests are displayed as `Loading…`.
