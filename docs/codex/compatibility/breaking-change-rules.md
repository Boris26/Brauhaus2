# Breaking-change rules

## Breaking changes require cross-repo review

Treat these as breaking unless proven otherwise:

- renaming API paths,
- changing HTTP methods,
- changing response status codes,
- changing response shape,
- changing required request fields,
- changing ID format or stability,
- changing time units,
- changing temperature units or rounding,
- changing enum/string values,
- changing database field names used by the UI,
- changing control status fields used by the UI,
- changing initial values such as empty string vs object,
- removing legacy fallback fields.

## Preferred migration pattern

When a breaking change is needed:

1. add the new field or endpoint while keeping the old one,
2. update consumers,
3. update Codex docs,
4. mark the old behavior as deprecated,
5. remove the old behavior only after consumers have migrated.

## Documentation requirement

Every compatibility-relevant code change must update the matching file in `docs/codex/` or add a `Needs verification` note.
