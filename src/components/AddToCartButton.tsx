'use client';

import { useCart } from '@/context/CartContext';
import { trackCommerceEvent } from '@/lib/analytics';
import { useEffect, useState } from 'react';

type Product = {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number;
};

interface AddToCartButtonProps {
  product: Product;
  onAdded?: () => void;
  className?: string;
  compact?: boolean;
  trackViewContent?: boolean;
}

export default function AddToCartButton({
  product,
  onAdded,
  className,
  compact,
  trackViewContent,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (trackViewContent) {
      trackCommerceEvent('ViewContent', {
        item_id: product.id,
        item_name: product.title,
        value: product.price,
        currency: 'USD',
      });
    }
  }, [trackViewContent, product.id, product.title, product.price]);

  const handleAdd = () => {
    addItem({ id: product.id, title: product.title, imageUrl: product.imageUrl, price: product.price });
    setAdded(true);
    if (onAdded) {
      onAdded();
    }
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <button
      onClick={handleAdd}
      className={`w-full ${compact ? 'py-2.5 px-4 text-sm' : 'py-4'} rounded-xl font-semibold tracking-wide transition-all duration-300 active:scale-95 ${className || ''}`}
      style={added
        ? { background: 'linear-gradient(135deg, #6bcb77, #4caf60)', color: 'white', boxShadow: '0 4px 20px rgba(107,203,119,0.4)' }
        : { background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', boxShadow: '0 4px 20px rgba(232,116,138,0.35)' }
      }
    >
      {added ? '✓ Added to Cart!' : `Add to Cart — $${product.price.toFixed(2)}`}
    </button>
  );
}
