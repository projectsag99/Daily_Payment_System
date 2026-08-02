"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/collectors", label: "Cobradores" },
  { href: "/clients", label: "Clientes" },
  { href: "/routes", label: "Rutas" },
  { href: "/rules", label: "Reglas" },
];

export function NavLinks() {
  const pathname = usePathname();

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
