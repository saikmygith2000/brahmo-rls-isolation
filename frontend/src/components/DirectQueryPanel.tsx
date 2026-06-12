/**
 * Direct query panel - demonstrates RLS enforcement
 */

'use client';

import { useState } from 'react';
import { User } from './UserSelector';

interface DirectQueryPanelProps {
  selectedUser: User | null;
  onResults: (results: Record<string, unknown>) => void;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  rls_enabled: boolean;
}

export function DirectQueryPanel({
  selectedUser,
  onResults,
  loading,
  onLoadingChange,
  rls_enabled,
}: DirectQueryPanelProps) {
  const [query, setQuery] = useState('SELECT * FROM knowledge_nodes');
  const [results, setResults] = useState<Record<string, unknown> | null>(null);

  const handleExecute = async () => {
    if (!selectedUser) {
      alert('Please select a user first');
      return;
    }

    onLoadingChange(true);
    try {
      const res = await fetch('/api/queries/direct-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.email,
          query,
        }),
      });

      if (!res.ok) throw new Error('Query execution failed');
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setResults({
        error: err instanceof Error ? err.message : 'Query failed',
      });
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-2 text-gray-900">Direct SQL Query</h2>
      <p className="text-sm text-gray-600 mb-4">
        Even with direct SQL, RLS policies are enforced at the database level
      </p>

      {!rls_enabled && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
          <p className="text-amber-900 font-semibold">⚠️ RLS Currently Disabled</p>
          <p className="text-amber-700 text-sm mt-1">
            All rows will be returned regardless of user context.
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SQL Query
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="text-white bg-black w-full p-3 border border-gray-300 rounded font-mono text-sm"
          rows={4}
          disabled={loading}
        />
      </div>

      <button
        onClick={handleExecute}
        disabled={!selectedUser || loading}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {loading ? 'Executing...' : 'Execute Direct Query'}
      </button>

      {results && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded">
          <h3 className="font-semibold text-gray-900 mb-2">Results</h3>
          <pre className="bg-black p-3 border border-gray-300 rounded text-xs overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
