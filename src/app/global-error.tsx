'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ background: '#2d1b3d', margin: 0, fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>✨</div>
          <h2 style={{ color: '#f5efe6', fontSize: '24px', marginBottom: '12px' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'rgba(245, 239, 230, 0.5)', fontSize: '14px', marginBottom: '32px' }}>
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', border: 'none', borderRadius: '9999px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
