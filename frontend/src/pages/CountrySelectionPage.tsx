// frontend/src/pages/CountrySelectionPage.tsx

import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

import api from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getFlagUrl } from "@/utils/getFlagUrl";

interface CountryTeamCounts {
  [country: string]: number;
}

interface CountryApiResponse {
  countries: string[];
  teamCounts: CountryTeamCounts;
}

export default function CountrySelectionPage() {
  const navigate = useNavigate();

  const [countries, setCountries] = useState<string[]>([]);
  const [teamCounts, setTeamCounts] = useState<CountryTeamCounts>({});
  const [selected, setSelected] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      // Explicit full API path ensures correct endpoint hit
      .get<CountryApiResponse>("/countries")
      .then(({ data }) => {
        if (!Array.isArray(data.countries)) {
          throw new Error("Invalid response: countries must be an array");
        }
        setCountries(data.countries);
        setTeamCounts(data.teamCounts || {});
      })
      .catch(() => setError("Failed to load country list"))
      .finally(() => setLoading(false));
  }, []);

  const toggleCountry = (c: string) =>
    setSelected((prev) =>
      prev.includes(c) ? prev.filter((v) => v !== c) : [...prev, c]
    );

  const toggleSelectAll = () => {
    if (selected.length === countries.length) {
      setSelected([]);
    } else {
      setSelected([...countries]);
    }
  };

  const totalClubs = selected.reduce(
    (sum, c) => sum + (teamCounts[c] ?? 0),
    0
  );

  function handleStart() {
    if (totalClubs < 128) {
      setError("Pick enough countries to reach 128 clubs.");
      return;
    }
    // Persist selection so DrawPage can recover on refresh
    localStorage.setItem("selectedCountries", JSON.stringify(selected));
    // Go to Draw; coach name will be handled there
    navigate("/draw", { state: { selectedCountries: selected } });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-900">
        <ProgressBar height={1} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-green-900 p-4">
        <p className="mb-4 text-red-400 font-semibold">{error}</p>
        <AppButton onClick={() => window.location.reload()}>Retry</AppButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-900 px-4 py-10 text-white">
      <h1 className="mb-10 text-6xl font-bold tracking-wide text-yellow-400">
        MatchDay! <span className="align-top text-sm text-white/70">25</span>
      </h1>

      <AppCard className="flex w-full max-w-6xl flex-col gap-6 bg-white/10 p-6 backdrop-blur-sm sm:flex-row">
        {/* Country table */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Select Countries</h2>
            <button
              onClick={toggleSelectAll}
              className="rounded bg-yellow-400 px-3 py-1 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-50"
            >
              {selected.length === countries.length ? "Clear All" : "Select All"}
            </button>
          </div>

          <p className="mb-4 text-gray-300">
            Pick countries until you hit <strong>128 clubs</strong>.
          </p>

          <div className="max-h-[500px] overflow-y-auto rounded bg-white text-black">
            <table className="w-full table-auto border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-300 text-left text-sm font-semibold text-yellow-600">
                  <th className="p-2">Flag</th>
                  <th className="p-2">Country</th>
                  <th className="p-2">Clubs</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => {
                  const isSelected = selected.includes(c);
                  return (
                    <tr
                      key={c}
                      onClick={() => toggleCountry(c)}
                      className={clsx(
                        "cursor-pointer border-b border-gray-300 transition-colors hover:bg-yellow-100",
                        isSelected && "bg-yellow-200 font-bold"
                      )}
                    >
                      <td className="p-2">
                        <img
                          src={getFlagUrl(c)}
                          alt={c}
                          className="h-4 w-6 rounded shadow"
                          onError={(e) =>
                            (e.currentTarget.src =
                              "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=")
                          }
                        />
                      </td>
                      <td className="p-2">{c}</td>
                      <td className="p-2">{teamCounts[c] ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary sidebar */}
        <AppCard
          variant="outline"
          className="flex w-full flex-col items-center justify-between bg-white/10 sm:w-64"
        >
          <div className="text-center">
            <h3 className="mb-2 text-lg font-bold">Selected Clubs</h3>
            <p className="text-3xl font-bold text-yellow-300">{totalClubs}</p>
            <p className="mt-1 text-sm text-gray-300">
              from {selected.length} countries
            </p>
          </div>

          <AppButton
            onClick={handleStart}
            variant="primary"
            className="mt-6 w-full"
          >
            Continue
          </AppButton>
        </AppCard>
      </AppCard>
    </div>
  );
}
