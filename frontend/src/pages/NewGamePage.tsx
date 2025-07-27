// File: frontend/src/pages/NewGamePage.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/axios';

interface Country {
  code: string;
  iso2: string;
  name: string;
  flag?: string;
  continent: string;
}

export default function NewGamePage() {
  const navigate = useNavigate();
  const [coachName, setCoachName] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    axios.get<Country[]>('/api/countries')
      .then(res => setCountries(res.data))
      .catch(() => setError('Failed to load countries'));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!coachName || selectedCountries.length === 0) {
      setError('Please enter your name and select at least one country.');
      return;
    }

    // ✅ Just navigate to DrawPage and pass data
    navigate("/draw", {
      state: {
        coachName,
        selectedCountries,
      },
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Start New Game</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Coach Name</label>
          <input
            type="text"
            value={coachName}
            onChange={e => setCoachName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-1">Select Countries</label>
          <select
            multiple
            value={selectedCountries}
            onChange={e => {
              const opts = Array.from(e.target.selectedOptions, o => o.value);
              setSelectedCountries(opts);
            }}
            className="w-full p-2 border rounded"
          >
            {countries.map(c => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Draw Teams
        </button>
      </form>
    </div>
  );
}
