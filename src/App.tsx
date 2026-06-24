import { LocalAuthProvider } from "./auth/AuthContext";
import { SupabaseAuthProvider } from "./auth/SupabaseAuthProvider";
import { useAuth } from "./auth/context";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { StoreProvider } from "./store/StoreContext";
import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./components/auth/AuthScreen";
import { ChangePasswordScreen } from "./components/auth/ChangePasswordScreen";
import "./styles.css";

export function App() {
  const Provider = isSupabaseConfigured() ? SupabaseAuthProvider : LocalAuthProvider;
  return (
    <Provider>
      <Root />
    </Provider>
  );
}

function Root() {
  const { ready, currentUser, passwordRecovery } = useAuth();
  if (!ready) return <div className="boot" />;
  // Arrived from a reset-password email → set a new password first.
  if (passwordRecovery) return <ChangePasswordScreen />;
  if (!currentUser) return <AuthScreen />;
  if (currentUser.mustChangePassword) return <ChangePasswordScreen />;
  return (
    <StoreProvider key={currentUser.id} userId={currentUser.id}>
      <AppShell />
    </StoreProvider>
  );
}
