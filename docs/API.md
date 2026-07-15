# API Documentation

[Back to the Brauhaus overview](../README.md)

## Overview

Brauhaus uses relative API routes. The actual target applications are configured through the development proxy or the production reverse proxy.

```text
/api/database
/api/controller
```

No fixed server address is required in the production build.

## Database API

Base route:

```text
/api/database
```

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/beers` | Load beer recipes |
| `POST` | `/beer` | Create a beer recipe |
| `PUT` | `/beer/{id}` | Update a beer recipe |
| `DELETE` | `/beer/{id}` | Delete a beer recipe |
| `POST` | `/importbeer` | Import a recipe file |
| `GET` | `/finishedbeers` | Load completed brews |
| `POST` | `/finishedbeer` | Save a completed brew |
| `DELETE` | `/finishedbeer/{id}` | Delete a completed brew |
| `GET` | `/hops` | Load hops |
| `POST` | `/hop` | Create a hop |
| `DELETE` | `/hop/{id}` | Delete a hop |
| `GET` | `/malts` | Load malts |
| `POST` | `/malt` | Create a malt |
| `DELETE` | `/malt/{id}` | Delete a malt |
| `GET` | `/yeasts` | Load yeasts |
| `POST` | `/yeast` | Create a yeast |
| `DELETE` | `/yeast/{id}` | Delete a yeast |
| `GET` | `/additionalingredients` | Load additional ingredients |
| `POST` | `/additionalingredient` | Create an additional ingredient |
| `DELETE` | `/additionalingredient/{id}` | Delete an additional ingredient |

## Controller API

Base route:

```text
/api/controller
```

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/temperatur/0` | Read the current temperature |
| `GET` | `/WaterStatus` | Read the current water status |
| `GET` | `/Status/` | Read the current brewing status |
| `GET` | `/Available/` | Check controller availability |
| `GET` | `/diag` | Read diagnostic and version information |
| `POST` | `/Recipe/` | Transfer the controller recipe |
| `POST` | `/Command/...` | Send a controller command |
| `POST` | `/next` | Manually advance the current process step |
| `POST` | `/Confirm/{state}` | Confirm a waiting process step |
| `GET` | `/push/public-key` | Read the public push key |
| `POST` | `/push/subscriptions` | Store a push subscription |
| `DELETE` | `/push/subscriptions` | Remove a push subscription |
| `POST` | `/push/test` | Send a test notification |

## Process Commands

Controller commands may include:

- Starting the brewing process
- Starting automatic water filling
- Turning the heater on or off
- Setting the agitator speed
- Configuring the agitator interval

The exact command payload must match the controller implementation.

## Manual Advancement

The `/next` endpoint is mainly intended for:

- Testing
- Troubleshooting
- Recovering from an incorrect process state

It is not required during the normal automatic brewing process.

Before using it, verify whether the controller is waiting for a target temperature, timer, or user confirmation.

## Confirmations

Brauhaus must use the specific confirmation state reported by the controller.

A general waiting state must not be sent as a confirmation.

The confirmation workflow is:

1. Brauhaus retrieves the current status.
2. The controller reports a waiting state and whether confirmation is allowed.
3. Brauhaus displays the matching confirmation dialog.
4. The user confirms the action.
5. Brauhaus sends the specific confirmation state.
6. Brauhaus retrieves a fresh status.

## Error Handling

Brauhaus should handle:

- Unavailable services
- Network timeouts
- Invalid responses
- Unknown process states
- Rejected commands
- Failed confirmations
- Failed push subscription requests

Errors should be presented without exposing confidential request details, credentials, or internal infrastructure information.

## Security

Do not include the following in documentation or committed examples:

- Real IP addresses
- Private hostnames
- Authorization headers
- Tokens
- Cookies
- API keys
- Passwords
- Connection strings
- Private keys

Use neutral placeholders instead:

```text
http://<API_HOST>:<PORT>
```

## Related Documentation

- [Automated brewing process](BREWING_PROCESS.md)
- [Deployment](DEPLOYMENT.md)
- [Troubleshooting](TROUBLESHOOTING.md)
