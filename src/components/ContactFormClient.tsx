'use client';

import { useState } from 'react';
import { trackCommerceEvent } from '@/lib/analytics';

export default function ContactFormClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Custom Teacher / Nurse Gift Pack');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          topic,
          message,
          source: 'contact-page',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Please check your email and try again.');
      } else {
        setSubmitted(true);
        trackCommerceEvent('Lead', { source: 'contact_form', topic });
      }
    } catch {
      setError('Unable to send message right now — please email bonnielong106@yahoo.com directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const mailtoHref = `mailto:bonnielong106@yahoo.com?subject=${encodeURIComponent(
    `[Bonnie's Boutique] ${topic} — ${name || 'Customer Inquiry'}`
  )}&body=${encodeURIComponent(
    `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`
  )}`;

  if (submitted) {
    return (
      <div
        className="rounded-2xl p-6 sm:p-8 text-center space-y-4"
        style={{
          background: 'rgba(61, 37, 82, 0.45)',
          border: '1px solid rgba(107, 203, 119, 0.4)',
        }}
      >
        <div className="text-4xl">💌</div>
        <h2
          className="text-xl font-serif font-bold text-[#f5efe6]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Thank You, {name || 'Friend'}!
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.8)' }}>
          Your message has been logged for Bonnie &amp; Tammy! We reply within 24 hours from our Clearbrook, VA workshop. For urgent custom deadlines, you can also send directly via your email app below:
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <a
            href={mailtoHref}
            className="px-5 py-2.5 rounded-full text-xs font-semibold"
            style={{
              background: 'linear-gradient(135deg, #e8748a, #c44b63)',
              color: 'white',
            }}
          >
            ✉️ Open Direct Email to Bonnie
          </a>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setMessage('');
            }}
            className="px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer"
            style={{
              background: 'rgba(26, 15, 36, 0.7)',
              color: 'rgba(245, 239, 230, 0.75)',
              border: '1px solid rgba(232, 116, 138, 0.25)',
            }}
          >
            Send Another Note
          </button>
        </div>
      </div>
    );
  }

  const inputStyle = {
    background: 'rgba(26, 15, 36, 0.75)',
    border: '1px solid rgba(232, 116, 138, 0.24)',
    color: '#f5efe6',
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-6 sm:p-8 space-y-4"
      style={{
        background: 'rgba(61, 37, 82, 0.42)',
        border: '1px solid rgba(232, 116, 138, 0.2)',
      }}
    >
      <h2
        className="text-xl font-serif font-bold text-[#f5efe6]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Send Bonnie &amp; Tammy a Note
      </h2>
      <p className="text-xs" style={{ color: 'rgba(245, 239, 230, 0.65)' }}>
        Ask about an order, request a custom teacher/nurse pen bundle, or arrange local Frederick County / Winchester, VA pickup.
      </p>

      {error && (
        <div
          className="rounded-xl p-3 text-xs"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
            Your Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sarah Jenkins"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
            Your Email *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sarah@example.com"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
          How Can We Help?
        </label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={inputStyle}
        >
          <option value="Custom Teacher / Nurse Gift Pack">Custom Teacher / Nurse Beaded Pen Pack</option>
          <option value="Order Status or Shipping Question">Order Status or Shipping Question</option>
          <option value="Local Clearbrook / Winchester VA Pickup">Local Clearbrook / Winchester, VA Pickup</option>
          <option value="Return or Transit Replacement Help">14-Day Return or Transit Replacement Help</option>
          <option value="General Boutique Question">General Boutique Question</option>
        </select>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
          Message *
        </label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what colors, themes, or gift quantities you're looking for..."
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-y"
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all cursor-pointer disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #e8748a, #c44b63)',
          color: 'white',
          boxShadow: '0 4px 15px rgba(232, 116, 138, 0.3)',
        }}
      >
        {submitting ? 'Sending...' : 'Send Message to Bonnie & Tammy →'}
      </button>
    </form>
  );
}
