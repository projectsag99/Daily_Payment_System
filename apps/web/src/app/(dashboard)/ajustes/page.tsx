"use client";

import Link from "next/link";
import { linkClass, pageSubtitle, pageTitle } from "@/lib/ui-classes";

const settingsItems = [
  {
    href: "/rules",
    title: "Reglas de negocio",
    description: "Alertas automáticas para cobradores y administradores.",
  },
  {
    href: "/auditoria",
    title: "Auditoría",
    description: "Registro de acciones y cambios en el sistema.",
  },
];

export default function AjustesPage() {
  return (
    <div className="max-w-lg">
      <div className="mb-5">
        <h1 className={pageTitle}>Ajustes</h1>
        <p className={pageSubtitle}>Opciones avanzadas del panel.</p>
      </div>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-card">
        {settingsItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"
            >
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  {item.title}
                </span>
                <span className="block text-xs text-slate-500">
                  {item.description}
                </span>
              </span>
              <span className={`shrink-0 text-xs ${linkClass}`}>Abrir →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
