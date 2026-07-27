import { createNavigationContainerRef } from '@react-navigation/native';

// Shared navigation ref so non-screen components (the web sidebar, the logout
// dialog) can navigate without prop-drilling or importing App.js circularly.
export const navigationRef = createNavigationContainerRef();

export function navigate(route, params) {
  if (navigationRef.current?.isReady()) navigationRef.current.navigate(route, params);
}

export function currentRouteName() {
  return navigationRef.current?.getCurrentRoute()?.name || 'Login';
}

// After signing out, replace the stack so Back cannot re-enter an authed screen.
export function resetToLogin() {
  if (navigationRef.current?.isReady()) {
    navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
  }
}
