import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import AddToCartButton from '@/components/AddToCartButton';
import Link from 'next/link';

const prisma = new PrismaClient();

export const revalidate = 0;

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });

  if (!product || product.isDraft) notFound();

  const related = await prisma.product.findMany({
    where: { isDraft: false, id: { not: product.id } },
    take: 4,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen" style={{ background: '#2d1b3d' }}>
      <Header />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <nav className="text-xs flex items-center gap-2" style={{ color: 'rgba(245,239,230,0.4)' }}>
          <Link href="/" className="hover:text-[#e8748a] transition-colors">Shop</Link>
          <span>›</span>
          <span className="truncate max-w-[200px]" style={{ color: 'rgba(245,239,230,0.7)' }}>{product.title}</span>
        </nav>
      </div>

      {/* Product Detail */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">

          {/* Image */}
          <div className="sticky top-24">
            <div
              className="aspect-square rounded-2xl overflow-hidden relative flex items-center justify-center"
              style={{
                background: '#f5efe6',
                border: '1px solid rgba(232,116,138,0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-contain p-8"
                  style={{ mixBlendMode: 'multiply', filter: 'contrast(1.1) brightness(1.05) drop-shadow(0 16px 40px rgba(0,0,0,0.2))' }}
                />
              ) : (
                <div className="text-8xl">🔑</div>
              )}
              {/* Spotlight */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/3 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at bottom center, rgba(196,139,122,0.15) 0%, transparent 70%)' }} />
            </div>

            {/* Share / Back */}
            <div className="flex gap-3 mt-4">
              <Link href="/" className="flex-1 text-center py-2.5 rounded-xl text-sm transition-all"
                style={{ background: 'rgba(61,37,82,0.5)', color: 'rgba(245,239,230,0.6)', border: '1px solid rgba(232,116,138,0.1)' }}>
                ← Back to Shop
              </Link>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full w-fit"
              style={{ background: 'rgba(232,116,138,0.12)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.25)' }}>
              ✦ Handcrafted Original
            </span>

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif leading-tight mb-3"
                style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
                {product.title}
              </h1>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold" style={{ color: '#e8748a' }}>
                  ${(product.price ?? 8).toFixed(2)}
                </span>
                <span className="text-sm" style={{ color: 'rgba(245,239,230,0.4)' }}>· Free shipping on orders over $20</span>
              </div>
            </div>

            {/* Description */}
            <div className="py-5 border-y" style={{ borderColor: 'rgba(232,116,138,0.1)' }}>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(245,239,230,0.7)' }}>
                {product.description || 'A unique, handcrafted trinket made with love by Bonnie. Each piece is one-of-a-kind — no two are exactly alike. Perfect for accessorizing your keys, bag, or as a thoughtful gift.'}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-2.5">
              {[
                { icon: '🎨', text: 'Handmade — crafted one by one' },
                { icon: '💝', text: 'One-of-a-kind — yours exclusively' },
                { icon: '📦', text: 'Carefully packaged for safe delivery' },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-3">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-sm" style={{ color: 'rgba(245,239,230,0.6)' }}>{f.text}</span>
                </div>
              ))}
            </div>

            {/* Add to Cart */}
            <AddToCartButton product={{ id: product.id, title: product.title, imageUrl: product.imageUrl, price: product.price ?? 8 }} />

            {/* Trust note */}
            <p className="text-xs text-center" style={{ color: 'rgba(245,239,230,0.3)' }}>
              🔒 Secure checkout · 100% handmade
            </p>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-20 sm:mt-28">
            <div className="section-divider mb-12" />
            <div className="text-center mb-10">
              <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: '#e8748a' }}>✦ You Might Also Love ✦</p>
              <h3 className="text-2xl font-serif" style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>More Trinkets</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map(p => (
                <ProductCard key={p.id} product={{ id: p.id, title: p.title, imageUrl: p.imageUrl, price: p.price ?? 8 }} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 py-10 text-center border-t" style={{ borderColor: 'rgba(232,116,138,0.1)', background: '#1a0f24' }}>
        <p className="text-xs" style={{ color: 'rgba(245,239,230,0.35)' }}>
          &copy; {new Date().getFullYear()} Bonnie&apos;s Boutique · Handcrafted with love
        </p>
      </footer>
    </div>
  );
}
