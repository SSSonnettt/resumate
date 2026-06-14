import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center font-bold whitespace-nowrap outline-none select-none transition-colors duration-150 uppercase tracking-wider [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[14px]",
  {
    variants: {
      variant: {
        /* 主按钮 · 碳墨黑底白字 */
        default:
          "bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground active:bg-foreground/90 active:text-background disabled:opacity-40",
        /* 轮廓 · 可见边框 */
        outline:
          "border-2 border-foreground/20 bg-transparent text-foreground hover:border-foreground hover:bg-foreground/5 active:bg-foreground/10",
        /* 次级 · 浅灰底 */
        secondary:
          "bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15",
        /* 幽灵 · 透明悬停 */
        ghost:
          "text-foreground/50 hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10",
        /* 危险 · accent 红 */
        destructive:
          "border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground active:bg-accent/90",
        link: "text-foreground/60 underline-offset-4 hover:text-foreground hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-4 text-[13px]",
        sm: "h-8 gap-1 px-3 text-[11px]",
        lg: "h-10 gap-2 px-5 text-sm",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
