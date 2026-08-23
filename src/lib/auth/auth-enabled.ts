/** True when sign-in UI should be shown. `VITE_AUTH_ENABLED=false` is the off switch. */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";
