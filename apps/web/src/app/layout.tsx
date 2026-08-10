import type { Metadata } from "next";
import { AppProviders } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Payment — Admin",
  description: "Panel de administración",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <noscript>
          <div
            style={{
              padding: "1rem",
              background: "#fef3c7",
              color: "#92400e",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            JavaScript es necesario para usar este panel. Si la página se ve sin
            estilos, detén el servidor, ejecuta{" "}
            <code>pnpm --filter @dps/web dev:clean</code> y recarga con Ctrl+Shift+R.
          </div>
        </noscript>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
