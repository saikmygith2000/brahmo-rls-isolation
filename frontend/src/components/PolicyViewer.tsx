/**
 * RLS Policies viewer
 */

'use client';

import { useState, useEffect } from 'react';

interface Policy {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  qual?: string;
  with_check?: string;
}

interface PolicyViewerProps {
  rls_enabled: boolean;
}

export function PolicyViewer({ rls_enabled }: PolicyViewerProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await fetch('/api/queries/policies', {
          method: 'GET',
        });
        if (!res.ok) throw new Error('Failed to fetch policies');
        const data = await res.json();
        setPolicies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch policies');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, [rls_enabled]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">RLS Policies</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">RLS Policies</h2>
        <div
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            rls_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {rls_enabled ? '🔒 RLS Enabled' : '🔓 RLS Disabled'}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {policies.length > 0 ? (
        <div className="space-y-3">
          {policies.map((policy) => (
            <div
              key={policy.policyname}
              className="p-4 border border-gray-200 rounded-lg bg-gray-50"
            >
              <h3 className="font-semibold text-gray-900 mb-2">{policy.policyname}</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  <strong>Type:</strong> {policy.permissive}
                </p>
                <p>
                  <strong>Table:</strong> {policy.schemaname}.{policy.tablename}
                </p>
                {policy.qual && (
                  <p>
                    <strong>Condition:</strong>
                    <code className="block mt-1 p-2 bg-white border border-gray-300 rounded font-mono text-xs overflow-auto">
                      {policy.qual}
                    </code>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No policies found</p>
      )}

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-900 text-sm">
          <strong>About RLS:</strong> Row Level Security ensures that queries respect
          these policies regardless of how the request is made—even direct SQL queries
          enforce them at the database level.
        </p>
      </div>
    </div>
  );
}
