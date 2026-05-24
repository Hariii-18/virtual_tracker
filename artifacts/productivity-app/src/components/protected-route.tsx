import { useEffect } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";
import { useGuest } from "@/contexts/guest-context";

export function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const { isGuest } = useGuest();
  const token = getToken();

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !isGuest && !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (!isGuest && (!token || isError)) {
      setLocation("/login");
    }
  }, [isGuest, token, isError, setLocation]);

  if (!isGuest && (!token || isError)) return null;

  if (!isGuest && (isLoading || (!user && !!token))) {
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
