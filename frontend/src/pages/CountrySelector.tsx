import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CountryTeamCounts {
  [country: string]: number;
}

// Helper to get flag image URL
const getFlagUrl = (country: string) => {
  const isoMap: Record<string, string> = {
    'England': 'gb-eng',
    'Scotland': 'gb-sct',
    'Wales': 'gb-wls',
    'Northern Ireland': 'gb-nir',
    'United States': 'us',
    'South Korea': 'kr',
  };

  const override = isoMap[country];
  const code = override || country.slice(0, 2).toLowerCase();
  return `https://flagcdn.com/w40/${code}.png`;
};

export default function CountrySelector() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [teamCounts, setTeamCounts] = useState<CountryTeamCounts>({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:4000/api/countries')
      .then(res => res.json())
      .then(data => {
        if (!data.countries || !data.teamCounts) {
          setError('Invalid country data from server');
          return;
        }
        setCountries(data.countries);
        setTeamCounts(data.teamCounts);
      })
      .catch(() => setError('Failed to load countries'));
  }, []);

  const toggleCountry = (country: string) => {
    setSelected(prev =>
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  };

  const handleStart = () => {
    const totalTeams = selected.reduce((sum, country) => sum + (teamCounts[country] || 0), 0);
    if (totalTeams < 128) {
      setError('Please select enough countries to reach 128 teams');
      return;
    }
    console.log('Navigating to /draw with:', selected);
    navigate('/draw', { state: { selectedCountries: selected } });
  };

  const totalSelectedClubs = selected.reduce(
    (sum, country) => sum + (teamCounts[country] || 0),
    0
  );

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-green-900 text-white px-4">
      <h1 className="text-6xl font-bold mb-10 tracking-wide text-yellow-400">
        MatchDay! <span className="text-sm align-top">25</span>
      </h1>

      <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-md w-full max-w-5xl mb-6 flex flex-col sm:flex-row gap-6">
        <div className="flex-1">
          <h2 className="text-xl mb-4 font-semibold">Select Countries</h2>
          <p className="mb-4 text-gray-300">Pick countries to form the league (128 teams minimum).</p>
          {error && <p className="text-red-400 mb-4 font-semibold">{error}</p>}
          <table className="w-full bg-white text-black rounded overflow-hidden">
            <thead>
              <tr className="text-yellow-600 border-b border-gray-300 text-left text-lg">
                <th className="p-2">Flag</th>
                <th className="p-2">Country</th>
                <th className="p-2">Clubs</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((country) => (
                <tr
                  key={country}
                  onClick={() => toggleCountry(country)}
                  className={`cursor-pointer hover:bg-yellow-100 transition border-b border-gray-300
                    ${selected.includes(country) ? 'bg-yellow-200 font-bold' : ''}`}
                >
                  <td className="p-2">
                    <img src={getFlagUrl(country)} alt={country} className="w-6 h-4 rounded shadow" />
                  </td>
                  <td className="p-2">{country}</td>
                  <td className="p-2">{teamCounts[country] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-full sm:w-64 bg-white bg-opacity-10 rounded p-4 text-center flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-2">Selected Clubs</h3>
            <p className="text-3xl font-bold text-yellow-300">{totalSelectedClubs}</p>
            <p className="text-sm text-gray-300 mt-1">from {selected.length} countries</p>
          </div>
          <button
            onClick={handleStart}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded mt-6"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
