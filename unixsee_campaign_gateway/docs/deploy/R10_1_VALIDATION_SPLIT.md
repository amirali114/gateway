# R10.1 Validation Split

R10.1 separates source validation from installed runtime validation.

`deploy/scripts/validate-source-release.sh` validates the clean ZIP/source tree. It fails on `node_modules`, `.next`, runtime state files, committed secrets, and a non-minimal public wrapper.

`deploy/scripts/validate-installed-runtime.sh` validates a built installation. It allows Dashboard `.next` and `node_modules` where expected, but still scans browser static chunks for secret leakage and checks public wrapper exposure.

`deploy/scripts/validate-production-readiness.sh` is now an installed-runtime validator. Do not run source-only scans against a built server tree.
