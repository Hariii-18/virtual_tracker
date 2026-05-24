import { useGuest } from "@/contexts/guest-context";
import { useLocation, Link } from "wouter";
import { UserPlus, X } from "lucide-react";
import { useState } from "react";

export function GuestBanner() {
  const { isGuest } = useGuest();
  const [dismissed, setDismissed] = useState(false);
  const [, setLocation] = useLocation();

  if (!isGuest || dismissed) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-primary font-medium">
        <UserPlus className="w-4 h-4 flex-shrink-0" />
        <span>You're browsing as a Guest — data is stored locally only.</span>
        <Link
          href="/register"
          className="underline hover:no-underline font-semibold ml-1"
          onClick={() => {}}
        >
          Sign up to save permanently
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
