'use client';

import { useState } from 'react';
import { UserSelector, type User } from '@/components/UserSelector';
import { QueryPanel, type QueryResults } from '@/components/QueryPanel';
import { ResultGrid } from '@/components/ResultGrid';
import { PolicyViewer } from '@/components/PolicyViewer';
import { DirectQueryPanel } from '@/components/DirectQueryPanel';
import { ComparisonPanel } from '@/components/ComparisonPanel';
import { RLSControl } from '@/components/RLSControl';

export default function Dashboard() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [queryResults, setQueryResults] = useState<QueryResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [rls_enabled, setRlsEnabled] = useState(true);

  return (
    <div className="bg-slate-900 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" style={{ background: `lab(7.78673% 1.82346 -15.0537)` }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold">BRAHMO RLS Demonstration</h1>
            <p className="text-slate-300 mt-2">Database-Level Security Enforcement</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 bg-slate-800/50 p-4 rounded-lg">
            <div>
              <h3 className="font-semibold text-slate-200 mb-2">🎯 Core Principle</h3>
              <p className="text-slate-300 text-sm">
                Same SQL query + Different JWT claims = Different results
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 mb-2">🔒 Security Model</h3>
              <p className="text-slate-300 text-sm">
                Bypassing the application DOES NOT bypass database security
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <a href="#demo" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
            Live Demo
          </a>
          <a href="#compare" className="px-4 py-2 bg-white text-gray-700 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50">
            Compare Users
          </a>
          <a href="#policies" className="px-4 py-2 bg-white text-gray-700 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50">
            Policies
          </a>
          <a href="#direct" className="px-4 py-2 bg-white text-gray-700 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50">
            Direct Query
          </a>
          <a href="#control" className="px-4 py-2 bg-white text-gray-700 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50">
            RLS Control
          </a>
        </div>

        {/* Demo Section */}
        <section id="demo" className="space-y-6 mb-12">
          <div className="flex flex-col grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <UserSelector
                onUserSelect={setSelectedUser}
                selectedUser={selectedUser}
                loading={loading}
              />
            </div>

            <div className="lg:col-span-2">
              <QueryPanel
                selectedUser={selectedUser}
                onResults={setQueryResults}
                loading={loading}
                onLoadingChange={setLoading}
              />
            </div>
          </div>

          <ResultGrid results={queryResults} loading={loading} />
        </section>

        {/* Comparison Section */}
        <section id="compare" className="mb-12">
          <ComparisonPanel />
        </section>

        {/* Policies Section */}
        <section id="policies" className="mb-12">
          <PolicyViewer rls_enabled={rls_enabled} />
        </section>

        {/* Direct Query Section */}
        <section id="direct" className="mb-12">
          <DirectQueryPanel
            selectedUser={selectedUser}
            onResults={(data) => console.log(data)}
            loading={loading}
            onLoadingChange={setLoading}
            rls_enabled={rls_enabled}
          />
        </section>

        {/* RLS Control Section */}
        <section id="control" className="mb-12">
          <RLSControl onToggle={setRlsEnabled} />
        </section>

        {/* Footer Info */}
        <section className="mt-12 bg-white p-8 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Architecture</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Backend Stack</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ FastAPI (async)</li>
                <li>✓ PostgreSQL with asyncpg</li>
                <li>✓ JWT claim simulation</li>
                <li>✓ Service role key for admin operations</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Security Model</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ Organization isolation (org_id)</li>
                <li>✓ Department scoping</li>
                <li>✓ Permission ceiling (hierarchy_level)</li>
                <li>✓ Compliance filtering (MNPI, etc.)</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-900 font-semibold mb-2">RLS Policies</p>
            <p className="text-blue-800 text-sm">
              Four independent RLS policies protect the knowledge_nodes table. Each policy
              filters rows based on specific security criteria. All policies must pass for
              a row to be returned. This is the database-level enforcement that makes this
              demonstration secure.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>BRAHMO RLS Demonstration Platform © 2024</p>
          <p className="text-sm mt-2">
            Demonstrating how PostgreSQL Row Level Security enforces access control at the
            database layer
          </p>
        </div>
      </footer>
    </div>
  );
}
