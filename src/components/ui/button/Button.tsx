import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" |"simple2"| "outline" | "outempty"|"danger" | "success" | "ghost" | "accent" | "darkGreen" | "sorigin" |"soriginh"|"soriginv" | "soriginv2";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
    type?: "button" | "submit" | "reset";
  align?: "start" | "center" | "end";

}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
}) => {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-3 text-base",
    lg: "px-6 py-4 text-base",

  };

  const variantClasses: Record<string, string> = {
    primary: "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline: "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
    danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
    success: "bg-green-500 text-white hover:bg-green-600 disabled:bg-green-300",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
    darkGreen: "bg-[#334E41] text-white hover:bg-[#2C4238] disabled:bg-[#558372]",
    accent : "bg-[#A3CD39] text-white hover:bg-[#A3CD39] disabled:bg-[#A3CD39]",
MSB:"w-full bg-gradient-to-b from-[#5b8c24] to-[#264f3c] text-white font-semibold text-sm px-5 py-2 rounded-xl relative overflow-hidden transition-all duration-300 ease-in-out before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent before:translate-y-[-100%] hover:before:translate-y-[100%] before:transition-transform before:duration-700 before:blur-sm"
,
      simple:"rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-200"
,simple2:`rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 
         shadow-sm hover:bg-gray-100 hover:text-gray-900 
         transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
         focus:ring-offset-1 focus:ring-gray-300`
  , soriginh: `
  bg-gradient-to-r from-[#264f3c] to-[#5b8c24]
  text-white font-semibold shadow-sm
  transition-all duration-300 ease-in-out
  relative overflow-hidden
  before:absolute before:inset-0
  before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
  before:translate-x-[-100%]
  hover:before:translate-x-[100%]
  before:transition-transform before:duration-700
  before:blur-sm
  rounded-xl
`,
soriginv: `
  bg-gradient-to-b from-[#5b8c24] to-[#264f3c]
  text-white font-semibold
  transition-all duration-300 ease-in-out
  relative overflow-hidden
  before:absolute before:inset-0
  before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent
  before:translate-y-[-100%]
  hover:before:translate-y-[100%]
  before:transition-transform before:duration-700
  before:blur-sm
  rounded-xl
`,
sorigin:`bg-[#a3cd39] text-white font-semibold px-6 py-2 rounded-xl
         transition-all duration-300 ease-in-out shadow-md
         relative overflow-hidden
         before:absolute before:inset-0 before:bg-white/10
         before:translate-y-[-100%] hover:before:translate-y-[100%]
         before:transition-transform before:duration-700 before:blur-sm`,
soriginv3: `
  bg-[linear-gradient(to_bottom,_#5b8c24_10%,_#264f3c_90%)]
  text-white font-semibold
  transition-all duration-300 ease-in-out
  relative overflow-hidden
  before:absolute before:inset-0
  before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent
  before:translate-y-[-100%]
  hover:before:translate-y-[100%]
  before:transition-transform before:duration-700
  before:blur-sm
  rounded-xl
`,

 soriginv2 : `
  bg-gradient-to-b from-[#264f3c] to-[#1a2e2b]
  text-white font-semibold
  transition-all duration-300 ease-in-out
  relative overflow-hidden
  before:absolute before:inset-0
  before:bg-gradient-to-b before:from-transparent before:via-white/5 before:to-transparent
  before:translate-y-[-100%]
  hover:before:translate-y-[100%]
  before:transition-transform before:duration-700
  before:blur-sm
  rounded-xl
  shadow-md
`,
outempty: "flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-green-800 shadow-theme-xs hover:bg-gray-50 hover:text-green-900 dark:border-gray-700 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-white/[0.03] dark:hover:text-green-300 lg:inline-flex lg:w-auto"
,buttonPrimaryOutline: "flex w-full items-center justify-center gap-2 rounded-full border border-[#b0d9c1] bg-gradient-to-r from-white to-[#f0fdf9] px-5 py-3 text-sm font-bold text-[#267f5a] shadow-md hover:from-[#f0fdf9] hover:to-white hover:shadow-lg hover:text-[#1a5e44] transition-all duration-300 ease-in-out dark:border-[#3b4e46] dark:bg-[#1f2b28] dark:text-[#a3cd39] dark:hover:bg-[#2a3a36] dark:hover:text-[#c8f27d] lg:inline-flex lg:w-auto"
,buttonOutlineLime: "flex w-full items-center justify-center gap-2 rounded-full border border-[#a3cd39] bg-white px-5 py-3 text-sm font-semibold text-[#339274] shadow-sm hover:bg-[#f5fdf0] hover:text-[#2a775a] hover:shadow-md transition-all duration-300 ease-in-out dark:border-[#a3cd39] dark:bg-transparent dark:text-[#a3cd39] dark:hover:bg-[#a3cd39]/10 dark:hover:text-[#d1f07d] lg:inline-flex lg:w-auto"
,buttonLimeOutlineHoverSoft: "flex w-full items-center justify-center gap-2 rounded-full border border-[#a3cd39] bg-[#a3cd39] px-5 py-3 text-sm font-semibold text-[#267f5a] shadow-sm hover:bg-[#f5fdf0] hover:text-[#2a775a] hover:shadow-md transition-all duration-300 ease-in-out dark:border-[#a3cd39] dark:bg-[#a3cd39] dark:text-[#1f2b28] dark:hover:bg-[#a3cd39]/10 dark:hover:text-[#c8f27d] lg:inline-flex lg:w-auto"

,buttonLimeLite: "flex w-full items-center justify-center gap-2 rounded-full border border-[#a3cd39] bg-[#f5fdf0] px-5 py-2 text-sm font-bold text-[#339274] hover:bg-[#e6f4ea] hover:text-[#2a775a] transition-all duration-200 ease-in-out dark:border-[#a3cd39] dark:bg-transparent dark:text-[#a3cd39] dark:hover:bg-[#a3cd39]/10 dark:hover:text-[#c8f27d] lg:inline-flex lg:w-auto"
,buttonLimeLiteFullWidth: "w-full flex items-center justify-center gap-2 rounded-xl border border-[#a3cd39] bg-[#f5fdf0] px-5 py-2 text-sm font-bold text-[#339274] hover:bg-[#e6f4ea] hover:text-[#2a775a] transition-all duration-200 ease-in-out dark:border-[#a3cd39] dark:bg-transparent dark:text-[#a3cd39] dark:hover:bg-[#a3cd39]/10 dark:hover:text-[#c8f27d]"


  };

  return (
    <button
      className={`
        relative inline-flex items-center justify-center gap-2
        rounded-2xl transition-all duration-300 ease-in-out
        ${sizeClasses[size]} ${variantClasses[variant]} ${className}
        ${disabled ? "cursor-not-allowed opacity-60" : ""}
      `}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
