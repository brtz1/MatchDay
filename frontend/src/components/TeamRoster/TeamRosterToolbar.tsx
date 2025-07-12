/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { ChevronDown, Save } from "lucide-react";

import { useTeamContext } from "@/store/TeamContext";
import { AppButton } from "@/components/common/AppButton";
import Tooltip from "@/components/ui/tooltip";
import axios from "@/services/axios";

/* -------------------------------------------------------------------------- */
/* Types & menu schema                                                        */
/* -------------------------------------------------------------------------- */

interface MenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface MenuBlock {
  key: string;
  label: string;
  items: MenuItem[];
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function TeamRosterToolbar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { selectedPlayer, setSellMode } = useTeamContext();

  /* ─────────────────────────────── Actions */

  async function handleManualSave() {
    setSaving(true);
    try {
      const { data } = await axios.post("/manual-save", {
        name: "Manual Save",
        coachName: "Coach",
      });
      alert(`✅ Game saved as "${data.saveName}"`);
    } catch (err: any) {
      alert(`❌ Save failed: ${err?.response?.data?.error ?? err}`);
    } finally {
      setSaving(false);
      setOpenMenu(null);
    }
  }

  /* ─────────────────────────────── Menu definition */

  const menuDefs: MenuBlock[] = [
    {
      key: "matchday",
      label: "Matchday",
      items: [
        {
          label: saving ? "Saving…" : "Save Game",
          onClick: handleManualSave,
          disabled: saving,
        },
        {
          label: "Load Game",
          onClick: () => navigate("/load-game"),
        },
        { label: "Exit without saving", onClick: () => alert("TODO") },
        { label: "Exit (Save)", onClick: () => alert("TODO") },
        { label: "About", onClick: () => alert("TODO") },
      ],
    },
    {
      key: "team",
      label: "Team",
      items: [
        { label: "Loan", onClick: () => alert("TODO") },
        { label: "Stadium", onClick: () => alert("TODO") },
        { label: "History", onClick: () => alert("TODO") },
      ],
    },
    {
      key: "player",
      label: "Player",
      items: [
        {
          label: "Sell",
          onClick: () => {
            if (!selectedPlayer) {
              alert("Select a player first!");
              return;
            }
            setSellMode(true);
            window.dispatchEvent(new CustomEvent("show-sell-tab"));
          },
        },
        { label: "Scout", onClick: () => alert("TODO") },
        { label: "Search", onClick: () => navigate("/transfer-market") },
        { label: "Last Transfers", onClick: () => alert("TODO") },
      ],
    },
    {
      key: "league",
      label: "League",
      items: [
        { label: "Standings", onClick: () => navigate("/standings") },
        { label: "Golden Boot", onClick: () => alert("TODO") },
        { label: "Fixtures", onClick: () => alert("TODO") },
        { label: "Last Winners", onClick: () => alert("TODO") },
        { label: "Golden Boot History", onClick: () => alert("TODO") },
      ],
    },
    {
      key: "coach",
      label: "Coach",
      items: [
        { label: "Contract", onClick: () => alert("TODO") },
        { label: "Morale", onClick: () => alert("TODO") },
        { label: "Resign", onClick: () => alert("TODO") },
      ],
    },
  ];

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <nav className="relative flex gap-4 rounded bg-blue-600 p-2 text-xs text-white shadow dark:bg-blue-500">
      {menuDefs.map((menu) => (
        <div key={menu.key} className="relative">
          {/* top-level button */}
          <AppButton
            variant="ghost"
            className="flex items-center gap-1 bg-transparent px-2 py-1 text-white hover:bg-white/10"
            onClick={() => setOpenMenu((prev) => (prev === menu.key ? null : menu.key))}
          >
            {menu.label}
            <ChevronDown className="h-3 w-3" />
          </AppButton>

          {/* dropdown panel */}
          {openMenu === menu.key && (
            <ul className="absolute left-0 z-20 mt-1 min-w-[10rem] rounded-md border border-gray-200 bg-white py-1 text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
              {menu.items.map((item) => (
                <li key={item.label}>
                  <button
                    disabled={item.disabled}
                    onClick={item.onClick}
                    className={clsx(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700",
                      item.disabled ? "cursor-not-allowed opacity-50" : undefined
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* quick-save icon */}
      <div className="ml-auto">
        <Tooltip content="Quick save">
          <AppButton
            variant="ghost"
            className="h-8 w-8 p-0 text-white hover:bg-white/10"
            onClick={handleManualSave}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
          </AppButton>
        </Tooltip>
      </div>
    </nav>
  );
}
