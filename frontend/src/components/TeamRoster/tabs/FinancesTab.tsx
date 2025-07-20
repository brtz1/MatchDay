interface PlayerFinanceDTO {
  id: number;
  name: string;
  salary: number;
}

interface FinancesTabProps {
  finances: PlayerFinanceDTO[];
}

export default function FinancesTab({ finances }: FinancesTabProps) {
  const totalSalary = finances.reduce((sum, f) => sum + (f.salary || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-md font-medium mb-2">Weekly Salary Breakdown</h3>
        <ul className="divide-y divide-gray-200">
          {finances.map((player) => (
            <li key={player.id} className="py-2 flex justify-between">
              <span>{player.name}</span>
              <span className="text-gray-800">${player.salary.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-4 border-t border-gray-300 text-right">
        <span className="font-semibold text-gray-700">Total: </span>
        <span className="text-black">${totalSalary.toLocaleString()}</span>
      </div>
    </div>
  );
}
