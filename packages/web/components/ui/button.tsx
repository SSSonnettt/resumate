import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap outline-none select-none transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[15px]",
  {
    variants: {
      variant: {
        /* 主按钮 · 辉光鎏金 */
        default:
          "bg-primary text-primary-foreground shadow-[0_0_28px_var(--primary-glow),0_4px_16px_rgba(0,0,0,0.35)] active:scale-[0.97] active:shadow-[0_0_12px_var(--primary-glow)] disabled:opacity-40 disabled:shadow-none",
        /* 玻璃药丸 · 磁悬浮 */
        glass:
          "border border-white/[0.05] bg-white/[0.02] text-foreground/85 backdrop-blur-lg shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-white/[0.09] hover:bg-white/[0.04] hover:shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] active:scale-[0.97] active:bg-white/[0.06]",
        /* 轮廓 · 纤细边框 */
        outline:
          "border border-white/[0.06] bg-transparent text-foreground-dim/80 hover:border-white/[0.1] hover:text-foreground hover:bg-white/[0.02] active:scale-[0.97]",
        /* 次级 · 微光底色 */
        secondary:
          "bg-white/[0.03] text-foreground-dim/80 hover:bg-white/[0.06] hover:text-foreground active:scale-[0.97]",
        /* 幽灵 · 透明悬停 */
        ghost:
          "text-foreground-dim/60 hover:bg-white/[0.03] hover:text-foreground active:scale-[0.97]",
        /* 危险 · 暗红 */
        destructive:
          "bg-destructive/[0.06] text-destructive/80 hover:bg-destructive/[0.1] hover:text-destructive active:scale-[0.97]",
        link: "text-primary/80 underline-offset-4 hover:text-primary",
      },
      size: {
        default:
          "h-9 gap-1.5 rounded-full px-4 text-[13px]",
        sm: "h-8 gap-1 rounded-full px-3 text-[11px]",
        lg: "h-10 gap-2 rounded-full px-5 text-sm",
        icon: "size-9 rounded-full",
        "icon-sm": "size-8 rounded-full",
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
