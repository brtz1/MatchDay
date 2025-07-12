import * as React from "react";
import {
  forwardRef,
  type ReactNode,
  Fragment,
  type HTMLAttributes,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Menu, Save, Settings } from "lucide-react";
import { AppButton } from "@/components/common/AppButton";
import Tooltip from "@/components/ui/tooltip";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 1️⃣  Remove the conflicting 'title' prop from HTMLAttributes
 *     and re-declare it with ReactNode.
 */
export interface AppHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  rightContent?: ReactNode;
  onSave?: () => void;
  onOpenSettings?: () => void;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export const AppHeader = forwardRef<HTMLDivElement, AppHeaderProps>(
  (
    {
      onMenuToggle,
      showMenuButton = true,
      title = "MatchDay!",
      subtitle,
      rightContent,
      onSave,
      onOpenSettings,
      className,
      ...rest
    },
    ref
  ) => {
    const navigate = useNavigate();

    /* -- default right-hand icons ----------------------------------------- */
    const defaultRight = (
      <Fragment>
        {onSave && (
          <Tooltip content="Save game">
            <AppButton
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onSave}
            >
              <Save className="h-4 w-4" />
            </AppButton>
          </Tooltip>
        )}

        <Tooltip content="Settings">
          <AppButton
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() =>
              onOpenSettings ? onOpenSettings() : navigate("/settings")
            }
          >
            <Settings className="h-4 w-4" />
          </AppButton>
        </Tooltip>
      </Fragment>
    );

    return (
      <header
        ref={ref}
        className={clsx(
          "sticky top-0 z-30 flex h-14 items-center gap-4 border-b",
          "border-gray-200 bg-white/70 px-4 backdrop-blur",
          "dark:border-gray-800 dark:bg-gray-900/70",
          className
        )}
        {...rest}
      >
        {/* ── Left chunk */}
        <div className="flex shrink-0 items-center gap-3">
          {showMenuButton && (
            <AppButton
              variant="ghost"
              className="h-9 w-9 p-0 lg:hidden"
              onClick={onMenuToggle}
            >
              <Menu className="h-5 w-5" />
            </AppButton>
          )}

          <Link to="/" className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {title}
            </span>
            {subtitle && (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {subtitle}
              </span>
            )}
          </Link>
        </div>

        {/* filler flex pushes right-content to edge */}
        <div className="flex-1" />

        {/* ── Right chunk */}
        <div className="flex items-center gap-2">
          {rightContent ?? defaultRight}
        </div>
      </header>
    );
  }
);

AppHeader.displayName = "AppHeader";

export default AppHeader;
