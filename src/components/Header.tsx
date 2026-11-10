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
    { href: '/#collections', label: 'Shop' },
    { href: '/?category=Beaded%20Pens#collections', label: 'Beaded Pens' },
    { href: '/#bundles', label: 'Bundles' },
    { href: '/shipping', label: 'Shipping' },
    { href: '/contact', label: 'Contact' },
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
        {/* Top Announcement Bar */}
        <div
          className="w-full py-1.5 px-4 text-center text-[11px] sm:text-xs font-medium tracking-wide flex items-center justify-center gap-2 border-b"
          style={{
            background: 'linear-gradient(90deg, rgba(61,37,82,0.95) 0%, rgba(138,43,226,0.25) 50%, rgba(61,37,82,0.95) 100%)',
            borderColor: 'rgba(245, 158, 11, 0.2)',
            color: '#fef3c7',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-amber-300 font-semibold">
            ✨ Free US Shipping $25+ · Code <span className="underline">BONNIE10</span> for 10% Off · Handcrafted in VA ✨
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/bt_logo_sm.webp"
              alt="B&T Trinkets"
              width={80} height={80}
              className="object-contain rounded-lg w-14 h-14 sm:w-20 sm:h-20"
              priority
              unoptimized
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-xs lg:text-sm tracking-widest uppercase" style={{ color: 'rgba(245, 239, 230, 0.68)' }}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="hover:text-[#e8748a] transition-colors duration-200">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: Social Icons + Cart + Mobile Menu */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Desktop Social Brand Logo Icons */}
            <div className="hidden lg:flex items-center gap-1.5 mr-1">
              <a
                href="https://www.youtube.com/@btboutiqe"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube @btboutiqe"
                title="YouTube @btboutiqe"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: 'rgba(255,0,0,0.12)', border: '1px solid rgba(255,0,0,0.28)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                  <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/btboutiqevids/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram @btboutiqevids"
                title="Instagram @btboutiqevids"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: 'rgba(225,48,108,0.12)', border: '1px solid rgba(225,48,108,0.28)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <defs>
                    <linearGradient id="igGradHdr" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FD5949" />
                      <stop offset="50%" stopColor="#D6249F" />
                      <stop offset="100%" stopColor="#285AEB" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#igGradHdr)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@bt.boutiqe?_r=1&_t=ZT-9At4jcQOT0v"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok @bt.boutiqe"
                title="TikTok @bt.boutiqe"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: 'rgba(37,244,238,0.1)', border: '1px solid rgba(37,244,238,0.28)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#25F4EE" d="M19.29 6.39a4.83 4.83 0 0 1-3.77-4.25V1.8h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.1a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5 19.86a6.34 6.34 0 0 0 9.6-4.38v-7a8.16 8.16 0 0 0 4.69 1.52v-3.6z" />
                  <path fill="#FE2C55" d="M20.09 7.09a4.83 4.83 0 0 1-3.77-4.25V2.5h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.8a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5.8 20.56a6.34 6.34 0 0 0 9.6-4.38v-7a8.16 8.16 0 0 0 4.69 1.52v-3.6z" />
                  <path fill="#FFFFFF" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5.3 20.16a6.34 6.34 0 0 0 9.6-4.38v-7a8.16 8.16 0 0 0 4.69 1.52v-3.6z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/share/1CdJpCaKxC/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook Bonnie Boutiqe"
                title="Facebook Bonnie Boutiqe"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: 'rgba(24,119,242,0.12)', border: '1px solid rgba(24,119,242,0.28)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>

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
            maxHeight: mobileMenuOpen ? '480px' : '0',
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
            <div className="flex items-center gap-3 pt-4 pb-1">
              <a
                href="https://www.youtube.com/@btboutiqe"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube @btboutiqe"
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                  <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/btboutiqevids/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram @btboutiqevids"
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(225,48,108,0.15)', border: '1px solid rgba(225,48,108,0.3)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#E1306C" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@bt.boutiqe?_r=1&_t=ZT-9At4jcQOT0v"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok @bt.boutiqe"
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(37,244,238,0.12)', border: '1px solid rgba(37,244,238,0.3)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#25F4EE" d="M19.29 6.39a4.83 4.83 0 0 1-3.77-4.25V1.8h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.1a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5 19.86a6.34 6.34 0 0 0 9.6-4.38v-7a8.16 8.16 0 0 0 4.69 1.52v-3.6z" />
                  <path fill="#FE2C55" d="M20.09 7.09a4.83 4.83 0 0 1-3.77-4.25V2.5h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.8a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5.8 20.56a6.34 6.34 0 0 0 9.6-4.38v-7a8.16 8.16 0 0 0 4.69 1.52v-3.6z" />
                  <path fill="#FFFFFF" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5.3 20.16a6.34 6.34 0 0 0 9.6-4.38v-7a8.16 8.16 0 0 0 4.69 1.52v-3.6z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/share/1CdJpCaKxC/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook Bonnie Boutiqe"
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(24,119,242,0.15)', border: '1px solid rgba(24,119,242,0.3)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
