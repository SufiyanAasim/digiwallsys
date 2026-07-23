import 'react-native-gesture-handler';
import { Alert, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';

if (Platform.OS === 'web') {
  enableScreens(false);
  
  // Polyfill Alert.alert for Web to handle buttons and callbacks cleanly
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (Array.isArray(buttons) && buttons.length > 0) {
      const confirmButton = buttons.find((b) => b.style === 'destructive' || b.text !== 'Cancel');
      const cancelButton = buttons.find((b) => b.text === 'Cancel');
      if (confirmButton && cancelButton) {
        if (window.confirm(text)) {
          if (confirmButton.onPress) confirmButton.onPress();
        } else {
          if (cancelButton.onPress) cancelButton.onPress();
        }
        return;
      }
      for (const btn of buttons) {
        if (btn.onPress) {
          btn.onPress();
          break;
        }
      }
      return;
    }
    window.alert(text);
  };
}

import App from './App';

registerRootComponent(App);

