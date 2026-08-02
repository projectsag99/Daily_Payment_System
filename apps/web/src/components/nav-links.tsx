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
  { href: "/rules", label: "Reglas" },
  { href: "/auditoria", label: "Auditoría" },
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

  if (links.length === 0) return null;

  return (
    <nav className="flex flex-wrap gap-4 text-sm">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "font-medium text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
