# Legacy Directory — Not Active

`ux_gateway/` is a legacy/reference MVC-style implementation that is kept only for review and historical comparison.

It is **not** part of the active Unixsee Campaign Gateway R4.x runtime path.

The active runtime entry points remain the root-level PHP files such as `gateway.php`, `admin.php`, `ux_admin_panel.php`, `ux_storage.php`, and related root-level modules.

## Safety rules

- Do not expose this directory as a public web root.
- Do not route production traffic to `ux_gateway/public/index.php`.
- Do not use `ux_gateway/app/bootstrap.php` for production routing.
- Do not enable this legacy tree without a separate dependency review.
- Future removal is allowed only after confirming no active runtime dependency exists.

## Current R4.2 dependency check

A repository-wide check for direct active includes/requires of `ux_gateway/app/bootstrap.php` and `ux_gateway/public/index.php` found no dependency from the active root-level PHP runtime.

The directory is therefore quarantined, not deleted.
