'use client';

/**
 * src/components/studio/BatchQueueModal.tsx
 * Sequential Batch Auto-Generator Queue Modal (R3)
 * Allows users to queue, record, monitor, and download multiple skits sequentially.
 */

import React, { useState, useEffect } from 'react';
import { batchQueueManager, BatchQueueItem, triggerFileDownload } from '@/lib/studio/videoExporter';
import { BUILT_IN_SKITS, SkitTemplate } from '@/lib/studio/skitTemplates';

interface BatchQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBatch: (items: BatchQueueItem[]) => void;
  onAbortBatch?: () => void;
}

export function BatchQueueModal({ isOpen, onClose, onStartBatch, onAbortBatch }: BatchQueueModalProps) {
  const [queue, setQueue] = useState<BatchQueueItem[]>(batchQueueManager.getQueue());
  const [selectedSkitIds, setSelectedSkitIds] = useState<string[]>([]);
  const isProcessing = batchQueueManager.isQueueProcessing();

  const handleAbortBatch = () => {
    batchQueueManager.setProcessing(false);
    onAbortBatch?.();
  };

  useEffect(() => {
    const unsubscribe = batchQueueManager.subscribe(() => {
      setQueue(batchQueueManager.getQueue());
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedSkitIds.length === BUILT_IN_SKITS.length) {
      setSelectedSkitIds([]);
    } else {
      setSelectedSkitIds(BUILT_IN_SKITS.map((s) => s.id));
    }
  };

  const handleToggleSkit = (id: string) => {
    if (selectedSkitIds.includes(id)) {
      setSelectedSkitIds(selectedSkitIds.filter((sid) => sid !== id));
    } else {
      setSelectedSkitIds([...selectedSkitIds, id]);
    }
  };

  const handleAddSelectedToQueue = () => {
    const skitsToAdd = BUILT_IN_SKITS.filter((s) => selectedSkitIds.includes(s.id));
    batchQueueManager.addSkits(skitsToAdd);
    setSelectedSkitIds([]);
  };

  const handleAddAllSkits = () => {
    batchQueueManager.addSkits(BUILT_IN_SKITS);
  };

  const handleClear = () => {
    batchQueueManager.clearQueue();
  };

  const handleRemoveItem = (id: string) => {
    batchQueueManager.removeItem(id);
  };

  const handleStartProcessing = () => {
    const currentQueue = batchQueueManager.getQueue();
    if (currentQueue.length === 0) return;
    onStartBatch(currentQueue);
  };

  const completedCount = queue.filter((i) => i.status === 'completed').length;
  const overallProgress =
    queue.length > 0
      ? Math.round((queue.reduce((acc, curr) => acc + curr.progressPercent, 0) / (queue.length * 100)) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-rose-500/30"
        style={{
          background: 'linear-gradient(135deg, #1a0f24 0%, #2d1b3d 100%)',
          color: '#f5efe6',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎞️</span>
            <div>
              <h2 className="text-xl font-extrabold text-white">Batch Auto-Generator Queue</h2>
              <p className="text-xs text-rose-200">
                Automated multi-skit sequential rendering for TikTok, Reels &amp; Shorts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Progress Banner */}
          {queue.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/5 border border-rose-500/20 space-y-2">
              <div className="flex justify-between text-xs font-bold text-rose-200">
                <span>
                  Batch Status: {completedCount} / {queue.length} Skits Completed
                </span>
                <span>{overallProgress}%</span>
              </div>
              <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAddAllSkits}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-200 transition-all disabled:opacity-50"
            >
              + Queue All 22 Built-in Skits
            </button>
            <button
              onClick={handleClear}
              disabled={isProcessing || queue.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/20 hover:bg-white/10 text-stone-300 transition-all disabled:opacity-50"
            >
              Clear Queue
            </button>
            {isProcessing && (
              <button
                onClick={handleAbortBatch}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white border border-rose-400 shadow-md transition-all flex items-center gap-1.5 animate-pulse"
              >
                <span>⏹</span>
                <span>Abort / Cancel Batch</span>
              </button>
            )}
          </div>

          {/* Active Queue Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider">
              Queued Items ({queue.length})
            </h3>
            {queue.length === 0 ? (
              <div className="p-8 text-center text-stone-400 border border-dashed border-rose-500/20 rounded-2xl">
                No skits in queue. Select skits below or click &quot;Queue All 22 Built-in Skits&quot; to begin!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {queue.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white/5 border border-rose-500/15 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center font-bold text-rose-300 text-[10px]">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white">{item.skitTitle}</div>
                        <div className="text-[10px] text-stone-400">~{item.durationSeconds}s duration</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.status === 'recording' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse font-bold">
                          Recording ({item.progressPercent}%)
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            ✓ Ready
                          </span>
                          {item.blobUrl && (
                            <button
                              onClick={() => triggerFileDownload(item.blobUrl!, item.downloadFilename || 'skit.webm')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                            >
                              Download
                            </button>
                          )}
                        </div>
                      )}
                      {item.status === 'queued' && (
                        <span className="px-2.5 py-1 rounded-full bg-white/10 text-stone-300 font-bold">
                          Queued
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          Failed
                        </span>
                      )}

                      {!isProcessing && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-stone-400 hover:text-rose-400 text-sm px-1.5"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catalog Skit Selection Picker */}
          <div className="space-y-3 pt-4 border-t border-rose-500/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider">
                Select from 22 Available Templates
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSelectAll}
                  className="text-xs text-rose-300 hover:underline"
                >
                  {selectedSkitIds.length === BUILT_IN_SKITS.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedSkitIds.length > 0 && (
                  <button
                    onClick={handleAddSelectedToQueue}
                    className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Add Selected ({selectedSkitIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {BUILT_IN_SKITS.map((skit: SkitTemplate) => {
                const isSelected = selectedSkitIds.includes(skit.id);
                return (
                  <div
                    key={skit.id}
                    onClick={() => handleToggleSkit(skit.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-400 text-white'
                        : 'bg-white/5 border-rose-500/10 hover:bg-white/10 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="truncate">{skit.title}</span>
                      <span>{isSelected ? '☑' : '☐'}</span>
                    </div>
                    <div className="text-[10px] text-stone-400 mt-1 capitalize">
                      {skit.category.replace('_', ' ')} • {skit.durationSeconds}s
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-4 bg-black/20">
          <div className="text-xs text-stone-400">
            {isProcessing
              ? `Recording in progress (${completedCount} of ${queue.length} completed). Click "Abort / Cancel Batch" to stop.`
              : `Ready to record ${queue.length} skits into full 60fps video with burnt-in captions.`}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-bold transition-all"
            >
              Close
            </button>
            {isProcessing ? (
              <button
                onClick={handleAbortBatch}
                className="px-6 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02] bg-rose-600 hover:bg-rose-700 border border-rose-400 animate-pulse"
              >
                <span>⏹</span>
                <span>Abort / Cancel Batch</span>
              </button>
            ) : (
              <button
                onClick={handleStartProcessing}
                disabled={isProcessing || queue.length === 0}
                className="px-6 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                }}
              >
                <span>▶</span>
                <span>Start Batch Export</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
