/**
 * Comparison panel - shows same query, different results
 */

'use client';

import { useState } from 'react';

interface ComparisonResult {
  count: number;
  rows: Record<string, unknown>[];
  user_id: string;
  error?: string;
}

export function ComparisonPanel() {
  const [results, setResults] = useState<ComparisonResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/queries/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'SELECT * FROM knowledge_nodes',
        }),
      });

      if (!res.ok) throw new Error('Comparison failed');
      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-2 text-gray-900">Compare Across Users</h2>
      <p className="text-sm text-gray-600 mb-4">
        Run the same query for all users and compare results
      </p>

      <button
        onClick={handleCompare}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {loading ? 'Comparing...' : 'Compare All Users'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-6">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-900 font-semibold text-center">
              Same Query. Different JWT. Different Results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((result) => (
              <div
                key={result.user_id}
                className="p-4 border border-gray-200 rounded-lg bg-gray-50"
              >
                <h3 className="font-semibold text-gray-900">{result.user_id}</h3>
                <p className="text-2xl font-bold text-blue-600 mt-2">{result.count}</p>
                <p className="text-sm text-gray-600">rows returned</p>
                {result.error && <p className="text-red-600 text-sm mt-2">{result.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
