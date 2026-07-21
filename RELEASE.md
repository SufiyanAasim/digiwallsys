# Release process

`digiwallsys` uses the exact release versions and names listed below. A release
name is not a codename and must not be extended with a subtitle.

| Version | Name | Purpose |
| --- | --- | --- |
| `v1.0.0` | Anchor | Stable base for incoming/outgoing payments. |
| `v1.0.5` | Drift | Initial adjustments and flow refinement. |
| `v1.1.0` | Current | Setting the primary flow of funds in motion. |
| `v1.1.5` | Swell | Scaling capacity for transaction volume. |
| `v1.2.0` | Passage | Secure movement of funds across gateways. |
| `v1.2.5` | Gale | Stress testing and high-speed optimization. |
| `v1.3.0` | Harbor | Dashboard for holding and managing funds. |
| `v1.3.5` | Beacon | Enhanced visibility, reporting, and alerts. |
| `v1.4.0` | Voyage | Expanding to multi-currency or broader markets. |
| `v1.4.5` | Trade | Refining business-to-business transaction logic. |
| `v1.5.0` | Meridian | Global alignment and high-precision accuracy. |
| `v1.5.5` | Armada | Full-scale ecosystem, ready for wide release. |

## Exact naming rules

- The Git tag is the exact version, for example `v1.0.0`.
- The GitHub release name is the exact mapped name, for example `Anchor`.
- Do not add `digiwallsys`, an emoji, a subtitle, or any other prefix or suffix.
- `v1.0.0` is marked as a GitHub pre-release, but its version remains exactly
  `v1.0.0`. Do not append `alpha`, `beta`, `rc`, or another identifier.
- Later release status is decided when that release is prepared; its mapped
  version and name must not change.

## Feature scope

`ROADMAP.md` is the source of truth for the features assigned to every fixed
version. Features move through the sequence only through an explicit roadmap
change; the version and release name themselves never change.

## Before the release

1. Create `release/vMAJOR.MINOR.PATCH` from `develop`.
2. Run `npm ci`, `npm run verify`, and the production mobile build.
3. Test database migrations and transfer rollback behavior cleanly.
4. Update `CHANGELOG.md` with concise change entries.
5. Complete the matching file in `docs/releases`.

## Publish

1. Merge the release branch into `main`.
2. Run the release workflow using the exact version including `v`.
3. Confirm that the generated tag and release name match the table exactly.
4. Publish checksums alongside platform artifacts.
5. Merge the release branch back into `develop` and monitor the release.
