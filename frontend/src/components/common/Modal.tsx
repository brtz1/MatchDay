import * as React from "react";
import { forwardRef, useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { X } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MotionDivProps = Omit<HTMLMotionProps<"div">, "title" | "children">;

export interface ModalProps extends MotionDivProps {
  /** Controls visibility. */
  open: boolean;
  /** Called when the user requests to close (backdrop click or ESC). */
  onClose: () => void;
  /** Optional heading shown at the top. */
  title?: ReactNode;
  /** Width preset. */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Disables backdrop-click & ESC dismissal. */
  isLocked?: boolean;
  /** Hide default close icon button. */
  hideCloseIcon?: boolean;
  /** Portal target (defaults to `document.body`). */
  container?: HTMLElement;
  /** Dialog body. */
  children?: ReactNode;
  /** Tailwind classes for outer dialog wrapper. */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Consts                                                                     */
/* -------------------------------------------------------------------------- */

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "w-screen h-screen",
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      title,
      size = "md",
      isLocked = false,
      hideCloseIcon = false,
      container = typeof document !== "undefined" ? document.body : undefined,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    /* ----------------------------------------------------- ESC key handler */
    const handleKey = useCallback(
      (e: KeyboardEvent) => {
        if (!isLocked && e.key === "Escape") onClose();
      },
      [isLocked, onClose]
    );

    /* ----------------------------------------------------- Mount / unmount */
    useEffect(() => {
      if (!open) return;
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKey);
        document.body.style.overflow = "";
      };
    }, [open, handleKey]);

    if (!container) return null;

    /* ----------------------------------------------------- Render */
    return createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 flex items-center justify-center"
            aria-modal="true"
            role="dialog"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isLocked && onClose()}
            />

            {/* Dialog */}
            <motion.div
              ref={ref}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={clsx(
                "relative z-50 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900",
                sizeClasses[size],
                className
              )}
              {...rest}
            >
              {(title || !hideCloseIcon) && (
                <header className="mb-4 flex items-start justify-between">
                  {title && (
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {title}
                    </h2>
                  )}
                  {!hideCloseIcon && (
                    <button
                      onClick={onClose}
                      className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                      aria-label="Close dialog"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </header>
              )}

              <div className="overflow-y-auto">{children}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      container
    );
  }
);

Modal.displayName = "Modal";

export default Modal;
