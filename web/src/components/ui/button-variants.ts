import { cva, type VariantProps } from "class-variance-authority";

export const iconButtonVariants = cva(
  "inline-flex items-center justify-center transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer rounded-sm",
  {
    variants: {
      variant: {
        ghost: "text-foreground hover:bg-muted",
        outline: "border border-border text-foreground hover:bg-muted",
        solid: "bg-foreground text-background hover:opacity-90",
      },
      size: {
        sm: "h-9 w-9",
        md: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "ghost", size: "sm" },
  },
);

export type IconButtonVariantProps = VariantProps<typeof iconButtonVariants>;
