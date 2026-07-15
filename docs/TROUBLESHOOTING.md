# Troubleshooting

[Back to the Brauhaus overview](../README.md)

## Database Data Is Not Loaded

Check:

- Is the database backend running?
- Is `/api/database` forwarded correctly?
- Does the reverse proxy return the expected response?
- Are network errors shown in the browser console?
- Does the response contain the expected data structure?

## Brewing Controller Is Not Available

Check:

- Is the brewing controller running?
- Is `/api/controller` forwarded correctly?
- Does `/Available/` return a valid response?
- Is the development proxy configured correctly?
- Is the browser using the expected origin?

## Brewing Status Is Not Updated

Check:

- Does `/Status/` return a response?
- Does the response contain a valid process state?
- Is status polling still active?
- Is a new status loaded after a command or confirmation?
- Are network or JavaScript errors shown in the browser console?

## Automated Process Does Not Continue

Before manually advancing the process, check:

- Has the target temperature been reached?
- Is a timer still running?
- Is the controller waiting for user confirmation?
- Does `waiting.waitingFor` contain a specific confirmation state?
- Is `waiting.canConfirm` set to `true`?
- Has the previous step completed successfully?
- Does the controller report an error?
- Is Brauhaus still polling the current status?

Manual progression should only be used after identifying why the automatic transition did not occur.

## Confirmation Dialog Is Not Displayed

Check:

- Is `waiting.waitingFor` set?
- Is `waiting.canConfirm` set to `true`?
- Is the status refreshed after a phase transition?
- Can Brauhaus map the reported confirmation state?
- Is an older status response still being displayed?

## Water Status Is Incorrect

Check:

- Does `/WaterStatus` return the expected value?
- Is water-status polling active?
- Is the returned unit interpreted correctly?
- Is the displayed value reset when a new process begins?
- Is the controller reporting simulated or stale data?

## Push Notifications Do Not Work

Check:

- Does the browser support Service Workers and Push?
- Has notification permission been granted?
- Is the service worker registered?
- Are the controller push endpoints available?
- Is the push subscription still valid?
- Is Brauhaus served from a secure origin?

## Notification Opens Slowly

Check:

- Is the mobile browser suspended in the background?
- Is battery optimization restricting the browser?
- Is the service worker receiving the notification immediately?
- Does opening Brauhaus require slow network requests?
- Is the status request started immediately after opening the notification?

## Build Version Shows `unknown`

Check:

- Are the expected build or CI variables available?
- Are Git metadata available during the build?
- Is the build executed from a complete Git checkout?
- Does the build process remove the `.git` directory before resolving the version?

## Storybook Does Not Start

Check:

- Are the Storybook scripts compatible with the installed Storybook version?
- Are all required Storybook packages installed?
- Does the configured script name match the installed version?

## Cached Application Version Is Displayed

Check:

- Is the current production build deployed?
- Is the web server serving the current files?
- Is the service worker still controlling the page?
- Is `version.json` or another version endpoint cached?
- Does the web server handle query parameters correctly?

## Security During Troubleshooting

Do not copy confidential values into issues, documentation, or screenshots.

Remove or replace:

- IP addresses
- Private hostnames
- Tokens
- Cookies
- Authorization headers
- Passwords
- Absolute paths
- Personal information

## Related Documentation

- [Automated brewing process](BREWING_PROCESS.md)
- [API documentation](API.md)
- [Web Push](WEB_PUSH.md)
