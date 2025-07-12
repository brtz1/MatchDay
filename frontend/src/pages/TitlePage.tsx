import * as React from "react";
import { useNavigate } from "react-router-dom";

import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";

/**
 * MatchDay! landing page with logo and three primary actions.
 */
export default function TitlePage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-800 px-4 text-white">
      {/* Logo / title */}
      <h1 className="mb-12 text-6xl font-bold tracking-wide">
        MatchDay!{" "}
        <span className="align-top text-sm text-white/70">25</span>
      </h1>

      {/* Action buttons */}
      <AppCard
        variant="outline"
        className="flex w-full max-w-xs flex-col gap-4 bg-white/10 p-6"
      >
        <AppButton
          onClick={() => navigate("/country-selection")}
          className="w-full"
        >
          Start New Game
        </AppButton>

        <AppButton
          variant="secondary"
          onClick={() => navigate("/load-game")}
          className="w-full"
        >
          Load Game
        </AppButton>

        <AppButton
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="w-full"
        >
          Settings
        </AppButton>
      </AppCard>
    </div>
  );
}
