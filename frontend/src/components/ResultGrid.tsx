/**
 * Results grid component
 */

'use client';

import { useState, useEffect } from 'react';
import { QueryResults } from './QueryPanel';

interface ResultGridProps {
  results: QueryResults | null;
  loading: boolean;
}

export function ResultGrid({ results, loading }: ResultGridProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Reset page when results change
  useEffect(() => {
    setPage(1);
  }, [results]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Results</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Results</h2>
        <p className="text-gray-500">Execute a query to see results</p>
      </div>
    );
  }

  if (results.error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-red-900">Error</h2>
        <p className="text-red-700">{results.error}</p>
      </div>
    );
  }

  const totalPages = Math.max(
    1,
    Math.ceil(results.rows.length / pageSize)
  );

  const paginatedRows = results.rows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Results</h2>

      <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
        <p className="text-blue-900 font-semibold">
          {results.count} rows returned for {results.user_id}
        </p>
      </div>

      {results.rows.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  {Object.keys(results.rows[0]).map((key) => (
                    <th
                      key={key}
                      className="text-left p-2 font-semibold text-gray-700 bg-gray-50"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {paginatedRows.map((row, idx) => (
                  <tr
                    key={`${page}-${idx}`}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    {Object.values(row).map((value, cellIdx) => (
                      <td key={cellIdx} className="p-2 text-gray-700">
                        {typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {results.rows.length > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-gray-500 text-sm">
                Showing {(page - 1) * pageSize + 1} -
                {Math.min(page * pageSize, results.rows.length)} of{' '}
                {results.rows.length} rows
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-amber-500 rounded-md bg-gray-600 text-white text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="px-3 py-1 text-sm font-medium text-black">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-amber-500 rounded-md bg-gray-600 text-white text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500">No rows returned</p>
      )}
    </div>
  );
}