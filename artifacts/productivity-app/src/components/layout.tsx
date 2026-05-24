import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  LayoutDashboard, BarChart2, ListTodo, Lightbulb, History, User, LogOut, Menu, X,
} from "lucide-react";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { removeToken } from "@/lib/auth";
import { useGuest } from "@/contexts/guest-context";
import { GuestBanner } from "./guest-banner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/activities", label: "Activities", icon: ListTodo },
  { href: "/recommendations", label: "Insights", icon: Lightbulb },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isGuest, exitGuestMode, profile: guestProfile } = useGuest();

  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: !isGuest, retry: false } });
  const displayName = isGuest ? guestProfile.name : (user?.name ?? "");

  const handleLogout = () => {
    if (isGuest) {
      exitGuestMode();
      setLocation("/login");
    } else {
      removeToken();
      setLocation("/login");
    }
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2 text-primary">
          <BarChart2 className="w-6 h-6" />
          <span className="font-bold text-lg text-sidebar-foreground">ProdIntel</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border flex-shrink-0">
        {isGuest && (
          <div className="mb-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted rounded-md">
            Guest Mode
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          {isGuest ? "Exit Guest Mode" : "Logout"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-col fixed inset-y-0 left-0 hidden md:flex z-30">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-border flex flex-col z-50 transition-transform duration-300 md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 min-w-0 flex flex-col min-h-[100dvh]">
        <GuestBanner />
        <div className="h-14 md:h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-medium text-muted-foreground capitalize">
              {location.split("/")[1] || "Dashboard"}
            </h1>
          </div>
          {displayName && (
            <div className="text-sm font-medium truncate max-w-[140px]">
              {displayName}
            </div>
          )}
        </div>
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
