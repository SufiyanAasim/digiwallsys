# Contributing

Thank you for contributing to `digiwallsys`.

## Branches

The repository is a single monorepo; the long-lived branches divide it by area
so work in one part does not sit in the way of another.

| Branch | Covers |
| --- | --- |
| `main` | Released, deployable state. The default branch. |
| `backend` | `src/backend` — Express API, services, workers |
| `frontend` | `src/mobile` — the shared mobile + web client |
| `database` | `config/migrations`, `config/database.sql`, schema work |

Every branch holds the whole repository, not a slice of it: the workspaces
depend on each other, and `npm run verify` has to be able to run anywhere.

## Workflow

1. Open or select an issue.
2. Branch from the area branch your change belongs to (`backend`, `frontend`, or
   `database`), using `feature/`, `bugfix/`, `docs/`, `test/`, `security/`, or
   another documented prefix. A change that spans areas branches from `main`.
3. Use Conventional Commits, for example `fix(api): make transfers atomic`.
4. Keep secrets, personal data, and production credentials out of the repo.
5. Run `npm install` and `npm run verify`.
6. Open a focused pull request using the provided template.

Changes to money movement must include tests for validation, insufficient
balance, rollback behavior, and concurrent updates.
