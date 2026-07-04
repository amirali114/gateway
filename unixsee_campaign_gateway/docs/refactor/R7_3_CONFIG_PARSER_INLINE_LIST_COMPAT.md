# R7.3 Config Parser Inline List Compatibility

R7.3 is a cleanup-only phase for Unixsee Campaign Gateway Agent configuration compatibility.

## What changed

The Agent's simple YAML parser now accepts inline list syntax for the known list field:

```text
policy.methods.managed
```

Before R7.3, this form could fail with an unknown-key or scalar-assignment error:

```yaml
policy:
  methods:
    managed: ["GET", "HEAD", "POST"]
```

R7.3 keeps the existing block-list syntax and adds inline-list compatibility.

## Supported formats

Block list:

```yaml
policy:
  methods:
    managed:
      - "GET"
      - "HEAD"
      - "POST"
```

Inline double-quoted list:

```yaml
policy:
  methods:
    managed: ["GET", "HEAD", "POST"]
```

Inline single-quoted list:

```yaml
policy:
  methods:
    managed: ['GET', 'HEAD', 'POST']
```

Inline unquoted list:

```yaml
policy:
  methods:
    managed: [GET, HEAD, POST]
```

Empty inline list:

```yaml
policy:
  methods:
    managed: []
```

This follows the existing defaulting behavior: if no managed methods survive policy defaulting, the safe default managed methods are restored.

## Parser scope

The parser is intentionally not a full YAML parser. R7.3 only enables inline list parsing for explicitly supported fields. Unknown list keys are still rejected.

Malformed lists fail clearly, for example:

```yaml
policy:
  methods:
    managed: ["GET", "POST"
```

This returns a clear `malformed inline list` parse error.

## Runtime behavior

No production behavior changes were made.

PHP remains the source of truth. The Agent remains shadow-only. No enforcement, queue behavior, ticket behavior, waiting-room rendering, redirect behavior, or WordPress loading behavior was changed.

## Why this matters

Config snippets often use compact inline arrays. Supporting the common inline form for `policy.methods.managed` reduces operator friction before R8 PostgreSQL persistence or dashboard work.
