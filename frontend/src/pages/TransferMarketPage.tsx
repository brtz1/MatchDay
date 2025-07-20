import * as React from "react";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import axios from "@/services/axios";
import { useTeamContext } from "@/store/TeamContext";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable, { type Column } from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getFlagUrl } from "@/utils/getFlagUrl";
import { teamUrl, loadGameUrl } from "@/utils/paths";

/* ── Types ───────────────────────────────────────────────────────────── */
interface Player {
  id: number;
  name: string;
  rating: number;
  position: "GK" | "DF" | "MF" | "AT";
  nationality: string;
  price: number;
  teamId: number;
  teamName: string;
}

interface Filter {
  name?: string;
  ratingMin?: number;
  ratingMax?: number;
  position?: string;
  nationality?: string;
  priceMax?: number;
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function TransferMarketPage() {
  const { currentTeamId, currentSaveGameId } = useTeamContext(); // 🧠 include saveGameId
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState<Filter>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Redirect if no save loaded
  useEffect(() => {
    if (!currentTeamId) {
      navigate(loadGameUrl);
    }
  }, [currentTeamId, navigate]);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    try {
      const params = Object.entries(filter).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== "") {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      if (!currentSaveGameId) {
        throw new Error("No saveGameId available");
      }

      params.saveGameId = currentSaveGameId;

      const { data } = await axios.get<Player[]>("/players/search", { params });
      setPlayers(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch players.");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (currentTeamId) {
      navigate(teamUrl(currentTeamId));
    } else {
      navigate(loadGameUrl);
    }
  }

  function handleViewTeam() {
    if (selectedPlayer?.teamId) {
      navigate(teamUrl(selectedPlayer.teamId));
    }
  }

  const columns: Column<Player>[] = useMemo(
    () => [
      { header: "Name", accessor: "name", sortable: true },
      { header: "Pos", accessor: "position", cellClass: "text-center" },
      {
        header: "Nat",
        accessor: (row) =>
          row.nationality ? (
            <img
              src={getFlagUrl(row.nationality)}
              alt={row.nationality}
              className="mx-auto h-4 w-6"
            />
          ) : (
            ""
          ),
        headerClass: "text-center w-12",
      },
      { header: "Rating", accessor: "rating", cellClass: "text-right" },
      {
        header: "Price",
        accessor: (row) => `€${row.price.toLocaleString()}`,
        cellClass: "text-right",
      },
      { header: "Team", accessor: "teamName", cellClass: "text-left" },
    ],
    []
  );

  if (!currentTeamId) {
    return (
      <div className="p-12 flex justify-center">
        <ProgressBar />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        Transfer Market
      </h1>

      {/* Filter Form */}
      <AppCard>
        <h2 className="mb-4 text-xl font-bold">Search Players</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input
            placeholder="Name"
            value={filter.name ?? ""}
            onChange={(e) => setFilter({ ...filter, name: e.target.value })}
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
          />
          <select
            value={filter.position ?? ""}
            onChange={(e) =>
              setFilter({ ...filter, position: e.target.value || undefined })
            }
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">Any Position</option>
            <option value="GK">GK</option>
            <option value="DF">DF</option>
            <option value="MF">MF</option>
            <option value="AT">AT</option>
          </select>
          <input
            type="number"
            placeholder="Max Price (€)"
            value={filter.priceMax ?? ""}
            onChange={(e) =>
              setFilter({
                ...filter,
                priceMax: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
          />
          <input
            type="number"
            placeholder="Min Rating"
            value={filter.ratingMin ?? ""}
            onChange={(e) =>
              setFilter({
                ...filter,
                ratingMin: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
          />
          <input
            type="number"
            placeholder="Max Rating"
            value={filter.ratingMax ?? ""}
            onChange={(e) =>
              setFilter({
                ...filter,
                ratingMax: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
          />
          <input
            placeholder="Nationality"
            value={filter.nationality ?? ""}
            onChange={(e) =>
              setFilter({ ...filter, nationality: e.target.value })
            }
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <AppButton onClick={handleSearch}>Search</AppButton>
          <AppButton
            variant="secondary"
            onClick={handleViewTeam}
            disabled={!selectedPlayer}
          >
            View Team
          </AppButton>
          <AppButton variant="secondary" onClick={handleBack}>
            Back
          </AppButton>
        </div>
      </AppCard>

      {/* Results */}
      <AppCard>
        {loading ? (
          <ProgressBar />
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <DataTable<Player>
            data={players}
            columns={columns}
            pageSize={15}
            onSelectRow={(row) => setSelectedPlayer(row)}
            emptyMessage="No players found matching filters."
          />
        )}
      </AppCard>
    </div>
  );
}
