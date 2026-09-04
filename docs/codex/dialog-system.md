# Frontend dialog system

## Inventory and migration

The frontend uses Material UI (`@mui/material`) as its dialog foundation. Before the consolidation, most confirmations, production messages, equipment alarms, validation errors, and shutdown states used the shared `ModalDialog`, while brew recovery, recipe import, and ingredient editing each assembled Material UI `Dialog` primitives themselves. Recipe import also duplicated surface, title, action, and button styling in its feature CSS.

All application dialogs now flow through `AppDialog`. The component owns the common surface, semantic accent and icon, header, content, actions, responsive sizing, touch targets, and disabled action appearance. `ModalDialog` remains as a compatibility adapter for the existing string-based callers, so their event handling and domain behavior are unchanged.

Migrated dialog groups:

- brew recovery and discard confirmation;
- shutdown confirmation, progress, terminal state, and error;
- global heater safety and local equipment alarms;
- production completion/save feedback;
- recipe and finished-brew deletion confirmations;
- recipe validation and legacy yeast creation errors;
- recipe import and ingredient editing.

Inline field validation, status banners, and process notices intentionally remain inline because they are contextual feedback rather than blocking dialogs. No browser-native alert or confirmation is used by the application frontend.

## Semantics

`AppDialog` supports `info`, `warning`, `error`, `success`, `progress`, `recovery`, and `confirm`. Recovery, warning, confirmation, progress, and primary actions use the configured application accent; errors and destructive actions use the error token; success uses the success token; general information uses the information token. The styles consume the existing color, spacing, radius, typography, control-size, and shadow variables.

This refactor changes no API route, DTO, ID, unit, enum, polling behavior, terminal state, or cross-repository contract. Recovery durations continue to be interpreted as seconds and converted only for presentation.
