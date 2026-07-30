import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAppTheme } from '../../ThemeContext';

const STYLE_ID = 'digiwallsys-scrollbar-theme';

// react-native-web offers no way to style a scrollbar from a StyleSheet:
// `::-webkit-scrollbar` is a pseudo-element and `scrollbar-color` is inherited
// CSS, neither of which has an RN style equivalent. Injecting a single <style>
// tag and rewriting it whenever the palette changes is the only route, and it
// stops the browser painting a stark default light scrollbar down the edge of
// the dark Aurora Glass surfaces.
//
// Renders nothing; mounted once inside the theme provider.
export default function ScrollbarTheme() {
  const { colors } = useAppTheme();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    // The thumb carries the actual Aurora Glass gradient rather than a flat
    // tint, so the bar reads as part of the brand instead of a browser
    // control bolted onto the edge. An earlier pass inset it by 3px on a
    // 10px bar, which left ~4px of visible thumb and looked like a thin
    // broken line -- keep the bar wide enough and the inset to 2px so the
    // pill stays legible against the surface.
    // The two styling systems are mutually exclusive, not additive: per spec a
    // browser that honours `scrollbar-width`/`scrollbar-color` ignores every
    // `::-webkit-scrollbar` rule for that element. Setting both -- as an
    // earlier pass did -- silently threw the gradient away in Chrome and left
    // a plain thin overlay bar. So the standard properties are scoped to
    // engines with no `::-webkit-scrollbar` support (Firefox), which also
    // cannot render a gradient thumb and take a solid colour instead.
    const [from, to] = colors.gradientPrimary;
    style.textContent = `
      /* Expo's web reset ships \`body { overflow: hidden }\` for app-like
         behaviour. The viewport takes its overflow from <html>, or from <body>
         when <html> is \`visible\` -- which it is here -- so that one rule
         suppressed the viewport scrollbar entirely: the document still
         scrolled (<html> carries scrollTop) but nothing was drawn to drag.
         Handing the propagation back \`visible\` restores the bar without
         making <body> its own scroll container, which would stop the page
         scrolling at all. */
      body { overflow-y: visible; }

      /* AmbientLayer stays fixed so the live viewport is always painted while
         a long page scrolls. Keep the document canvas on the same palette as a
         defensive fallback for full-page capture/printing and any compositor
         frame where content extends beyond that fixed viewport. */
      html, body, #root { background-color: ${colors.background}; }

      @supports not selector(::-webkit-scrollbar) {
        * {
          scrollbar-width: thin;
          scrollbar-color: ${colors.primary} ${colors.surfaceMuted};
        }
      }
      ::-webkit-scrollbar { width: 12px; height: 12px; }
      ::-webkit-scrollbar-track {
        background: ${colors.surfaceMuted};
        border-radius: 999px;
      }
      ::-webkit-scrollbar-thumb {
        background-image: linear-gradient(180deg, ${from}, ${to});
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-image: linear-gradient(180deg, ${to}, ${from});
      }
      ::-webkit-scrollbar-corner { background: transparent; }
    `;
  }, [colors]);

  return null;
}
