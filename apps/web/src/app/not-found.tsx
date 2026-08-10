import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center text-slate-700">
      <h1 className="text-2xl font-semibold text-slate-900">Página no encontrada</h1>
      <p className="max-w-md text-sm text-slate-600">
        La ruta que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
