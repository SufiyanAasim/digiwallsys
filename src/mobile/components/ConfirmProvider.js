import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { logoutUser } from '../api';
import { clearSession } from '../session';
import { resetToLogin } from '../navigation';
import ConfirmDialog from './ConfirmDialog';

const ConfirmContext = createContext({
  confirm: async () => false,
  choose: async () => null,
  requestLogout: () => {},
});

// One in-app dialog for every confirmation, so destructive actions never fall
// back to window.confirm() on web (browsers suppress it, and it ignores the
// design system). `confirm()` resolves true/false like window.confirm does.
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setDialog(options);
  }), []);

  // Single-select list. Resolves the chosen value, or null if dismissed.
  const choose = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setDialog(options);
  }), []);

  const settle = useCallback((result) => {
    const resolve = resolver.current;
    resolver.current = null;
    setDialog(null);
    setBusy(false);
    if (resolve) resolve(result);
  }, []);

  const requestLogout = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Are you sure you want to log out?',
      message: 'Logging out revokes the current refresh token and clears secure local tokens on this device.',
      confirmLabel: 'Log out',
      destructive: true,
    });
    if (!confirmed) return;
    // Clear the local session even if the API is unreachable, so the user is
    // never left signed in on this device after confirming.
    try { await logoutUser(); } catch { /* revoked locally below regardless */ }
    await clearSession();
    resetToLogin();
  }, [confirm]);

  return (
    <ConfirmContext.Provider value={{ confirm, choose, requestLogout }}>
      {children}
      <ConfirmDialog
        visible={!!dialog}
        title={dialog?.title || ''}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel || 'Confirm'}
        cancelLabel={dialog?.cancelLabel || 'Cancel'}
        destructive={!!dialog?.destructive}
        options={dialog?.options || null}
        busy={busy}
        onConfirm={(value) => {
          if (dialog?.options) { settle(value); return; }
          setBusy(true);
          settle(true);
        }}
        onCancel={() => settle(dialog?.options ? null : false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext).confirm;
}

export function useChoose() {
  return useContext(ConfirmContext).choose;
}

export function useLogout() {
  const { requestLogout } = useContext(ConfirmContext);
  return { requestLogout };
}
