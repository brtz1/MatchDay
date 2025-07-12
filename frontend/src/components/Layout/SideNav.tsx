import * as React from "react";
import {
  forwardRef,
  type HTMLAttributes,
  Fragment,
  useEffect,
  useCallback,
} from "react";
import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  Users,
  Tv,
  Table,
  ShoppingBag,
  FolderOpen,
  Settings,
  X,
} from "lucide-react";
import { AppButton } from "@/components/common/AppButton";

/**
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface SideNavProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the drawer is open (mobile). */
  open: boolean;
  /** Callback when user clicks backdrop or close. */
  onClose: () => void;
  /** Fixed desktop behaviour at ≥ lg breakpoint. */
  desktopAlwaysVisible?: boolean;
}

/**
 * ---------------------------------------------------------------------------
 * Nav definitions
 * ---------------------------------------------------------------------------
 */

const navItems: NavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "Team Roster", to: "/team", icon: Users },
  { label: "Matchday Live", to: "/matchday", icon: Tv },
  { label: "Standings", to: "/standings", icon: Table },
  { label: "Transfer Market", to: "/transfer-market", icon: ShoppingBag },
  { label: "Load Game", to: "/load-game", icon: FolderOpen },
  { label: "Settings", to: "/settings", icon: Settings },
];

/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */

export const SideNav = forwardRef<HTMLDivElement, SideNavProps>(
  (
    { open, onClose, desktopAlwaysVisible = true, className, ...rest },
    ref
  ) => {
    const location = useLocation();

    /** Close on route change (mobile only). */
    useEffect(() => {
      onClose();
    }, [location.pathname]);

    /** Close with Escape key. */
    const handleEsc = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      },
      [onClose]
    );

    useEffect(() => {
      if (!open) return;
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }, [open, handleEsc]);

    /* ─────────────────────────────────────────────── Render helpers */
    const renderContent = () => (
      <aside
        ref={ref}
        className={clsx(
          "flex h-full w-64 flex-col gap-2 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900",
          className
        )}
        {...rest}
      >
        {/* Logo / heading */}
        <h1 className="mb-6 flex items-center gap-2 text-lg font-bold text-blue-600 dark:text-blue-400">
          MatchDay!
        </h1>

        {/* Nav list */}
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white dark:bg-blue-500"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          v{import.meta.env.VITE_APP_VERSION ?? "dev"}
        </span>
      </aside>
    );

    /* ─────────────────────────────────────────────── Layout logic */
    return (
      <Fragment>
        {/* Mobile drawer */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 lg:hidden"
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
              />

              {/* Sliding panel */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.2 }}
                className="relative h-full"
              >
                {renderContent()}

                {/* Close button */}
                <AppButton
                  variant="ghost"
                  className="absolute right-2 top-2 h-8 w-8 p-0"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </AppButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop static side-nav */}
        {desktopAlwaysVisible && (
          <div className="hidden lg:block">{renderContent()}</div>
        )}
      </Fragment>
    );
  }
);

SideNav.displayName = "SideNav";

export default SideNav;
