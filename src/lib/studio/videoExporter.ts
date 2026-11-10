/**
 * src/lib/studio/videoExporter.ts
 * 1-Click Video Exporter & Sequential Batch Auto-Generator Queue (R3)
 * Combines canvas.captureStream(60) with Web Audio API MediaStreamAudioDestinationNode
 * via MediaRecorder to produce synchronized, downloadable .webm/.mp4 video files with burnt-in captions.
 */

import { getAudioDestinationNode } from './audioSynth';
import { SkitTemplate } from './skitTemplates';

export interface VideoExportOptions {
  fps?: number; // default 60
  bitrate?: number; // default 6_000_000 (6 Mbps)
  filename?: string;
}

export interface BatchQueueItem {
  id: string;
  skitId: string;
  skitTitle: string;
  durationSeconds: number;
  status: 'queued' | 'recording' | 'completed' | 'error';
  progressPercent: number;
  blobUrl?: string;
  downloadFilename?: string;
  error?: string;
}

export function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'video/webm';
  }

  const preferredTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

export class VideoRecorderSession {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecordingActive = false;
  private progressTimerId: ReturnType<typeof setInterval> | null = null;

  public async recordCanvasStream(
    canvas: HTMLCanvasElement,
    durationSeconds: number,
    options: VideoExportOptions = {},
    onProgress?: (progressPercent: number) => void
  ): Promise<{ blob: Blob; url: string; filename: string }> {
    if (this.isRecordingActive) {
      throw new Error('A recording session is already active');
    }

    this.isRecordingActive = true;
    this.recordedChunks = [];

    const fps = options.fps || 60;
    const bitrate = options.bitrate || 6_000_000;
    const mimeType = getSupportedMimeType();
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const filename = options.filename || `bonnie-tammy-skit-${Date.now()}.${extension}`;

    // 1. Capture 60fps video track from canvas
    const canvasStream = canvas.captureStream ? canvas.captureStream(fps) : (canvas as unknown as { mozCaptureStream: (f: number) => MediaStream }).mozCaptureStream(fps);

    // 2. Mix Web Audio API recording stream
    const audioDestination = getAudioDestinationNode();
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    if (audioDestination && audioDestination.stream.getAudioTracks().length > 0) {
      combinedTracks.push(...audioDestination.stream.getAudioTracks());
    }

    const mixedStream = new MediaStream(combinedTracks);

    return new Promise((resolve, reject) => {
      try {
        const recorder = new MediaRecorder(mixedStream, {
          mimeType,
          videoBitsPerSecond: bitrate,
        });
        this.mediaRecorder = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        recorder.onerror = (event) => {
          this.cleanup();
          reject(new Error(`MediaRecorder error: ${String(event)}`));
        };

        recorder.onstop = () => {
          this.cleanup();
          const finalBlob = new Blob(this.recordedChunks, { type: mimeType });
          const blobUrl = URL.createObjectURL(finalBlob);
          resolve({ blob: finalBlob, url: blobUrl, filename });
        };

        recorder.start(250); // request slice every 250ms

        // Progress Tracking
        const startTime = Date.now();
        const totalDurationMs = durationSeconds * 1000;

        this.progressTimerId = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const percent = Math.min(100, Math.floor((elapsed / totalDurationMs) * 100));
          if (onProgress) {
            onProgress(percent);
          }

          if (elapsed >= totalDurationMs) {
            this.stop();
          }
        }, 100);
      } catch (err: unknown) {
        this.cleanup();
        reject(err);
      }
    });
  }

  public stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
  }

  private cleanup(): void {
    this.isRecordingActive = false;
    if (this.progressTimerId) {
      clearInterval(this.progressTimerId);
      this.progressTimerId = null;
    }
    this.mediaRecorder = null;
  }
}

/**
 * 1-Click Browser Download Trigger
 */
export function triggerFileDownload(blobUrl: string, filename: string): void {
  if (typeof window === 'undefined') return;

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}

/**
 * Batch Auto-Generator Queue State Manager
 */
export class BatchQueueManager {
  private queue: BatchQueueItem[] = [];
  private isProcessing = false;
  private currentItemIndex = -1;
  private listeners: Array<() => void> = [];

  public getQueue(): BatchQueueItem[] {
    return [...this.queue];
  }

  public addSkits(skits: SkitTemplate[]): void {
    skits.forEach((skit) => {
      this.queue.push({
        id: `batch_${skit.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        skitId: skit.id,
        skitTitle: skit.title,
        durationSeconds: skit.durationSeconds,
        status: 'queued',
        progressPercent: 0,
        downloadFilename: `${skit.id}.webm`,
      });
    });
    this.notify();
  }

  public removeItem(itemId: string): void {
    this.queue = this.queue.filter((item) => item.id !== itemId);
    this.notify();
  }

  public clearQueue(): void {
    this.queue = [];
    this.currentItemIndex = -1;
    this.isProcessing = false;
    this.notify();
  }

  public updateItem(itemId: string, patch: Partial<BatchQueueItem>): void {
    this.queue = this.queue.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    this.notify();
  }

  public isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  public setProcessing(processing: boolean): void {
    this.isProcessing = processing;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const batchQueueManager = new BatchQueueManager();
