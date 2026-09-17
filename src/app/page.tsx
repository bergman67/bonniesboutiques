import { PrismaClient } from '@prisma/client';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';

const prisma = new PrismaClient();

export const revalidate = 0;

export default async function Home() {
  const products = await prisma.product.findMany({
    where: { isDraft: false },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen" style={{ background: '#2d1b3d' }}>
      <Header />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero-bg relative overflow-hidden py-20 sm:py-28 md:py-36 text-center px-6">
        {/* Decorative orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #e8748a, transparent)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-8"
            style={{ background: 'radial-gradient(circle, #c48b7a, transparent)', filter: 'blur(80px)' }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase mb-5 sm:mb-6" style={{ color: '#e8748a' }}>
            ✦ Handcrafted with Love ✦
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif mb-4 sm:mb-6 leading-tight"
            style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
            Every Piece Tells
            <span className="block italic" style={{ color: '#e8748a' }}>a Story</span>
          </h1>
          <p className="text-base sm:text-lg mb-8 sm:mb-10 max-w-xl mx-auto" style={{ color: 'rgba(245, 239, 230, 0.7)' }}>
            Unique handmade keychains and trinkets, lovingly crafted one by one. Carry a little bit of magic wherever you go.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <a href="#collections"
              className="btn-primary px-8 py-3 rounded-full font-semibold text-sm tracking-wide text-center">
              Shop the Collection
            </a>
          </div>
        </div>

        {/* Floating charm icons — hidden on small screens */}
        <div className="hidden sm:block absolute top-12 right-12 text-4xl float-anim opacity-30" style={{ animationDelay: '0s' }}>🔑</div>
        <div className="hidden sm:block absolute bottom-16 left-16 text-3xl float-anim opacity-20" style={{ animationDelay: '1s' }}>✨</div>
        <div className="hidden sm:block absolute top-20 left-1/3 text-2xl float-anim opacity-20" style={{ animationDelay: '2s' }}>💎</div>
      </section>

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
            Made by Bonnie, <span className="italic" style={{ color: '#e8748a' }}>with heart</span>
          </h3>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.65)' }}>
            Every keychain and trinket in this collection is handcrafted by Bonnie — chosen with care, assembled with love,
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
