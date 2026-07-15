# Automated Brewing Process

[Back to the Brauhaus overview](../README.md)

## Overview

Brauhaus visualizes and monitors the brewing process, while the separate brewing controller executes the process and controls the connected hardware.

After the user starts a brew, Brauhaus prepares the selected recipe for the brewing controller and transfers it. The controller then executes the recipe steps largely automatically.

## Automatic Process Execution

Depending on the recipe and connected hardware, the controller can perform the following tasks:

- Fill the required amount of water
- Heat to the configured target temperatures
- Control the heater and agitator
- Perform mash rests
- Monitor rest durations
- Transition between heating, resting, and boiling phases
- Calculate elapsed and remaining times
- Report the current process status
- Complete the brewing process after the final step

Normal transitions between heating, resting, and timed phases are automatic. The user does not need to advance every step manually.

## Process Visualization

Brauhaus continuously retrieves and displays the current brewing status.

The user can see:

- The active process step
- Upcoming process steps
- The current phase and operating mode
- Current and target temperatures
- Elapsed and remaining times
- Heater and agitator states
- Water filling status
- Required confirmations
- Errors or unexpected states

The process overview and timeline make it possible to follow the entire brew without directly controlling each transition.

## User Confirmations

Some brewing tasks cannot be performed or detected automatically. In these situations, the controller pauses and reports a specific confirmation state.

Examples may include:

- Confirming that mashing-in has been completed
- Confirming an iodine test
- Confirming that mashing-out has been completed
- Confirming the start or completion of another manual brewing task

Brauhaus displays a matching confirmation dialog. After the user confirms the action, the controller continues the automatic process.

Brauhaus must always use the specific confirmation state reported by the controller. A general waiting state must not be sent as a confirmation.

## Manual Intervention

Brauhaus also provides manual process controls.

These controls are primarily intended for:

- Development and functional testing
- Initial commissioning
- Testing hardware components
- Troubleshooting
- Recovering an interrupted process
- Continuing a process when an automatic transition failed

Depending on the current state, available actions may include:

- Turning the heater on or off
- Controlling the agitator
- Starting automatic water filling
- Manually advancing the current process step
- Confirming a waiting process step

Manual intervention is not part of the normal brewing workflow. It should only be used when the current state of the brewing system is understood.

## Status Polling

Brauhaus regularly retrieves the current status from the controller.

Polling is used to keep the following information current:

- Process state
- Current step
- Temperature
- Timers
- Hardware states
- Waiting confirmations
- Error information

After a command or confirmation, Brauhaus should retrieve a fresh status so that the displayed state reflects the result of the action.

## Process Recovery

Before manually advancing a process, verify:

- Whether the target temperature has been reached
- Whether a timer is still running
- Whether the controller is waiting for confirmation
- Whether the previous step completed successfully
- Whether the controller reported an error
- Whether status polling is still active

Manual progression should only be used after identifying why the expected automatic transition did not occur.

## Related Documentation

- [API documentation](API.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Web Push](WEB_PUSH.md)
