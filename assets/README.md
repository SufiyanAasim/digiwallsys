# Shared assets

Repository-level brand and social-preview assets belong here. Mobile runtime
images remain in `src/mobile/assets` so Expo can bundle them.

| File | Use |
| --- | --- |
| `logo-glass.png` | Current Aurora Glass square "d/i" monogram |
| `logo.svg` | Current scalable Aurora Glass monogram |
| `wordmark-aurora-glass.svg` | Current transparent mint-to-cyan wordmark |
| `wordmark-glass-alt.png` | Current raster Aurora Glass wordmark |
| `logo-ember-glass.*`, `wordmark-ember-glass.*` | Preserved v1.6-v1.8 Ember Glass identity |

These are **marketing assets only** — nothing here is bundled into the app.

The two marks the app itself ships are under `src/mobile/assets/`:

| File | Use | Source |
| --- | --- | --- |
| `icon-app.png` | Launcher icon and splash — the badged square | `scripts/generate-brand-assets.js` |
| `icon-adaptive-foreground.png` | Android adaptive icon foreground | `scripts/generate-brand-assets.js` |
| `favicon.png` | Browser tab — the bare "di" monogram on transparency | `scripts/generate-favicon.js` |

The prior mobile marks are preserved in `src/mobile/assets/ember-glass/`.

The favicon is deliberately not the launcher icon. A tab renders it at roughly
16px, where the badge's gradient fill swallows the glyphs and the mark reads as
a plain coloured square. Dropping the badge leaves only the letterforms, which
still resolve at that size. Regenerate it with:

```bash
node scripts/generate-favicon.js
node scripts/generate-brand-assets.js
```

The glyphs there are drawn as geometry rather than text, so the output does not
depend on which fonts the build machine happens to have installed.

The wordmark shown inside the app is not artwork: `components/Wordmark.js` draws
the text with the Aurora Glass gradient applied to the glyphs. The PNG wordmarks
have their gradient baked in as an opaque rectangle, so on screen they read as a
coloured box rather than a mark on the page, and they cannot follow the
light/dark theme. Use the component in the UI and keep the PNGs for README,
social previews, and anywhere an image file is required.
