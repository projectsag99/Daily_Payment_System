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

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "?";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-header backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-sm font-bold text-white shadow-sm shadow-brand-600/30">
                  DP
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold tracking-tight text-slate-900">
                      Daily Payment
                    </span>
                    {panelLabel && (
                      <span className="rounded-full border border-brand-200/80 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                        {panelLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Sistema de cobranza</p>
                </div>
              </div>
              <NavLinks />
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden items-center gap-2.5 sm:flex">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-2 ring-white">
                    {initials}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-800">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
              )}
              <button type="button" onClick={() => void logout()} className="btn-ghost">
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
