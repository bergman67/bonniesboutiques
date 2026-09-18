import dynamic from 'next/dynamic';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';

const ScrollytellingExperience = dynamic(
  () => import('@/components/scrollytelling/ScrollytellingExperience'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0f24]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-cream-100/60 tracking-widest uppercase">
            Loading Boutique Experience...
          </p>
        </div>
      </div>
    ),
  }
);

export const revalidate = 0;

export default async function Home() {
  let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  try {
    products = await prisma.product.findMany({
      where: { isDraft: false },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Failed to load products for homepage:', error);
  }

  const scrollyProducts = products.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price ?? 8.0,
    imageUrl: p.imageUrl,
    description: p.description,
  }));

  return (
    <div className="min-h-screen" style={{ background: '#2d1b3d' }}>
      <Header />

      {/* ── 3D / 16-BIT SCROLLYTELLING JOURNEY ──────────────── */}
      <ScrollytellingExperience products={scrollyProducts} />

      <div className="section-divider mx-6 md:mx-24" />

      {/* ── TRUST BAR ────────────────────────────────────────── */}
      <div className="py-6 sm:py-8 px-6" style={{ background: 'rgba(26, 15, 36, 0.4)' }}>
        <div className="max-w-md mx-auto flex justify-center gap-12 sm:gap-16 text-center">
          {[
            { icon: '🎨', label: 'Handmade', sub: 'Every piece crafted by hand' },
            { icon: '💝', label: 'One-of-a-Kind', sub: 'No two are exactly alike' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <span className="text-2xl">{item.icon}</span>
              <span className="font-semibold text-sm" style={{ color: '#e8748a' }}>{item.label}</span>
              <span className="text-xs hidden sm:block" style={{ color: 'rgba(245, 239, 230, 0.5)' }}>{item.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider mx-6 md:mx-24" />

      {/* ── PRODUCT GRID ─────────────────────────────────────── */}
      <section id="collections" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: '#e8748a' }}>✦ Browse All ✦</p>
          <h2 className="text-3xl sm:text-4xl font-serif" style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
            The Full Collection
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'rgba(245, 239, 230, 0.5)' }}>
            {products.length} unique handcrafted pieces · Tap to explore
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'rgba(245, 239, 230, 0.4)' }}>
            <p className="text-2xl font-serif">New collection coming soon...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={{ id: p.id, title: p.title, imageUrl: p.imageUrl, price: p.price ?? 8 }} />
            ))}
          </div>
        )}
      </section>

      {/* ── ABOUT ────────────────────────────────────────────── */}
      <div className="section-divider mx-6 md:mx-24" />
      <section id="about" className="py-16 sm:py-20 px-6 text-center" style={{ background: 'rgba(26, 15, 36, 0.5)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#e8748a' }}>✦ The Maker ✦</p>
          <h3 className="text-2xl sm:text-3xl font-serif mb-6"
            style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
            Made by Bonnie & Tammy, <span className="italic" style={{ color: '#e8748a' }}>with heart</span>
          </h3>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.65)' }}>
            Every keychain and trinket in this collection is handcrafted by Bonnie & Tammy — chosen with care, assembled with love,
            and made to bring a little joy to everyday moments. Whether it&apos;s a gift for someone special or a treat for
            yourself, each piece carries its own personality.
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="py-10 text-center border-t" style={{ borderColor: 'rgba(232, 116, 138, 0.1)', background: '#1a0f24' }}>
        <p className="text-xs" style={{ color: 'rgba(245, 239, 230, 0.35)' }}>
          &copy; {new Date().getFullYear()} Bonnie&apos;s Boutique · Handcrafted with love
        </p>
      </footer>
    </div>
  );
}
