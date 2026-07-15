# Web Push

[Back to the Brauhaus overview](../README.md)

## Overview

Brauhaus can receive Web Push notifications when the brewing controller requires user attention.

A typical use case is a brewing step that requires confirmation before the automated process can continue.

## Requirements

Web Push requires:

- A browser with Service Worker support
- Notification API support
- Push API support
- Permission to display notifications
- An active service worker
- Available push endpoints in the brewing controller
- A secure origin in production

## Service Worker

Brauhaus registers the service worker located at:

```text
public/service-worker.js
```

The service worker receives push events and displays notifications.

It currently does not implement a custom caching strategy for application or API data.

## Subscription Flow

The typical subscription flow is:

1. Brauhaus registers the service worker.
2. The browser requests notification permission.
3. Brauhaus retrieves the public push key from the controller.
4. The browser creates a push subscription.
5. Brauhaus sends the subscription to the controller.
6. The controller stores the subscription.
7. The controller can send notifications when user input is required.

## Controller Routes

The relevant controller routes are located below:

```text
/api/controller/push/
```

Typical operations include:

- Retrieving the public push key
- Creating or updating a subscription
- Removing a subscription
- Sending a test notification

See [API documentation](API.md) for the route overview.

## Notification Interaction

When a notification is opened, Brauhaus should:

- Open or focus the application
- Navigate to the relevant status view when possible
- Retrieve the current controller status
- Display the required confirmation or current process state

The notification itself must not automatically confirm a brewing step.

## Delayed Notifications

Mobile operating systems may delay push delivery or application startup because of:

- Battery optimization
- Browser background restrictions
- Network availability
- Suspended browser processes
- Service-worker startup delay

Brauhaus should retrieve a fresh controller status after the application is opened so that stale notification data is not used.

## Security

Private push credentials belong to the brewing controller.

Do not store or document:

- Private VAPID keys
- Push service credentials
- Tokens
- Subscription endpoints copied from real devices
- Authentication secrets

Only the public push key may be sent to the browser.

Use placeholders in documentation:

```env
PUSH_PUBLIC_KEY=<PUSH_PUBLIC_KEY>
PUSH_PRIVATE_KEY=<PUSH_PRIVATE_KEY>
PUSH_SUBJECT=<PUSH_SUBJECT>
```

## Troubleshooting

See [Troubleshooting](TROUBLESHOOTING.md) for common problems with permissions, subscriptions, and delayed notification handling.
