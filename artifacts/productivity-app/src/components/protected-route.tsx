import { useEffect } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";
import { useGetMe } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  const token = getToken();
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false
    }
  });

  useEffect(() => {
    if (!token || isError) {
      setLocation("/login");
    }
  }, [token, isError, setLocation]);

  if (!token || isError) return null;

  if (isLoading || !user) {
    return (
      <Layout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}
