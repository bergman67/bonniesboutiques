'use client';

import React from 'react';
import { PrintableOrder, StoreReturnAddress, batchPrintWaitingOrders } from '../utils/batchPrintPackingSlips';

interface BonniesDailyActionCenterProps {
  orders: PrintableOrder[];
  returnAddress: StoreReturnAddress;
  onOrdersPrinted: (orderIds: string[]) => Promise<void> | void;
  onJumpToOrders: () => void;
}

export default function BonniesDailyActionCenter({
  orders,
  returnAddress,
  onOrdersPrinted,
  onJumpToOrders,
}: BonniesDailyActionCenterProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Filter unprinted and non-cancelled orders
  const waitingOrders = orders.filter(
    (o) => !o.labelPrinted && o.paymentStatus !== 'cancelled'
  );

  const count = waitingOrders.length;

  if (count === 0) {
    return null;
  }

  const handlePrintAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await batchPrintWaitingOrders(waitingOrders, returnAddress, onOrdersPrinted);
    } finally {
      setIsProcessing(false);
    }
  };

  const bannerTitle = `👵 Bonnie's Daily Action Center — ${count} Order${count !== 1 ? 's' : ''} Waiting to Box & Ship!`;

  return (
    <section
      aria-label="Daily Action Center"
      className="mb-8 rounded-2xl p-6 shadow-2xl transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(6, 95, 70, 0.35), rgba(56, 189, 248, 0.2))',
        border: '2px solid #10b981',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.25)',
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Prominent Headline & Instruction */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl" role="img" aria-label="Grandma">
              👵
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {bannerTitle}
            </h2>
          </div>
          <p className="text-sm sm:text-base font-medium leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.95)' }}>
            Good morning Bonnie! You have <strong className="text-emerald-300 font-bold underline">{count} unprinted order{count !== 1 ? 's' : ''}</strong> ready to box and ship. 
            Tap the big green button to print all packing slips and open USPS labels in 1 click!
          </p>
        </div>

        {/* Right: Huge 1-Click Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
          {/* Huge 1-Click Batch Print Button (52px high, 16px bold) */}
          <button
            type="button"
            onClick={handlePrintAll}
            disabled={isProcessing}
            className="min-h-[52px] h-[52px] px-6 rounded-xl text-base font-bold flex items-center justify-center gap-2.5 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <span className="text-xl">🖨️</span>
            <span>
              {isProcessing
                ? 'Preparing Batch Slips...'
                : `Print All Waiting Shipping Labels & Packing Slips (${count})`}
            </span>
          </button>

          {/* 1-Click Jump to Customer Orders Button */}
          <button
            type="button"
            onClick={onJumpToOrders}
            className="min-h-[52px] h-[52px] px-5 rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              background: 'rgba(26, 15, 36, 0.85)',
              color: '#38bdf8',
              border: '2px solid rgba(56, 189, 248, 0.6)',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.2)',
            }}
          >
            <span className="text-lg">📦</span>
            <span>Jump to Customer Orders ({count})</span>
          </button>
        </div>
      </div>
    </section>
  );
}
