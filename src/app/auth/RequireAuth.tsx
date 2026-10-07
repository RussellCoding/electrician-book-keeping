import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthProvider";
import { ShopProvider } from "./ShopProvider";
import { QueryState } from "../components/QueryState";

/** Sends signed-out users to /sign-in, then resolves their shop. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <QueryState />;
  if (!session) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  }

  return (
    // Keyed by user so a different sign-in starts with a fresh shop.
    <ShopProvider key={session.user.id} userId={session.user.id}>
      {children}
    </ShopProvider>
  );
}
