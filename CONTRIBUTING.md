# Contributing

Thank you for contributing to `digiwallsys`.

## Workflow

1. Open or select an issue.
2. Branch from `develop` using `feature/`, `bugfix/`, `docs/`, `test/`,
   `security/`, or another documented prefix.
3. Use Conventional Commits, for example `fix(api): make transfers atomic`.
4. Keep secrets, personal data, and production credentials out of the repo.
5. Run `npm install` and `npm run verify`.
6. Open a focused pull request using the provided template.

Changes to money movement must include tests for validation, insufficient
balance, rollback behavior, and concurrent updates.
