/**
 * API proxy routes for frontend
 * Routes requests to the FastAPI backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const body = await request.json();

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}
