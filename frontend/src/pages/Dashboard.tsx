import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      {/* ── Heading */}
      <header>
        <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
          Dashboard
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Welcome to <span className="font-semibold">MatchDay! 25</span> – the
          modern remake of the classic retro soccer manager.
        </p>
      </header>

      {/* ── Quick-actions */}
      <div className="flex flex-wrap gap-4">
        <AppButton
          onClick={() => navigate("/country-selection")}
          className="w-40"
        >
          Start New Game
        </AppButton>
        <AppButton
          variant="secondary"
          onClick={() => navigate("/load-game")}
          className="w-32"
        >
          Load Game
        </AppButton>
        <AppButton
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="w-28"
        >
          Settings
        </AppButton>
      </div>

      {/* ── Overview cards (placeholder metrics) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AppCard>
          <h2 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
            Active Saves
          </h2>
          <p className="text-2xl font-bold">2</p>
        </AppCard>

        <AppCard>
          <h2 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
            Teams Managed
          </h2>
          <p className="text-2xl font-bold">1</p>
        </AppCard>

        <AppCard>
          <h2 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
            Matches Played
          </h2>
          <p className="text-2xl font-bold">14</p>
        </AppCard>
      </div>

      {/* ── About */}
      <AppCard variant="outline">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Manage your club’s transfers, finances and matchday tactics with a
          modern UX while keeping the spirit of the old <em>Elifoot 98</em>. New
          features like live match broadcasting, dynamic player contracts and an
          extensible save-game system bring the classic into 2025.
        </p>
      </AppCard>
    </div>
  );
}
