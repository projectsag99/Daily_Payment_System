"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { isAdmin, isCollector } from "@/lib/auth/session";

const adminLinks = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/collectors", label: "Cobradores" },
  { href: "/clients", label: "Clientes" },
  { href: "/routes", label: "Rutas" },
  { href: "/pagos", label: "Pagos" },
  { href: "/caja", label: "Caja" },
  { href: "/rules", label: "Reglas" },
];

const collectorLinks = [
  { href: "/my-routes", label: "Mi ruta del día" },
  { href: "/notifications", label: "Notificaciones" },
];

export function NavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = isAdmin(user)
    ? adminLinks
    : isCollector(user)
      ? collectorLinks
      : [];

  const settingsActive =
    pathname === "/ajustes" || pathname.startsWith("/ajustes/") ||
    pathname === "/auditoria" || pathname.startsWith("/auditoria/");

  if (links.length === 0 && !isAdmin(user)) return null;

  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200/60 bg-slate-50/80 p-1">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200/80"
                : "rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white/60 hover:text-slate-900"
            }
          >
            {link.label}
          </Link>
        );
      })}

      {isAdmin(user) && (
        <Link
          href="/ajustes"
          title="Ajustes"
          className={
            settingsActive
              ? "rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200/80"
              : "rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-white/60 hover:text-slate-800"
          }
        >
          <span className="sr-only">Ajustes</span>
          <span aria-hidden className="inline-flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.725 1.003l1.713-.785a1 1 0 011.314.47l1.18 2.042a1 1 0 01-.12 1.213l-1.378 1.378a6.993 6.993 0 010 2.007l1.378 1.378a1 1 0 01.12 1.213l-1.18 2.042a1 1 0 01-1.314.47l-1.713-.785a6.993 6.993 0 01-1.725 1.003l-.331 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.725-1.003l-1.713.785a1 1 0 01-1.314-.47l-1.18-2.042a1 1 0 01.12-1.213l1.378-1.378a6.993 6.993 0 010-2.007L2.85 6.036a1 1 0 01-.12-1.213l1.18-2.042a1 1 0 011.314-.47l1.713.785A6.993 6.993 0 017.51 2.89l.331-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </Link>
      )}
    </nav>
  );
}
