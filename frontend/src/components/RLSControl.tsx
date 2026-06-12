/**
 * RLS toggle control
 */

'use client';

import { useState } from 'react';

interface RLSControlProps {
  onToggle: (enabled: boolean) => void;
}

export function RLSControl({ onToggle }: RLSControlProps) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/queries/toggle-rls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !enabled }),
      });

      if (!res.ok) throw new Error('Toggle failed');
      const newState = !enabled;
      setEnabled(newState);
      onToggle(newState);
    } catch (err) {
      console.error('Failed to toggle RLS:', err);
      alert('Failed to toggle RLS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">RLS Control</h2>

      {!enabled && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded">
          <p className="text-red-900 font-bold">⚠️ WARNING: RLS IS DISABLED</p>
          <p className="text-red-700 text-sm mt-1">
            All security policies are currently bypassed. Enable RLS to restore enforcement.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="font-semibold text-gray-900">Row Level Security</p>
          <p
            className={`text-sm ${
              enabled ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
            }`}
          >
            {enabled ? '🔒 Enabled' : '🔓 Disabled'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            enabled
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:bg-gray-400 disabled:cursor-not-allowed`}
        >
          {loading ? 'Loading...' : enabled ? 'Disable RLS' : 'Enable RLS'}
        </button>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
        <p className="font-semibold mb-2">About RLS:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>RLS enforces security at the database layer, not the application</li>
          <li>Policies apply to all queries, including direct SQL</li>
          <li>Toggling RLS requires admin privileges</li>
          <li>In production, RLS should always be enabled</li>
        </ul>
      </div>
    </div>
  );
}
