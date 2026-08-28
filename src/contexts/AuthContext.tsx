export function AuthProvider({ children }: { children?: unknown }) {
  return children as never;
}
export function useAuth() {
  return { user: null, loading: false, signIn: async () => {}, signOut: async () => {} };
}
