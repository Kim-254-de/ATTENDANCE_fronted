/// <reference types="vite/client" />

declare module 'qr-scanner' {
  export interface QRScanResult {
    data: string
  }

  export interface QRScanRegion {
    x: number
    y: number
    width: number
    height: number
    downScaledWidth?: number
    downScaledHeight?: number
  }

  export interface QRScannerOptions {
    preferredCamera?: string
    highlightScanRegion?: boolean
    highlightCodeOutline?: boolean
    maxScansPerSecond?: number
    calculateScanRegion?: (video: HTMLVideoElement) => QRScanRegion
  }

  export default class QrScanner {
    constructor(video: HTMLVideoElement, onDecode: (result: QRScanResult) => void, options?: QRScannerOptions)
    static hasCamera(): Promise<boolean>
    start(): Promise<void>
    stop(): Promise<void>
    destroy(): void
  }
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_USE_MOCKS?: 'true' | 'data' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
