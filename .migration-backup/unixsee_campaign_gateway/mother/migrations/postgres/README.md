# Mother PostgreSQL migrations

R9.9 adds the PostgreSQL production storage profile and schema contract. The SQL files are idempotent and non-destructive.

The offline release build intentionally does not vendor a PostgreSQL driver because the build environment cannot reach the public Go proxy. Enabling `storage.engine=postgres` fails safe unless the Mother binary is rebuilt with a real PostgreSQL driver/profile.
