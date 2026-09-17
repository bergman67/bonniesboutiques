'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';

type Product = {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number;
};

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      title: product.title,
      imageUrl: product.imageUrl,
      price: product.price,
    });
  };

  return (
    <Link href={`/products/${product.id}`} className="product-card cursor-pointer block">
      <div className="card-inner">
        {/* Image */}
        <div className="product-image-wrap aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-contain p-4"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🔑</div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 pb-2">
          <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: 'rgba(245, 239, 230, 0.85)' }}>
            {product.title}
          </p>
          <p className="text-sm font-bold mt-1.5" style={{ color: '#e8748a' }}>
            ${product.price.toFixed(2)}
          </p>
        </div>

        {/* Add to cart */}
        <div className="px-3 pb-3">
          <button
            onClick={handleAddToCart}
            className="btn-primary w-full text-xs py-2 rounded-lg font-semibold tracking-wide active:scale-95 transition-transform"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </Link>
  );
}
