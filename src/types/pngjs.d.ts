declare module 'pngjs' {
  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    constructor(options?: { width?: number; height?: number });
    static sync: {
      read(buffer: Buffer): { width: number; height: number; data: Buffer };
      write(png: PNG): Buffer;
    };
  }
}
