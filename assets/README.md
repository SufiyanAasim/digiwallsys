# Shared assets

Repository-level brand and social-preview assets belong here. Mobile runtime
images remain in `src/mobile/assets` so Expo can bundle them.

| File | Use |
| --- | --- |
| `logo-glass.png` | Square "d/i" monogram, README/social preview |
| `logo-glass-alt-rounded.png`, `logo-glass-alt-square.png` | Darker smoked-glass monogram variants |
| `logo.svg` | Scalable monogram for docs |
| `wordmark-glass-alt.png` | Smoked-glass "digiwallsys" wordmark (brand use) |

These are **marketing assets only** — nothing here is bundled into the app.

The wordmark shown inside the app is not artwork: `components/Wordmark.js` draws
the text with the Ember Glass gradient applied to the glyphs. The PNG wordmarks
have their gradient baked in as an opaque rectangle, so on screen they read as a
coloured box rather than a mark on the page, and they cannot follow the
light/dark theme. Use the component in the UI and keep the PNGs for README,
social previews, and anywhere an image file is required.
