/**
 * Query execution panel
 */

'use client';

import { useState } from 'react';
import { User } from './UserSelector';

interface QueryPanelProps {
  selectedUser: User | null;
  onResults: (results: QueryResults) => void;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

export interface QueryResults {
  count: number;
  rows: Record<string, unknown>[];
  user_id: string;
  error?: string;
}

export function QueryPanel({ selectedUser, onResults, loading, onLoadingChange }: QueryPanelProps) {
  const [query, setQuery] = useState('SELECT * FROM knowledge_nodes');

  const handleExecute = async () => {
    if (!selectedUser) {
      alert('Please select a user first');
      return;
    }

    onLoadingChange(true);
    try {
      const res = await fetch('/api/queries/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUser.email }),
      });

      if (!res.ok) throw new Error('Query execution failed');
      const data = await res.json();
      onResults(data);
    } catch (err) {
      onResults({
        count: 0,
        rows: [],
        user_id: selectedUser.email,
        error: err instanceof Error ? err.message : 'Query failed',
      });
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Query Panel</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selected User: {selectedUser?.full_name || 'None'}
        </label>
        <div className="bg-gray-50 p-3 rounded border border-gray-200">
          {selectedUser ? (
            <div className="text-sm text-gray-600">
              <p>Email: {selectedUser.email}</p>
              <p>Role: {selectedUser.role}</p>
              <p>Org: {selectedUser.org_id}</p>
              <p>Ceiling Level: {selectedUser.ceiling_level}</p>
            </div>
          ) : (
            <p className="text-gray-500">No user selected</p>
          )}
        </div>
      </div>

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
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {loading ? 'Executing...' : 'Execute Query'}
      </button>
    </div>
  );
}
