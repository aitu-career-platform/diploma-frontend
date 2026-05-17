import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-[#275C43] bg-[#2B6A4D] text-white shadow-[0_8px_20px_rgba(43,106,77,0.18)] hover:bg-[#24583F] hover:shadow-[0_12px_24px_rgba(43,106,77,0.22)] dark:border-[#3F7C60] dark:bg-[#2F7454] dark:hover:bg-[#296549]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-[#D6DED7] bg-white text-[#203126] hover:border-[#AFC4B2] hover:bg-[#F6FAF7] dark:border-[#314036] dark:bg-[#151C17] dark:text-[#E7EFE8] dark:hover:bg-[#1B241E]",
        secondary: "border border-[#E6ECE7] bg-[#F6F8F6] text-[#233229] hover:bg-[#EEF3EF] dark:border-[#314036] dark:bg-[#18211B] dark:text-[#E7EFE8] dark:hover:bg-[#1D2821]",
        ghost: "text-[#33463A] hover:bg-[#F3F7F4] hover:text-[#162018] dark:text-[#B6C6BA] dark:hover:bg-[#1B241E] dark:hover:text-[#F0F6F1]",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "border border-[#275C43] bg-[#2B6A4D] text-white shadow-[0_10px_22px_rgba(43,106,77,0.2)] hover:bg-[#24583F] hover:shadow-[0_14px_28px_rgba(43,106,77,0.24)] dark:border-[#3F7C60] dark:bg-[#2F7454] dark:hover:bg-[#296549]",
        accent: "border border-[#275C43] bg-[#24583F] text-white hover:bg-[#1F4C36] hover:shadow-[0_12px_24px_rgba(36,88,63,0.22)] dark:border-[#3F7C60] dark:bg-[#296549] dark:hover:bg-[#24583F]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-xl px-4",
        lg: "h-12 rounded-2xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
