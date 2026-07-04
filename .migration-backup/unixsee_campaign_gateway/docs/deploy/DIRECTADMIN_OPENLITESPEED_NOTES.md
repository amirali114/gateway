# DirectAdmin / OpenLiteSpeed Notes

R8D does not modify DirectAdmin, OpenLiteSpeed, Apache, Nginx, vhost files, rewrite rules, or `.htaccess`.

Current integration is shadow-only:

- PHP Gateway remains source of truth.
- Agent receives optional shadow payloads only.
- Mother is a local/dev policy provider.
- Dashboard is read-only.

Future phases may add explicit web server integration guidance, but this package intentionally avoids automatic vhost or rewrite changes.

Before any future OLS/DirectAdmin integration:

- test on backup/staging server
- confirm local-only bind behavior
- confirm no public dashboard exposure
- prepare rollback
- avoid editing production vhosts without explicit approval
