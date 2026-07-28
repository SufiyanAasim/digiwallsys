import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { logoutUser } from '../api';
import { clearSession } from '../session';
import { resetToLogin } from '../navigation';
import ConfirmDialog from './ConfirmDialog';
import { setAlertHandler } from './alertBridge';

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
  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef(null);

  // `visible` and the dialog's own content both come from `dialog`/`alert`,
  // so closing it (setDialog(null)/setAlert(null)) flips both in the same
  // render — but Modal's fade-out keeps the content mounted for the
  // animation's duration, and it re-renders with whatever `dialog`/`alert`
  // is *now*, not what it was when the close began. With the content read
  // directly from `dialog`/`alert`, that meant a fading-out dialog would
  // flash blank title text and the generic default "Cancel"/"Confirm"
  // labels for the remainder of the animation — a distinct, unlabeled box
  // that appeared to pop up behind the real one and vanish within
  // milliseconds. Keeping the last non-null content separately from the
  // visibility flag means the fade-out always shows the dialog that was
  // actually open, never a blank placeholder.
  // Set together with dialog/alert (not derived from them via an effect) so
  // the very first open render already has the right content instead of
  // waiting one extra render for an effect to catch up.
  const [dialogContent, setDialogContent] = useState(null);
  const [alertContent, setAlertContent] = useState(null);

  // Route Alert.alert(title, message) through this dialog on web. Kept in its
  // own state so an informational alert can never clobber an open confirm.
  useEffect(() => {
    setAlertHandler((title, message) => {
      const value = { title, message };
      setAlertContent(value);
      setAlert(value);
    });
    return () => setAlertHandler(null);
  }, []);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setDialogContent(options);
    setDialog(options);
  }), []);

  // Single-select list. Resolves the chosen value, or null if dismissed.
  const choose = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setDialogContent(options);
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
        title={dialogContent?.title || ''}
        message={dialogContent?.message}
        confirmLabel={dialogContent?.confirmLabel || 'Confirm'}
        cancelLabel={dialogContent?.cancelLabel || 'Cancel'}
        destructive={!!dialogContent?.destructive}
        options={dialogContent?.options || null}
        busy={busy}
        onConfirm={(value) => {
          if (dialog?.options) { settle(value); return; }
          setBusy(true);
          settle(true);
        }}
        onCancel={() => settle(dialog?.options ? null : false)}
      />
      <ConfirmDialog
        visible={!!alert}
        title={alertContent?.title || ''}
        message={alertContent?.message}
        confirmLabel="OK"
        infoOnly
        onConfirm={() => setAlert(null)}
        onCancel={() => setAlert(null)}
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
