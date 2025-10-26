// frontend/src/components/layout/TopNavBar.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { teamUrl } from "@/utils/paths";
import clsx from "clsx";

import SeasonGoldenBootModal from "@/components/stats/SeasonGoldenBootModal";
import GoldenBootHistoryModal from "@/components/stats/GoldenBootHistoryModal";

/* ── Types ───────────────────────────────────────────── */
interface TopNavBarProps {
  coachTeamId: number;
}

interface DropdownItem {
  label: string;
  action: string;
}

interface DropdownMenu {
  key: string;
  label: string;
  items: DropdownItem[];
}

/* ── Dropdown Menu Config ───────────────────────────── */
const dropdownMenus: DropdownMenu[] = [
  {
    key: "matchday",
    label: "MATCHDAY!",
    items: [
      { label: "Save Game", action: "save" },
      { label: "Load Game", action: "load" },
      { label: "Exit without Saving", action: "exitNoSave" },
      { label: "Exit", action: "exit" },
      { label: "About", action: "about" },
    ],
  },
  {
    key: "team",
    label: "Team",
    items: [
      { label: "Loan", action: "loan" },
      { label: "Stadium", action: "stadium" },
      { label: "Club's History", action: "clubHistory" },
    ],
  },
  {
    key: "coach",
    label: "Coach",
    items: [
      { label: "Contract", action: "coachContract" },
      { label: "Morale", action: "coachMorale" },
    ],
  },
  {
    key: "fixtures",
    label: "Fixtures",
    items: [
      { label: "League Standings", action: "leagueStandings" },
      { label: "Cup Bracket", action: "cupBracket" },
      { label: "Season Golden Boot", action: "goldenBoot" },
      { label: "Trophies History", action: "trophiesHistory" },
      { label: "Golden Boot History", action: "goldenBootHistory" },
    ],
  },
  {
    key: "transfer",
    label: "Transfer Market",
    items: [
      { label: "Transfer Market Page", action: "transferMarket" },
      { label: "Scout", action: "scout" },
      { label: "Last Transfer", action: "lastTransfer" },
    ],
  },
];

// NOTE: We intentionally removed "goldenBoot" and "goldenBootHistory" from navRoutes
// so they won't navigate — they will open modals instead.
const navRoutes: Record<string, string> = {
  load: "/load-game",
  transferMarket: "/transfer-market",
  leagueStandings: "/standings",
  cupBracket: "/cup-bracket",
  trophiesHistory: "/trophies-history",
  clubHistory: "/club-history",
};

/* ── Save Game Placeholder ───────────────────────────── */
function useSaveGame() {
  const [saving, setSaving] = useState(false);
  const handleManualSave = () => {
    setSaving(true);
    setTimeout(() => {
      alert("Game saved! (placeholder)");
      setSaving(false);
    }, 1000);
  };
  return { handleManualSave, saving };
}

/* ── TopNavBar Component ─────────────────────────────── */
export const TopNavBar: React.FC<TopNavBarProps> = ({ coachTeamId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleManualSave, saving } = useSaveGame();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // New: local state to control modals
  const [showSeasonGoldenBoot, setShowSeasonGoldenBoot] = useState(false);
  const [showGoldenBootHistory, setShowGoldenBootHistory] = useState(false);

  const isMatchdayPage = location.pathname === "/matchday";
  const isCoachTeam = location.pathname.startsWith(`/teams/${coachTeamId}`);

  const handleBack = () => navigate(-1);
  const handleHome = () => {
    if (coachTeamId > 0) navigate(teamUrl(coachTeamId));
  };

  const openMenu = (key: string) => setOpenDropdown(key);
  const closeMenu = () => setOpenDropdown(null);

  const handleMenuAction = (action: string) => {
    // Intercept modal actions first
    if (action === "goldenBoot") {
      closeMenu();
      setShowSeasonGoldenBoot(true);
      return;
    }
    if (action === "goldenBootHistory") {
      closeMenu();
      setShowGoldenBootHistory(true);
      return;
    }

    // Then, handle standard route navigations
    if (navRoutes[action]) {
      navigate(navRoutes[action]);
      closeMenu();
      return;
    }

    // Other non-routing actions
    switch (action) {
      case "save":
        closeMenu();
        handleManualSave();
        break;
      case "exitNoSave":
        closeMenu();
        alert("Exit without saving (TODO)");
        break;
      case "exit":
        closeMenu();
        alert("Exit game (TODO)");
        break;
      case "about":
        closeMenu();
        alert("MatchDay!\nVersion 1.0\nCreated by brtz1");
        break;
      default:
        closeMenu();
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isMatchdayPage) return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#003366] text-white flex items-center justify-between px-4 font-mono text-sm border-b border-gray-500 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="bg-gray-800 hover:bg-yellow-400 hover:text-black rounded-full px-2 py-1 mr-1 transition-colors"
          >
            ←
          </button>
          <button
            onClick={handleHome}
            className="bg-yellow-400 text-black hover:bg-yellow-600 rounded-full px-2 py-1 transition-colors"
          >
            🏠
          </button>
          <span className="font-bold tracking-widest uppercase text-yellow-300 select-none ml-2">
            MatchDay!
          </span>
        </div>

        {isCoachTeam && (
          <nav className="flex gap-4 h-full" ref={navRef}>
            {dropdownMenus.map((menu: DropdownMenu) => (
              <div key={menu.key} className="relative flex items-center h-full">
                <button
                  className={clsx(
                    "font-semibold uppercase px-3 py-2 rounded-t hover:text-yellow-300 hover:bg-black/10 transition flex items-center gap-1 h-full",
                    openDropdown === menu.key && "bg-black/20 text-yellow-300"
                  )}
                  onClick={() =>
                    openDropdown === menu.key ? closeMenu() : openMenu(menu.key)
                  }
                  aria-haspopup="menu"
                  aria-expanded={openDropdown === menu.key}
                >
                  {menu.label}
                  <span
                    className={clsx(
                      "ml-1 transition-transform",
                      openDropdown === menu.key && "rotate-180"
                    )}
                  >
                    ▼
                  </span>
                </button>
                {openDropdown === menu.key && (
                  <div
                    className="absolute left-0 top-full min-w-[200px] rounded-b bg-black/95 p-1 text-xs text-white shadow-2xl border-t-2 border-yellow-300 z-50"
                    style={{ marginTop: "-2px" }}
                  >
                    <div className="w-full h-0 relative" style={{ height: "10px" }}>
                      <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[10px] border-l-transparent border-r-transparent border-b-black absolute right-6 -top-2" />
                    </div>
                    {menu.items.map((item: DropdownItem) => (
                      <button
                        key={item.label}
                        onClick={() => handleMenuAction(item.action)}
                        className={clsx(
                          "w-full text-left rounded px-3 py-2 hover:bg-yellow-700/20",
                          item.action === "save" && saving && "opacity-60 cursor-not-allowed"
                        )}
                        disabled={item.action === "save" && saving}
                      >
                        {item.action === "save" && saving ? "Saving…" : item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        )}
      </header>

      {/* Modals mounted at root so they overlay correctly */}
      <SeasonGoldenBootModal
        isOpen={showSeasonGoldenBoot}
        onClose={() => setShowSeasonGoldenBoot(false)}
      />
      <GoldenBootHistoryModal
        isOpen={showGoldenBootHistory}
        onClose={() => setShowGoldenBootHistory(false)}
      />
    </>
  );
};

export default TopNavBar;
