interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  className = "",
  isLoading = false,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const baseClasses = "btn";

  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "btn-outline",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-[10px]",
    md: "px-3 py-1.5 text-xs",
    lg: "px-4 py-2 text-sm",
  };

  const fullWidthClasses = "w-full max-w-xs mx-auto block";

  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidthClasses,
    className,
  ].join(" ");

  return (
    <button className={combinedClasses} {...props}>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="spinner-primary h-4 w-4" />
        </div>
      ) : (
        children
      )}
    </button>
  );
}
