import 'react-native-gesture-handler';
import { Alert, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';
import { dispatchAlert } from './components/alertBridge';

if (Platform.OS === 'web') {
  enableScreens(false);

  // Render Alert.alert through the in-app dialog. Browsers suppress
  // window.alert/confirm in embedded contexts, and they ignore the design
  // system, so those are only a fallback for the window before React mounts.
  // Anything needing a real choice uses useConfirm()/useChoose() directly —
  // collapsing a button list to window.confirm() silently picked the first
  // option, which is why category tagging was broken here.
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');

    if (Array.isArray(buttons) && buttons.length > 0) {
      const confirmButton = buttons.find((b) => b.style !== 'cancel' && b.text !== 'Cancel');
      const cancelButton = buttons.find((b) => b.style === 'cancel' || b.text === 'Cancel');
      if (confirmButton && cancelButton) {
        if (window.confirm(text)) confirmButton.onPress?.();
        else cancelButton.onPress?.();
        return;
      }
      buttons.find((b) => b.onPress)?.onPress?.();
      return;
    }

    if (dispatchAlert(title, message)) return;
    window.alert(text);
  };
}

import App from './App';

registerRootComponent(App);

