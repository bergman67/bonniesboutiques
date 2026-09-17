'use client';

import { useEffect } from 'react';

export default function Error({
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
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ background: '#2d1b3d' }}>
      <div className="text-5xl mb-6">✨</div>
      <h2 className="text-2xl font-serif mb-3" style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
        Something went wrong
      </h2>
      <p className="text-sm mb-8" style={{ color: 'rgba(245, 239, 230, 0.5)' }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="btn-primary px-6 py-2 rounded-full text-sm font-semibold"
        style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        Try Again
      </button>
    </div>
  );
}
