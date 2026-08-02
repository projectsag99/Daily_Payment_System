export function Alert({
  variant,
  children,
}: {
  variant: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    success: "bg-green-50 text-green-800",
    error: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-800",
  };
  return (
    <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}
