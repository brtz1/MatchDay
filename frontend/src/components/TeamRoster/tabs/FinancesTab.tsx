import { useEffect, useState } from "react";
import { getTeamFinances } from "../../../services/team";

interface FinanceRecord {
  id: number;
  amount: number;
  type: string;
  reason: string;
  date: string;
}

export default function FinancesTab() {
  const [balance, setBalance] = useState<number>(0);
  const [ticketPrice, setTicketPrice] = useState<number>(0);
  const [salaries, setSalaries] = useState<number>(0);
  const [recent, setRecent] = useState<FinanceRecord[]>([]);

  useEffect(() => {
    getTeamFinances(1).then((data) => {
      setBalance(data.balance);
      setTicketPrice(data.ticketPrice);
      setSalaries(data.salaries);
      setRecent(data.recent);
    });
  }, []);

  return (
    <div>
      <p className="font-bold text-accent mb-2">Finances</p>
      <p>Balance: €{balance.toLocaleString()}</p>
      <p>Salaries: €{salaries.toLocaleString()} / week</p>
      <p>Ticket Price: €{ticketPrice}</p>
      <hr className="my-2" />
      <p className="font-bold text-accent mb-2">Recent Transactions</p>
      <ul className="space-y-1">
        {recent.map((f) => (
          <li key={f.id}>
            {new Date(f.date).toLocaleDateString()} — {f.type} — €{f.amount.toLocaleString()} ({f.reason})
          </li>
        ))}
      </ul>
    </div>
  );
}
