import type { Variants } from "framer-motion";

/** 硬切线缓动：工业风格，无弹簧弹性 */
export const industrialEase = [0.32, 0.72, 0, 1] as const;

/** 垂直淡入上升 */
export const fadeUpVariants: Variants = {
  hidden: {
    y: 16,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: industrialEase,
    },
  },
};

/** 垂直淡入下降 */
export const fadeDownVariants: Variants = {
  hidden: {
    y: -16,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: industrialEase,
    },
  },
};

/** 微妙缩放 */
export const scaleSubtleVariants: Variants = {
  hidden: {
    scale: 0.97,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: industrialEase,
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
      staggerChildren: 0.05,
      delayChildren: 0.06,
    },
  },
};

/** 页面子元素 · 硬化入场 */
export const pageItemVariants: Variants = {
  hidden: {
    y: 24,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: industrialEase,
    },
  },
  exit: {
    y: -12,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: industrialEase,
    },
  },
};

/* ======== 工业风新增变体 ======== */

/** 打字机逐字显现 — 容器级联 */
export const typewriterVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1,
    },
  },
};

/** 打字机子元素 — 配合 char-reveal 动画 */
export const typewriterCharVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.05,
    },
  },
};

/** 盖章式入场 — 从上方硬着陆 */
export const stampVariants: Variants = {
  hidden: {
    y: -30,
    scale: 1.08,
    opacity: 0,
  },
  visible: (i: number = 0) => ({
    y: 0,
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      mass: 1,
      delay: i * 0.04,
    },
  }),
};

/** 扫描线揭示 — 从左向右展开 */
export const scanlineReveal: Variants = {
  hidden: {
    clipPath: "inset(0 100% 0 0)",
  },
  visible: {
    clipPath: "inset(0 0% 0 0)",
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};
