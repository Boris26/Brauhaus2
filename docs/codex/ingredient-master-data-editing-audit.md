# Ingredient master-data editing audit

## Decision

Ingredient editing is blocked for all four categories. The UI and the durable
backend contract only expose list, create, and delete operations for malts,
hops, yeasts, and additional ingredients. No update method, route, request
payload, response payload, or error contract is documented.

The UI must not guess an update route, mutate Redux state without persistence,
or replace an existing record through delete-and-create. Consequently, this
audit intentionally makes no application-code or Recipe Import V2 changes.

**Needs verification:** the database/backend repository must confirm and
document update contracts before the UI implementation can proceed. At a
minimum, each contract needs an HTTP method and path, the authoritative ID
location, its accepted payload, its success response, and its validation/error
responses.

## Existing ingredients page

`IngredientsFormPage` is a connected class component. It loads all four master
data lists when mounted and renders one expanded-at-a-time accordion for
`Malz`, `Hopfen`, `Hefe`, and `Weitere Zutaten`. Each accordion contains a
sticky-header table. Creation is performed in an optional inline table row;
there is no create dialog to reuse. Existing records have only a delete action.

| Category | Table fields | Inline-create fields | TypeScript master-data model |
| --- | --- | --- | --- |
| Malt | name, description, EBC | name, description, EBC | `Malts`: `id`, `name`, `description`, `ebc` |
| Hop | name, alpha, type, description | name, alpha, type, description | `Hops`: `id`, `name`, `type`, `alpha`, `description` |
| Yeast | name, type, temperature, EVG | name, type, temperature, EVG | `Yeasts`: `id`, `name`, `description`, `temperature`, `type`, `evg` |
| Additional ingredient | name, description | name, description | `AdditionalIngredient`: `id`, `name`, optional `description` |

The yeast master-data model contains `description`, although the current page
neither displays nor creates it. This field would need to be preserved and made
editable in a future edit form; it must not be silently discarded. No recipe
usage fields belong in these forms.

## Current validation and asynchronous flow

- All inline create flows require a truthy name before dispatch, but only the
  additional-ingredient flow trims the name and renders `Name ist
  erforderlich.` for an empty value.
- Malt EBC is entered as a number. Hop alpha, yeast temperature, and yeast EVG
  are serialized as strings, matching the current UI master-data types.
- Redux has separate action, reducer, epic, and repository modules for each
  category.
- Repositories call `GET` for lists, `POST` for creates, and `DELETE` by ID.
  `BaseRepository` supports `PUT`, but a generic transport helper is not an
  ingredient update contract.
- Additional-ingredient create reloads its list after success. The other three
  create epics only mark submission successful and do not reload their lists.
- Existing epic failures use the application's error dialog. There is no
  ingredient update-pending state because no update flow exists.

## Confirmed backend paths

| Category | List | Create | Delete | Update |
| --- | --- | --- | --- | --- |
| Malt | `GET /malts` | `POST /malt` | `DELETE /malt/{id}` | **Not present** |
| Hop | `GET /hops` | `POST /hop` | `DELETE /hop/{id}` | **Not present** |
| Yeast | `GET /yeasts` | `POST /yeast` | `DELETE /yeast/{id}` | **Not present** |
| Additional ingredient | `GET /additionalingredients` | `POST /additionalingredient` | `DELETE /additionalingredient/{id}` | **Not present** |

## Compatibility impact and follow-up

Adding update endpoints is a database/backend contract change and must be
implemented and documented in that repository first. After those contracts are
available, the UI can add typed update actions, pending/success/failure state,
epics, repository methods, list refreshes, and a shared create/edit form without
inventing behavior.

Minimal import-created records such as `{ id, name: "Styrian Golding" }` are
already compatible with list rendering because absent optional/runtime values
render empty. A future edit form must normalize missing editable values to empty
form controls while retaining the existing ID. No special incomplete status or
Recipe Import V2 change is required.

## Test status

The requested edit behavior cannot be truthfully implemented or tested until an
update contract exists. Existing create behavior is intentionally unchanged.
Once unblocked, tests must cover all four categories, prefilling, ID retention,
cancel, failed saves, pending/double-submit prevention, list refresh, create
regression, and minimal import-created records.
