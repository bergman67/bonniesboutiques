'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import SingleAutoMagicCard from './SingleAutoMagicCard';
import BatchUploadQueue from './BatchUploadQueue';
import {
  MagicQueueItem,
  createMagicQueueItem,
  processAutoMagicPhoto,
  regenerateTitle,
  publishProductToStore,
  BatchConcurrencyQueue,
} from '../utils/autoMagicPipeline';

export interface AutoMagicProductUploaderProps {
  onProductPublished?: () => void | Promise<void>;
  adminPin?: string;
  className?: string;
}

export default function AutoMagicProductUploader({
  onProductPublished,
  adminPin,
  className = '',
}: AutoMagicProductUploaderProps) {
  const [items, setItems] = useState<MagicQueueItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPublishingAll, setIsPublishingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<BatchConcurrencyQueue>(new BatchConcurrencyQueue(2));

  // Warn if leaving the page while an uploaded photo has not yet been published to the live store
  const hasUnpublishedWork = items.some(
    (i) =>
      i.status === 'pending' ||
      i.status === 'isolating' ||
      i.status === 'naming' ||
      i.status === 'ready' ||
      i.status === 'publishing'
  );

  useEffect(() => {
    if (!hasUnpublishedWork) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnpublishedWork]);

  // Helper to update a specific item in state
  const updateItem = useCallback((id: string, updates: Partial<MagicQueueItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  // Worker for an individual queue item
  const processItemWorker = useCallback(
    async (itemToProcess: MagicQueueItem) => {
      try {
        await processAutoMagicPhoto(
          itemToProcess.file,
          (progressUpdates) => {
            updateItem(itemToProcess.id, progressUpdates);
          },
          itemToProcess.suggestedTitlesHistory,
          adminPin
        );
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : 'Processing failed. Please retry.';
        updateItem(itemToProcess.id, {
          status: 'error',
          errorMessage: errorMsg,
          stepProgress: 0,
        });
      }
    },
    [updateItem, adminPin]
  );

  // Enqueue new files
  const handleEnqueueFiles = useCallback(
    (fileList: FileList | File[]) => {
      const filesArray = Array.from(fileList).filter((f) =>
        f.type.startsWith('image/')
      );
      if (filesArray.length === 0) return;

      const newItems: MagicQueueItem[] = filesArray.map((file) =>
        createMagicQueueItem(file)
      );

      setItems((prev) => [...prev, ...newItems]);

      // Schedule each file in the concurrency queue (concurrency = 2)
      for (const item of newItems) {
        queueRef.current.add(async () => {
          await processItemWorker(item);
        });
      }
    },
    [processItemWorker]
  );

  // File input change handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleEnqueueFiles(e.target.files);
      // Reset input value so same files can be re-selected if needed
      e.target.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleEnqueueFiles(e.dataTransfer.files);
    }
  };

  // Regenerate Name handler with exclusion history
  const handleRegenerateName = useCallback(
    async (id: string) => {
      const currentItem = items.find((i) => i.id === id);
      if (!currentItem || !currentItem.transparentUrl) return;

      updateItem(id, { isRegeneratingName: true });

      try {
        const history = [
          ...currentItem.suggestedTitlesHistory,
          currentItem.title,
        ].filter(Boolean);

        const result = await regenerateTitle(currentItem.transparentUrl, history, adminPin);

        updateItem(id, {
          title: result.title,
          description: result.description,
          category: result.category || currentItem.category,
          suggestedTitlesHistory: [...history, result.title],
          isRegeneratingName: false,
        });
      } catch (err: unknown) {
        console.error('Failed to regenerate title:', err);
        updateItem(id, { isRegeneratingName: false });
      }
    },
    [items, updateItem, adminPin]
  );

  // Publish single item handler
  const handlePublishItem = useCallback(
    async (id: string) => {
      const currentItem = items.find((i) => i.id === id);
      if (!currentItem || !currentItem.transparentUrl) return;

      updateItem(id, { status: 'publishing' });

      try {
        const result = await publishProductToStore(currentItem, adminPin);
        if (result.success) {
          updateItem(id, {
            status: 'published',
            publishedProductId: result.id,
            stepProgress: 100,
          });
          if (onProductPublished) {
            await onProductPublished();
          }
        } else {
          updateItem(id, {
            status: 'error',
            errorMessage: result.error || 'Publish failed',
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Publish failed';
        updateItem(id, {
          status: 'error',
          errorMessage: msg,
        });
      }
    },
    [items, adminPin, onProductPublished, updateItem]
  );

  // Publish all ready items handler
  const handlePublishAll = useCallback(async () => {
    const readyItems = items.filter((i) => i.status === 'ready');
    if (readyItems.length === 0) return;

    setIsPublishingAll(true);

    try {
      for (const item of readyItems) {
        updateItem(item.id, { status: 'publishing' });
        try {
          const res = await publishProductToStore(item, adminPin);
          if (res.success) {
            updateItem(item.id, {
              status: 'published',
              publishedProductId: res.id,
              stepProgress: 100,
            });
          } else {
            updateItem(item.id, {
              status: 'error',
              errorMessage: res.error || 'Failed to publish',
            });
          }
        } catch (itemErr: unknown) {
          const msg = itemErr instanceof Error ? itemErr.message : 'Failed to publish';
          updateItem(item.id, {
            status: 'error',
            errorMessage: msg,
          });
        }
      }

      if (onProductPublished) {
        await onProductPublished();
      }
    } finally {
      setIsPublishingAll(false);
    }
  }, [items, adminPin, onProductPublished, updateItem]);

  // Delete item handler
  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // Clear all handler
  const handleClearAll = useCallback(() => {
    queueRef.current.clear();
    setItems([]);
  }, []);

  // Trigger file dialog
  const triggerFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hidden Multi-File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* When no items in queue: Big Grandma-Friendly Dropzone */}
      {items.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileDialog}
          className={`rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center border-3 border-dashed ${
            isDragOver
              ? 'border-rose-300 scale-[1.02] shadow-rose-500/20'
              : 'hover:border-rose-400 hover:scale-[1.005]'
          }`}
          style={{
            background: isDragOver
              ? 'rgba(78, 43, 105, 0.95)'
              : 'rgba(61, 37, 82, 0.75)',
            borderColor: isDragOver ? '#f472b6' : 'rgba(232, 116, 138, 0.45)',
            minHeight: '340px',
          }}
        >
          {/* Animated decorative sparkle background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background:
                'radial-gradient(circle at center, rgba(232, 116, 138, 0.4) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 max-w-md space-y-4">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/25 border-2 border-rose-400/50 flex items-center justify-center text-4xl shadow-inner transform transition-transform group-hover:scale-110">
              {isDragOver ? '📥' : '📷'}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                {isDragOver ? 'Drop Your Photos Here!' : 'Tap or Drop Trinket Photos'}
              </h3>
              <p className="text-sm sm:text-base font-semibold text-rose-200/90 leading-relaxed">
                Select <strong>1 photo</strong> or a <strong>whole batch</strong> from your phone or computer.
              </p>
              <p className="text-xs sm:text-sm text-amber-200/90 font-medium">
                ✨ Backgrounds removed &amp; creative descriptions written automatically!
              </p>
            </div>

            {/* Grandma-friendly big choose button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileDialog();
                }}
                className="min-h-[52px] px-8 py-3.5 rounded-2xl text-base font-black text-white tracking-wide transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                  boxShadow: '0 8px 25px rgba(232, 116, 138, 0.45)',
                  border: '1.5px solid rgba(255, 255, 255, 0.35)',
                }}
              >
                Choose Photos from Computer / Phone ↗
              </button>
            </div>

            <p className="text-xs text-rose-300/70 font-medium">
              Accepts JPEG, PNG, WebP · No typing required
            </p>
          </div>
        </div>
      ) : items.length === 1 ? (
        /* Single Auto-Magic View */
        <SingleAutoMagicCard
          item={items[0]}
          onUpdateItem={(updates) => updateItem(items[0].id, updates)}
          onPublish={(item) => handlePublishItem(item.id)}
          onCancel={handleClearAll}
          onRegenerateName={(item) => handleRegenerateName(item.id)}
        />
      ) : (
        /* Batch Upload Queue View */
        <BatchUploadQueue
          items={items}
          onUpdateItem={updateItem}
          onPublishItem={handlePublishItem}
          onPublishAll={handlePublishAll}
          onDeleteItem={handleDeleteItem}
          onRegenerateName={handleRegenerateName}
          onAddMoreFiles={triggerFileDialog}
          onClearAll={handleClearAll}
          isPublishingAll={isPublishingAll}
        />
      )}
    </div>
  );
}
