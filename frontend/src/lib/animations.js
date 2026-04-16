export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
}

export const slideInLeft = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
}

export const slideInUp = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
}

export const scaleIn = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } },
}

export const staggerChildren = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

export const slideInRight = {
  hidden: { x: 20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
}

export const slideInDown = {
  hidden: { y: -10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
}

export const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

export const staggerSlow = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

// Page transition
export const pageTransition = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

// Card hover (use with whileHover)
export const cardHover = {
  rest: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' },
  hover: { y: -2, boxShadow: '0 4px 20px rgba(124,58,237,0.3)', transition: { duration: 0.2 } },
}

// Sidebar item
export const sidebarItem = {
  hidden: { x: -10, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } },
}

// Modal
export const modalBackdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
}
export const modalContent = {
  hidden: { scale: 0.95, opacity: 0, y: 10 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}
