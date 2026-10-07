import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

/** Loading spinner or error card for a page whose data hasn't arrived. */
export function QueryState({ error, onRetry }: { error?: Error; onRetry?: () => void }) {
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
            <div>
              <p className="font-medium">Couldn't load this page</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
            {onRetry && <Button onClick={onRetry}>Try again</Button>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-12 text-muted-foreground" role="status">
      <Loader2 className="w-6 h-6 animate-spin" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
