/**
 * User selector component - displays all demo users as cards
 */

'use client';

import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  full_name: string;
  org_id: string;
  role: string;
  department: string | null;
  ceiling_level: number;
  compliance_clearance: string[];
  created_at: string;
}

interface UserSelectorProps {
  onUserSelect: (user: User) => void;
  selectedUser: User | null;
  loading: boolean;
}

export function UserSelector({ onUserSelect, selectedUser, loading }: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setFetching(false);
      }
    };

    fetchUsers();
  }, []);

  if (fetching) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Loading users...</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <p className="text-red-700 font-semibold">Error loading users</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Demo Users</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => onUserSelect(user)}
            disabled={loading}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedUser?.id === user.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="font-semibold text-gray-900">{user.full_name}</div>
            <div className="text-sm text-gray-600">{user.email}</div>
            <div className="text-xs text-gray-500 mt-2">
              <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-2">
                {user.role}
              </span>
              <span className="inline-block bg-gray-100 px-2 py-1 rounded">
                Level {user.ceiling_level}
              </span>
            </div>
            {user.compliance_clearance && user.compliance_clearance.length > 0 && (
              <div className="text-xs text-amber-600 mt-2">
                🔒 {user.compliance_clearance.join(', ')}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
