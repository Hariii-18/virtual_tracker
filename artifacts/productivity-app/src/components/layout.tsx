import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  BarChart2,
  ListTodo,
  Lightbulb,
  History,
  User,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { removeToken } from "@/lib/auth";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();

  const handleLogout = () => {
    removeToken();
    setLocation("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/activities", label: "Activities", icon: ListTodo },
    { href: "/recommendations", label: "Insights", icon: Lightbulb },
    { href: "/history", label: "History", icon: History },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col fixed inset-y-0 left-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
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
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm font-medium"
            data-testid="btn-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 min-w-0">
        <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-sm font-medium text-muted-foreground capitalize">
            {location.split('/')[1] || 'Dashboard'}
          </h1>
          {user && (
            <div className="text-sm font-medium">
              {user.name}
            </div>
          )}
        </div>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
