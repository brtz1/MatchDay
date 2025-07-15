import React from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";

const navLinks = [
  { label: "Team Roster", to: "/team" },
  { label: "Matchday", to: "/matchday" },
  { label: "Standings", to: "/standings" },
  { label: "Transfer Market", to: "/transfer-market" },
  { label: "Load Game", to: "/load-game" },
  { label: "Settings", to: "/settings" },
];

export const TopNavBar = () => {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#003366] text-white flex items-center justify-between px-4 font-mono text-sm border-b border-gray-500">
      <div className="font-bold tracking-widest uppercase text-yellow-300">
        MatchDay!
      </div>

      <nav className="flex gap-5">
        {navLinks.map(({ label, to }) => (
          <Link
            key={to}
            to={to}
            className={clsx(
              "hover:underline",
              location.pathname.startsWith(to) && "text-yellow-300 underline"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
};

export default TopNavBar;
