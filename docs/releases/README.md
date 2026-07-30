# Release notes

Each release gets one file named exactly after its tag, such as `v1.0.0.md`.
Versions and release names are fixed in `RELEASE.md`.

The file heading uses `🌊 digiwallsys — vMAJOR.MINOR.PATCH`. The next line uses
`Codename: *Exact mapped name* - Concise release outcome`. The outcome is
documentation, not part of the Git tag or GitHub release name.

`v1.0.0` is a pre-release named `Anchor`. Pre-release is GitHub release status;
it does not change the tag or version string.

Release status is tracked only in the README's app-version table, not repeated
inside individual release documents. Every release document follows
`Template.md`: overview, objectives, feature groups, changes, architecture
progress, compatibility, ownership, and release summary.

The current sequence extends through `v1.9.0` (`Crest`); see `RELEASE.md` for
the complete immutable version-to-name mapping.
