export function Alert({
  variant,
  children,
}: {
  variant: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border border-green-200 bg-green-50 text-green-800",
    error: "border border-red-200 bg-red-50 text-red-700",
    info: "border border-brand-200 bg-brand-50 text-brand-800",
  };
  return (
    <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}
