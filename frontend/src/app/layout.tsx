import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BRAHMO RLS Demonstration',
  description: 'Database-level security enforcement using PostgreSQL Row Level Security',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
