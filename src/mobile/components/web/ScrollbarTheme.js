import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAppTheme } from '../../ThemeContext';

const STYLE_ID = 'digiwallsys-scrollbar-theme';

// react-native-web offers no way to style a scrollbar from a StyleSheet:
// `::-webkit-scrollbar` is a pseudo-element and `scrollbar-color` is inherited
// CSS, neither of which has an RN style equivalent. Injecting a single <style>
// tag and rewriting it whenever the palette changes is the only route, and it
// stops the browser painting a stark default light scrollbar down the edge of
// the dark Ember Glass surfaces.
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

    // The thumb carries the actual Ember Glass gradient rather than a flat
    // tint, so the bar reads as part of the brand instead of a browser
    // control bolted onto the edge. An earlier pass inset it by 3px on a
    // 10px bar, which left ~4px of visible thumb and looked like a thin
    // broken line -- keep the bar wide enough and the inset to 2px so the
    // pill stays legible against the surface.
    const [from, to] = colors.gradientPrimary;
    style.textContent = `
      * {
        scrollbar-width: thin;
        scrollbar-color: ${colors.primary} ${colors.surfaceMuted};
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
