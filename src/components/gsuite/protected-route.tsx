"use client";

import { redirect, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useGSuiteAuth } from "@/hooks/use-gsuite-auth";
import { useGSuiteAuthStore } from "@/stores/gsuite-auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function GSuiteProtected({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isSuperAdmin, error } = useGSuiteAuth();
  const { isTokenExpired, logout } = useGSuiteAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    if (isAuthenticated && isTokenExpired()) {
      logout();
    }
  }, [isAuthenticated, isTokenExpired, logout]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="mt-4 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    redirect(`/gsuite/login?from=${encodeURIComponent(pathname)}`);
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            {error || "You must be a Super Admin to access this dashboard."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
