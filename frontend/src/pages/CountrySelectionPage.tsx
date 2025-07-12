import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getFlagUrl } from "@/utils/getFlagUrl";

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

interface CountryTeamCounts {
  [country: string]: number;
}

interface CountryApiResponse {
  countries: string[];
  teamCounts: CountryTeamCounts;
}

/* ------------------------------------------------------------------------- */
/* Component                                                                 */
/* ------------------------------------------------------------------------- */

export default function CountrySelectionPage() {
  const navigate = useNavigate();

  const [countries, setCountries] = useState<string[]>([]);
  const [teamCounts, setTeamCounts] = useState<CountryTeamCounts>({});
  const [selected, setSelected] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ─────────────────────────────── Load list */
  useEffect(() => {
    axios
      .get<CountryApiResponse>("/countries")
      .then(({ data }) => {
        if (!data?.countries) throw new Error("Invalid response");
        setCountries(data.countries);
        setTeamCounts(data.teamCounts);
      })
      .catch(() => setError("Failed to load country list"))
      .finally(() => setLoading(false));
  }, []);

  /* ─────────────────────────────── Helpers */
  const toggleCountry = (c: string) =>
    setSelected((prev) =>
      prev.includes(c) ? prev.filter((v) => v !== c) : [...prev, c]
    );

  const totalClubs = selected.reduce(
    (sum, c) => sum + (teamCounts[c] ?? 0),
    0
  );

  /* ─────────────────────────────── Start */
  function handleStart() {
    if (totalClubs < 128) {
      setError("Pick enough countries to reach 128 clubs.");
      return;
    }
    navigate("/draw", { state: { selectedCountries: selected } });
  }

  /* ----------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ----------------------------------------------------------------------- */

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-900 px-4 py-10 text-white">
      {/* Title */}
      <h1 className="mb-10 text-6xl font-bold tracking-wide text-yellow-400">
        MatchDay!{" "}
        <span className="align-top text-sm text-white/70">25</span>
      </h1>

      {/* Card */}
      <AppCard className="flex w-full max-w-6xl flex-col gap-6 bg-white/10 p-6 backdrop-blur-sm sm:flex-row">
        {/* ── Country table */}
        <div className="flex-1">
          <h2 className="mb-2 text-xl font-semibold">
            Select Countries
          </h2>
          <p className="mb-4 text-gray-300">
            Pick countries until you hit <strong>128 clubs</strong>.
          </p>

          {error && (
            <p className="mb-4 font-semibold text-red-400">{error}</p>
          )}

          {loading ? (
            <div className="flex items-center gap-3">
              <ProgressBar height={0.5} />
              <span>Loading countries…</span>
            </div>
          ) : (
            <table className="w-full overflow-hidden rounded bg-white text-black">
              <thead>
                <tr className="border-b border-gray-300 text-left text-sm font-semibold text-yellow-600">
                  <th className="p-2">Flag</th>
                  <th className="p-2">Country</th>
                  <th className="p-2">Clubs</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => {
                  const selectedRow = selected.includes(c);
                  return (
                    <tr
                      key={c}
                      onClick={() => toggleCountry(c)}
                      className={clsx(
                        "cursor-pointer border-b border-gray-300 transition-colors hover:bg-yellow-100",
                        selectedRow && "bg-yellow-200 font-bold"
                      )}
                    >
                      <td className="p-2">
                        <img
                          src={getFlagUrl(c)}
                          alt={c}
                          className="h-4 w-6 rounded shadow"
                        />
                      </td>
                      <td className="p-2">{c}</td>
                      <td className="p-2">
                        {teamCounts[c] ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Summary sidebar */}
        <AppCard
          variant="outline"
          className="flex w-full flex-col items-center justify-between bg-white/10 sm:w-64"
        >
          <div className="text-center">
            <h3 className="mb-2 text-lg font-bold">Selected Clubs</h3>
            <p className="text-3xl font-bold text-yellow-300">
              {totalClubs}
            </p>
            <p className="mt-1 text-sm text-gray-300">
              from {selected.length} countries
            </p>
          </div>

          <AppButton
            onClick={handleStart}
            variant="primary"
            className="mt-6 w-full"
          >
            Start
          </AppButton>
        </AppCard>
      </AppCard>
    </div>
  );
}
