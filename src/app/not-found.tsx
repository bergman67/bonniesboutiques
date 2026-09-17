import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ background: '#2d1b3d' }}>
      <div className="text-6xl mb-6">🔑</div>
      <h2 className="text-3xl font-serif mb-3" style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
        Page Not Found
      </h2>
      <p className="text-sm mb-8" style={{ color: 'rgba(245, 239, 230, 0.5)' }}>
        Oops! We couldn&apos;t find what you were looking for.
      </p>
      <Link
        href="/"
        className="btn-primary px-6 py-2 rounded-full text-sm font-semibold"
        style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', textDecoration: 'none', borderRadius: '9999px', padding: '10px 24px' }}
      >
        Back to Shop
      </Link>
    </div>
  );
}
