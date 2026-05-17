import * as React from "react";
import { cn } from "@shared/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-[#D6DED7] bg-white px-4 py-2 text-sm text-[#1D261F] shadow-[0_1px_2px_rgba(18,24,19,0.03)] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#7A867D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B6A4D]/20 focus-visible:ring-offset-0 focus-visible:border-[#2B6A4D] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#314036] dark:bg-[#111814] dark:text-[#E7EFE8] dark:placeholder:text-[#93A097] dark:focus-visible:border-[#4A966E] dark:focus-visible:ring-[#4A966E]/20",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
