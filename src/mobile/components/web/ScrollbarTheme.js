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

    // A transparent track with a content-box-clipped thumb gives the bar an
    // inset pill instead of a full-width slab, so it reads as part of the
    // surface rather than a browser control bolted onto the edge.
    style.textContent = `
      * {
        scrollbar-width: thin;
        scrollbar-color: ${colors.borderStrong} transparent;
      }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background-color: ${colors.borderStrong};
        border-radius: 999px;
        border: 3px solid transparent;
        background-clip: content-box;
      }
      ::-webkit-scrollbar-thumb:hover { background-color: ${colors.primary}; }
      ::-webkit-scrollbar-corner { background: transparent; }
    `;
  }, [colors]);

  return null;
}
