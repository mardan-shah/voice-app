"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";

export function useAuth(requireAuth = false) {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const metadata = session.user.user_metadata;
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          username: metadata?.username || metadata?.full_name || metadata?.name || "User",
          createdAt: new Date(session.user.created_at),
        });
      } else {
        setUser(null);
        if (requireAuth) {
          router.push("/login");
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const metadata = session.user.user_metadata;
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          username: metadata?.username || metadata?.full_name || metadata?.name || "User",
          createdAt: new Date(session.user.created_at),
        });
      } else {
        setUser(null);
        if (requireAuth) {
          router.push("/login");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [requireAuth, router, setLoading, setUser]);

  return { user, isLoading };
}
