const BEFORE_SIGN_OUT = "lumen:before-sign-out";

/** Let an open editor cancel sign-out before its session is destroyed. */
export function confirmSignOut() {
  return window.dispatchEvent(new Event(BEFORE_SIGN_OUT, { cancelable: true }));
}

export function registerSignOutGuard(confirmDiscard: () => boolean) {
  const guard = (event: Event) => { if (!confirmDiscard()) event.preventDefault(); };
  window.addEventListener(BEFORE_SIGN_OUT, guard);
  return () => window.removeEventListener(BEFORE_SIGN_OUT, guard);
}
