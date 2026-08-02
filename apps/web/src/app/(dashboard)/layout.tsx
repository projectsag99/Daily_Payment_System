"use client";

import { RequireAuth } from "@/components/require-auth";
import { RoleGuard } from "@/components/role-guard";
import { NavLinks } from "@/components/nav-links";
import { useAuth } from "@/lib/auth/auth-context";
import { isAdmin, isCollector } from "@/lib/auth/session";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <RoleGuard>
        <DashboardShell>{children}</DashboardShell>
      </RoleGuard>
    </RequireAuth>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  const panelLabel = isAdmin(user)
    ? "Administración"
    : isCollector(user)
      ? "Cobrador"
      : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div>
              <span className="text-lg font-semibold text-slate-900">
                Daily Payment
              </span>
              {panelLabel && (
                <span className="ml-2 text-xs font-medium text-slate-500">
                  {panelLabel}
                </span>
              )}
            </div>
            <NavLinks />
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.firstName} {user.lastName}
              </span>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
