"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  isDraft: boolean;
  createdAt: string;
};

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('8');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, price: parseFloat(price) || 8, imageUrl, isDraft: false }),
      });

      setTitle(''); setDescription(''); setPrice('8'); setFile(null); setPreview(null);
      await fetchProducts();
      showToast('✓ Product added successfully!');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
    showToast('Product deleted.');
  };

  const handleToggleDraft = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, isDraft: !p.isDraft }),
    });
    fetchProducts();
    showToast(p.isDraft ? '✓ Product published!' : 'Product set to draft.');
  };

  const filtered = products
    .filter(p => filter === 'all' ? true : filter === 'draft' ? p.isDraft : !p.isDraft)
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: products.length,
    published: products.filter(p => !p.isDraft).length,
    draft: products.filter(p => p.isDraft).length,
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#1a0f24' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-5 py-3 rounded-lg text-sm font-medium shadow-xl"
          style={{ background: '#e8748a', color: 'white' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 py-4 px-6 flex justify-between items-center" style={{
        background: 'rgba(26, 15, 36, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(232, 116, 138, 0.2)',
      }}>
        <Image src="/logo.jpg" alt="Bonnie's Boutique" width={180} height={65} className="object-contain rounded-md" />
        <div className="flex items-center gap-4">
          <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(232, 116, 138, 0.15)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.3)' }}>
            Admin Portal
          </span>
          <Link href="/" className="text-xs px-4 py-2 rounded-full border transition-all"
            style={{ borderColor: 'rgba(245, 239, 230, 0.2)', color: 'rgba(245, 239, 230, 0.7)' }}>
            ← View Store
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Products', value: counts.all, color: '#e8748a' },
            { label: 'Published', value: counts.published, color: '#6bcb77' },
            { label: 'Drafts', value: counts.draft, color: '#f9c74f' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-5" style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.1)' }}>
              <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(245,239,230,0.5)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Add Product Form */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl p-6 sticky top-24" style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.15)' }}>
              <h2 className="text-lg font-semibold mb-5" style={{ color: '#f5efe6' }}>Add New Trinket</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.6)' }}>Photo</label>
                  <div className="relative border-2 border-dashed rounded-xl overflow-hidden h-40 flex items-center justify-center cursor-pointer"
                    style={{ borderColor: 'rgba(232,116,138,0.3)', background: 'rgba(26,15,36,0.5)' }}
                    onClick={() => document.getElementById('fileInput')?.click()}>
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl mb-2">📷</div>
                        <p className="text-xs" style={{ color: 'rgba(245,239,230,0.4)' }}>Click to upload image</p>
                      </div>
                    )}
                  </div>
                  <input id="fileInput" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.6)' }}>Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
                    style={{ background: 'rgba(26,15,36,0.7)', border: '1px solid rgba(232,116,138,0.2)', color: '#f5efe6', '--tw-ring-color': '#e8748a' } as React.CSSProperties}
                    placeholder="e.g. Paw Print Keychain" />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.6)' }}>Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                    style={{ background: 'rgba(26,15,36,0.7)', border: '1px solid rgba(232,116,138,0.2)', color: '#f5efe6' }}
                    placeholder="Describe this trinket..." />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.6)' }}>Price ($)</label>
                  <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'rgba(26,15,36,0.7)', border: '1px solid rgba(232,116,138,0.2)', color: '#f5efe6' }} />
                </div>

                <button disabled={loading} type="submit" className="btn-primary w-full py-3 rounded-xl text-sm font-semibold tracking-wide">
                  {loading ? 'Adding...' : '+ Add Product'}
                </button>
              </form>
            </div>
          </div>

          {/* Product List */}
          <div className="lg:col-span-2">
            {/* Filters & Search */}
            <div className="flex flex-wrap gap-3 mb-6">
              <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-[180px] px-4 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(61,37,82,0.5)', border: '1px solid rgba(232,116,138,0.2)', color: '#f5efe6' }} />
              {(['all', 'published', 'draft'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all"
                  style={filter === f
                    ? { background: '#e8748a', color: 'white' }
                    : { background: 'rgba(61,37,82,0.5)', color: 'rgba(245,239,230,0.6)', border: '1px solid rgba(232,116,138,0.15)' }
                  }>
                  {f} ({counts[f]})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filtered.map(p => (
                <div key={p.id} className="rounded-xl overflow-hidden group"
                  style={{ background: 'rgba(61,37,82,0.5)', border: '1px solid rgba(232,116,138,0.1)' }}>
                  <div className="relative aspect-square" style={{ background: '#2d1b3d' }}>
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-contain p-3" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🔑</div>
                    )}
                    {p.isDraft && (
                      <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: '#f9c74f', color: '#1a0f24', fontWeight: 600 }}>
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium truncate" style={{ color: '#f5efe6' }}>{p.title}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: '#e8748a' }}>${p.price?.toFixed(2)}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleToggleDraft(p)}
                        className="flex-1 text-xs py-1.5 rounded-lg transition-all"
                        style={p.isDraft
                          ? { background: 'rgba(107, 203, 119, 0.15)', color: '#6bcb77', border: '1px solid rgba(107,203,119,0.3)' }
                          : { background: 'rgba(249, 199, 79, 0.15)', color: '#f9c74f', border: '1px solid rgba(249,199,79,0.3)' }
                        }>
                        {p.isDraft ? 'Publish' : 'Unpublish'}
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="px-3 text-xs py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(232,116,138,0.1)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.2)' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full py-16 text-center" style={{ color: 'rgba(245,239,230,0.3)' }}>
                  No products found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
