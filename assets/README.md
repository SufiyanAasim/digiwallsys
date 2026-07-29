# Shared assets

Repository-level brand and social-preview assets belong here. Mobile runtime
images remain in `src/mobile/assets` so Expo can bundle them.

| File | Use |
| --- | --- |
| `logo-glass.png` | Square "d/i" monogram, README/social preview |
| `logo-glass-alt-rounded.png`, `logo-glass-alt-square.png` | Darker smoked-glass monogram variants |
| `logo.svg` | Scalable monogram for docs |
| `wordmark-ember-glass.svg` | Transparent rose-to-amber wordmark for the README |
| `wordmark-glass-alt.png` | Smoked-glass "digiwallsys" wordmark (brand use) |

These are **marketing assets only** — nothing here is bundled into the app.

The two marks the app itself ships are under `src/mobile/assets/`:

| File | Use | Source |
| --- | --- | --- |
| `icon-app.png` | Launcher icon and splash — the badged square | design tool |
| `favicon.png` | Browser tab — the bare "di" monogram on transparency | `scripts/generate-favicon.js` |

The favicon is deliberately not the launcher icon. A tab renders it at roughly
16px, where the badge's gradient fill swallows the glyphs and the mark reads as
a plain coloured square. Dropping the badge leaves only the letterforms, which
still resolve at that size. Regenerate it with:

```bash
node scripts/generate-favicon.js
```

The glyphs there are drawn as geometry rather than text, so the output does not
depend on which fonts the build machine happens to have installed.

The wordmark shown inside the app is not artwork: `components/Wordmark.js` draws
the text with the Ember Glass gradient applied to the glyphs. The PNG wordmarks
have their gradient baked in as an opaque rectangle, so on screen they read as a
coloured box rather than a mark on the page, and they cannot follow the
light/dark theme. Use the component in the UI and keep the PNGs for README,
social previews, and anywhere an image file is required.
