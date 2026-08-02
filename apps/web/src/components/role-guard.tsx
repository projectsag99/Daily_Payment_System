"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getHomePath,
  isAdmin,
  isAdminRoute,
  isCollector,
} from "@/lib/auth/session";

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;

    const home = getHomePath(user);

    if (isAdmin(user)) {
      if (
        pathname === "/my-routes" ||
        pathname === "/notifications" ||
        pathname === "/pending-approval" ||
        pathname === "/account-suspended"
      ) {
        router.replace("/dashboard");
      }
      return;
    }

    if (isCollector(user)) {
      if (
        user.collectorStatus === "pending" &&
        pathname !== "/pending-approval"
      ) {
        router.replace("/pending-approval");
        return;
      }

      if (
        user.collectorStatus === "suspended" &&
        pathname !== "/account-suspended"
      ) {
        router.replace("/account-suspended");
        return;
      }

      if (
        (user.collectorStatus === "active" ||
          user.collectorStatus === null) &&
        (pathname === "/pending-approval" ||
          pathname === "/account-suspended")
      ) {
        router.replace("/my-routes");
        return;
      }

      if (isAdminRoute(pathname)) {
        router.replace(home);
      }
    }
  }, [user, isLoading, pathname, router]);

  return <>{children}</>;
}
