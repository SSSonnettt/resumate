import type { Variants } from "framer-motion";

/** 自定义缓动曲线 */
export const springOut = [0.32, 0.72, 0, 1] as const;
export const magnetic = [0.34, 1.56, 0.64, 1] as const;

/** 垂直淡入上升 */
export const fadeUpVariants: Variants = {
  hidden: {
    y: 24,
    opacity: 0,
    filter: "blur(2px)",
  },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: springOut,
    },
  },
};

/** 垂直淡入下降 */
export const fadeDownVariants: Variants = {
  hidden: {
    y: -24,
    opacity: 0,
    filter: "blur(2px)",
  },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: springOut,
    },
  },
};

/** 微妙缩放（列表项入场） */
export const scaleSubtleVariants: Variants = {
  hidden: {
    scale: 0.96,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: springOut,
    },
  },
};

/** 滚动入场：仅触发一次 */
export const viewportOnce = { once: true } as const;

/** list item staggered children */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};
