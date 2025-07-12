import * as React from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";

export interface AppFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional extra Tailwind classes. */
  className?: string;
  /** App version (fallbacks to “dev”). */
  version?: string;
}

/**
 * **AppFooter** – sticky site-wide footer with version & links.
 */
export function AppFooter({
  className,
  version = import.meta.env.VITE_APP_VERSION ?? "dev",
  ...rest
}: AppFooterProps) {
  return (
    <footer
      className={clsx(
        "flex flex-col items-center gap-2 border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 md:flex-row md:justify-between",
        className
      )}
      {...rest}
    >
      <span>
        © 2025&nbsp;
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          MatchDay!
        </span>
      </span>

      <nav className="flex gap-4">
        <Link
          to="/settings"
          className="hover:text-gray-700 dark:hover:text-gray-200"
        >
          Settings
        </Link>
        <a
          href="https://github.com/your-org/matchday"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-700 dark:hover:text-gray-200"
        >
          GitHub
        </a>
      </nav>

      <span className="md:ml-auto">v{version}</span>
    </footer>
  );
}

export default AppFooter;
