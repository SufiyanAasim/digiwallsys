# Release process

`digiwallsys` uses the exact release versions and names listed below. Release
documents present the mapped name as a codename with a short descriptive
outcome, while Git tags and GitHub release titles remain exact.

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
| `v1.5.5` | Armada | Full application-layer integration milestone. |
| `v1.6.0` | Lantern | Mobile "Ember Glass" design system and brand identity. |
| `v1.6.5` | Marina | Web dashboard sidebar shell and navigation architecture. |
| `v1.7.0` | Compass | Real-data analytics: spend breakdown and spending alerts. |
| `v1.7.5` | Convoy | Savings goals, budgets, calendar, tagging, statements, alerts. |
| `v1.8.0` | Estuary | Multi-currency wallets and shared/family wallets. |

## Exact naming rules

- The Git tag is the exact version, for example `v1.0.0`.
- The GitHub release name is the exact mapped name, for example `Anchor`.
- Do not add `digiwallsys`, an emoji, a subtitle, or any other prefix or suffix
  to the tag or GitHub release title.
- Release documents use
  `> Codename: *Exact mapped name* - Concise release outcome`; that description
  is not part of the mapped release name.
- `v1.0.0` is marked as a GitHub pre-release, but its version remains exactly
  `v1.0.0`. Do not append `alpha`, `beta`, `rc`, or another identifier.
- Later release status is decided when that release is prepared; its mapped
  version and name must not change.

## Feature scope

`ROADMAP.md` is the source of truth for the features assigned to every fixed
version. Features move through the sequence only through an explicit roadmap
change; the version and release name themselves never change.

## Before the release

1. Merge the area branches (`backend`, `frontend`, and `database`) into `main`,
   then create `release/vMAJOR.MINOR.PATCH` from the clean, current `main`.
2. Run `npm ci`, `npm run verify`, and the production mobile build.
3. Test database migrations and transfer rollback behavior cleanly. Confirm that
   every migration in `config/migrations` is listed in `config/database.sql`, so
   a database created from scratch matches one built by migrating forward.
4. Update `CHANGELOG.md` with concise change entries.
5. Complete the matching file in `docs/releases`.

## Publish

1. Merge the release branch into `main`.
2. Create an annotated, cryptographically signed tag on that exact commit,
   using the mapped name as its annotation (for example
   `git tag -s v1.8.0 -m Estuary`), then push that tag.
3. Run the release workflow from the same tag ref and enter that exact version,
   including `v`, as the workflow input. The workflow refuses unsigned,
   lightweight, or mismatched tags.
4. Confirm that the verified tag and release name match the table exactly.
5. Publish checksums alongside platform artifacts.
6. Confirm `main` contains the tagged commit, fast-forward `backend`, `frontend`,
   and `database` to the released `main`, remove the temporary release branch,
   and monitor the release.
