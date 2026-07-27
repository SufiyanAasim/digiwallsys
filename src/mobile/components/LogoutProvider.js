import React, { createContext, useCallback, useContext, useState } from 'react';
import { logoutUser } from '../api';
import { clearSession } from '../session';
import { resetToLogin } from '../navigation';
import ConfirmDialog from './ConfirmDialog';

const LogoutContext = createContext({ requestLogout: () => {} });

export function LogoutProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestLogout = useCallback(() => setVisible(true), []);

  const confirm = useCallback(async () => {
    setBusy(true);
    // Clear the local session even if the API is unreachable, so the user is
    // never left signed in on this device after confirming.
    try { await logoutUser(); } catch { /* revoked locally below regardless */ }
    await clearSession();
    setBusy(false);
    setVisible(false);
    resetToLogin();
  }, []);

  return (
    <LogoutContext.Provider value={{ requestLogout }}>
      {children}
      <ConfirmDialog
        visible={visible}
        title="Are you sure you want to log out?"
        message="Logging out revokes the current refresh token and clears secure local tokens on this device."
        confirmLabel="Log out"
        cancelLabel="Cancel"
        destructive
        busy={busy}
        onConfirm={confirm}
        onCancel={() => !busy && setVisible(false)}
      />
    </LogoutContext.Provider>
  );
}

export function useLogout() {
  return useContext(LogoutContext);
}
