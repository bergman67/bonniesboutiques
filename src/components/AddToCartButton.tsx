'use client';

import { useCart } from '@/context/CartContext';
import { useState } from 'react';

type Product = {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number;
};

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({ id: product.id, title: product.title, imageUrl: product.imageUrl, price: product.price });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <button
      onClick={handleAdd}
      className="w-full py-4 rounded-xl font-semibold text-base tracking-wide transition-all duration-300 active:scale-95"
      style={added
        ? { background: 'linear-gradient(135deg, #6bcb77, #4caf60)', color: 'white', boxShadow: '0 4px 20px rgba(107,203,119,0.4)' }
        : { background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', boxShadow: '0 4px 20px rgba(232,116,138,0.35)' }
      }
    >
      {added ? '✓ Added to Cart!' : 'Add to Cart — $8.00'}
    </button>
  );
}
