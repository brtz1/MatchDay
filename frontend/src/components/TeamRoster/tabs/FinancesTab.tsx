import { SaveGameFinance } from '@prisma/client';

interface FinancesTabProps {
  finances: SaveGameFinance[];
}

export default function FinancesTab({ finances }: FinancesTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-md font-medium mb-2">Recent Transactions</h3>
        <ul className="divide-y divide-gray-200">
          {finances.map((tx, index) => (
            <li key={index} className="py-2 flex justify-between">
              <span>{tx.description}</span>
              <span className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                {tx.amount >= 0 ? '+' : ''}${tx.amount.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
