'use client';

import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Header() {
  const { totalItems, toggleCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Shop' },
    { href: '/#collections', label: 'Collections' },
    { href: '/#about', label: 'About' },
  ];

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(26, 15, 36, 0.97)' : 'rgba(26, 15, 36, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(232, 116, 138, 0.15)',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/bt_logo.jpg"
              alt="B&T Trinkets"
              width={180}
              height={65}
              className="object-contain rounded-lg"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm tracking-widest uppercase" style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="hover:text-[#e8748a] transition-colors duration-200">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: Cart + Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <button
              onClick={toggleCart}
              className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200"
              style={{ background: 'rgba(232,116,138,0.1)', border: '1px solid rgba(232,116,138,0.25)', color: '#e8748a' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span className="hidden sm:inline text-sm font-semibold">Cart</span>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: '#e8748a', color: 'white', fontSize: '10px' }}
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col gap-1.5 w-9 h-9 items-center justify-center rounded-full"
              style={{ background: 'rgba(61,37,82,0.5)' }}
              aria-label="Toggle menu"
            >
              <span className="block w-5 h-0.5 transition-all duration-300"
                style={{ background: '#f5efe6', transform: mobileMenuOpen ? 'rotate(45deg) translateY(8px)' : 'none' }} />
              <span className="block w-5 h-0.5 transition-all duration-300"
                style={{ background: '#f5efe6', opacity: mobileMenuOpen ? 0 : 1 }} />
              <span className="block w-5 h-0.5 transition-all duration-300"
                style={{ background: '#f5efe6', transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-8px)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className="md:hidden overflow-hidden transition-all duration-300"
          style={{
            maxHeight: mobileMenuOpen ? '300px' : '0',
            borderTop: mobileMenuOpen ? '1px solid rgba(232,116,138,0.1)' : 'none',
          }}
        >
          <nav className="flex flex-col px-6 py-4 gap-1" style={{ background: 'rgba(26,15,36,0.98)' }}>
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm tracking-widest uppercase border-b transition-colors duration-200"
                style={{ color: 'rgba(245,239,230,0.7)', borderColor: 'rgba(232,116,138,0.08)' }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
