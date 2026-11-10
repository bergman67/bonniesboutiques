import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Bonnie & Tammy's Trinket Tales Studio | 16-Bit Short-Form Skits & Animation",
  description:
    'Autonomous short-form 16-bit character animation and lo-fi skit studio for TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels.',
};

const TrinketTalesStudio = dynamic(
  () => import('@/components/studio/TrinketTalesStudio'),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center select-none"
        style={{
          background: 'linear-gradient(135deg, #120919 0%, #1a0f24 50%, #251235 100%)',
          color: '#f5efe6',
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-3xl animate-bounce mb-4 shadow-xl">
          🎬
        </div>
        <h2 className="text-xl font-extrabold text-white mb-2">
          Loading Trinket Tales Studio...
        </h2>
        <p className="text-xs text-rose-300 max-w-sm">
          Warming up 16-bit procedural canvas sprites, Web Audio synthesizer, and 96 product props.
        </p>
      </div>
    ),
  }
);

export default function StudioPage() {
  return <TrinketTalesStudio />;
}
