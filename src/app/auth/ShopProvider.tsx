import { createContext, useContext, type ReactNode } from "react";
import { getCurrentMembership } from "../data/shop";
import type { ShopMembership } from "../data/types";
import { useAsync } from "../data/useAsync";
import { useAuth } from "./AuthProvider";
import { QueryState } from "../components/QueryState";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const ShopContext = createContext<ShopMembership | null>(null);

/**
 * Loads the signed-in user's shop and makes it available through useShop().
 * Children render only once a shop is resolved.
 */
export function ShopProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { signOut } = useAuth();
  const { data, error, loading, reload } = useAsync(() => getCurrentMembership(userId), [userId]);

  if (loading || error) {
    return <QueryState error={loading ? undefined : error} onRetry={reload} />;
  }

  if (!data) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="font-medium">Your account isn't part of a shop yet.</p>
            <p className="text-sm text-muted-foreground">Ask the shop owner to add you.</p>
            <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ShopContext.Provider value={data}>{children}</ShopContext.Provider>;
}

/** The current shop, its settings (tax rate, labor rate), and the user's role in it. */
export function useShop(): ShopMembership {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop must be used inside ShopProvider");
  return value;
}
