# Application version page

The React UI shows its frontend version on the `Version` page, available from the desktop header information button.

The value is resolved before `react-scripts` starts the Webpack build. Browser code does not call Git. The build wrapper in `scripts/build-with-version.js` injects the resolved value through `REACT_APP_VERSION`, which Create React App passes to Webpack's compile-time environment replacement.

Version priority:

1. Explicit CI/build variables: `BRAUHAUS_APP_VERSION`, `REACT_APP_VERSION`, `APP_VERSION`, or `BUILD_BUILDNUMBER`.
2. Azure DevOps tag builds via `BUILD_SOURCEBRANCH=refs/tags/<tag>`.
3. Local Git metadata from `git describe --tags --always --dirty`.
4. `unknown` when no explicit version or Git metadata is available.

For release builds, prefer setting `BRAUHAUS_APP_VERSION` to the release tag. Git metadata is a local-development fallback and the build remains usable from exported source archives.
