# Shared assets

Repository-level brand and social-preview assets belong here. Mobile runtime
images remain in `src/mobile/assets` so Expo can bundle them.

| File | Use |
| --- | --- |
| `logo-glass.png` | Square "d/i" monogram, README/social preview |
| `logo-glass-alt-rounded.png`, `logo-glass-alt-square.png` | Darker smoked-glass monogram variants |
| `logo.svg` | Scalable monogram for docs |
| `wordmark-glass-alt.png` | Smoked-glass "digiwallsys" wordmark (brand use) |

The light **wordmark used at runtime** lives at `src/mobile/assets/wordmark.png`
(2172x724, exactly 3:1) because Expo can only bundle assets under the mobile
project root. It is rendered on the sign-in and account-security screens; keep a
single copy there rather than duplicating it back into this folder.
