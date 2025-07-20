import React, { useEffect, useState } from 'react';
import api from '@/services/axios';
import CupBracket, { CupMatch } from '@/components/cup/CupBracket';

export default function CupLogPage() {
  const [matches, setMatches] = useState<CupMatch[]>([]);

  useEffect(() => {
    api
      .get('/cup/log')
      .then((res) => setMatches(res.data))
      .catch((err) => console.error('Failed to load cup log:', err));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Cup Bracket</h1>
      <CupBracket matches={matches} />
    </div>
  );
}
