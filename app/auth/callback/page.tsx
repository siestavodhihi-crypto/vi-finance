"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace("/");
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/");
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return (
    <div className="max-w-md mx-auto p-6">
      <PageSkeleton />
    </div>
  );
}
