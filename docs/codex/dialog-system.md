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
- recipe import and ingredient editing;
- manual fermentation measurements.

Inline field validation, status banners, and process notices intentionally remain inline because they are contextual feedback rather than blocking dialogs. No browser-native alert or confirmation is used by the application frontend.

## Semantics

`AppDialog` supports `info`, `warning`, `error`, `success`, `progress`, `recovery`, and `confirm`.

- neutral information, confirmation, recovery and progress dialogs use the configured Brauhaus accent;
- warnings use the warning token;
- errors and destructive actions use the error token;
- success uses the success token.

This keeps the normal dialog family visually aligned with the grey/orange application design while retaining semantic colors for exceptional states. Feature dialogs can provide a domain-specific header icon (for example import, edit or measurement) instead of falling back to the generic semantic icon.

Cancel actions use the shared `DialogCancelButton`: an icon-only close action with an accessible `Abbrechen` label and tooltip. Primary actions keep their text and use a meaningful action icon where available. The styles consume the existing color, spacing, radius, typography, control-size, and shadow variables.

This refactor changes no API route, DTO, ID, unit, enum, polling behavior, terminal state, or cross-repository contract. Recovery durations continue to be interpreted as seconds and converted only for presentation.
