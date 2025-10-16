/**
 * Glass Mode - Advanced Screen Context Capture System
 * 
 * Features:
 * - Dual-stream encoding: overview (1024w @ 0.5-1 FPS) + ROI around cursor (640×640 @ 3-5 FPS)
 * - Cursor position tracking with viewport context
 * - Privacy tools: blur brush, hide rectangles
 * - Text selection sharing
 * - Optimized encoding with throttling (~1-1.5 Mbps)
 */

// Privacy mask types
export interface BlurMask {
  type: 'blur';
  x: number;
  y: number;
  radius: number;
}

export interface HideRect {
  type: 'hide';
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PrivacyMask = BlurMask | HideRect;

// Screen context data
export interface ScreenContext {
  cursorX: number;
  cursorY: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
  timestamp: number;
}

// Glass Mode configuration
export interface GlassModeConfig {
  overviewFps: number;
  roiFps: number;
  overviewQuality: number;
  roiQuality: number;
  overviewMaxWidth: number;
  roiSize: number;
  throttleMbps: number;
}

const DEFAULT_CONFIG: GlassModeConfig = {
  overviewFps: 0.75, // 0.5-1 FPS
  roiFps: 4, // 3-5 FPS
  overviewQuality: 0.6,
  roiQuality: 0.75,
  overviewMaxWidth: 1024,
  roiSize: 640,
  throttleMbps: 1.25, // ~1-1.5 Mbps
};

/**
 * Glass Mode Manager - Handles screen capture, encoding, and privacy
 */
export class GlassModeManager {
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private videoElement: HTMLVideoElement | null = null;
  
  private config: GlassModeConfig = DEFAULT_CONFIG;
  private privacyMasks: PrivacyMask[] = [];
  
  private overviewInterval: number | null = null;
  private roiInterval: number | null = null;
  private contextInterval: number | null = null;
  
  private cursorPosition = { x: 0, y: 0 };
  private lastOverviewTime = 0;
  private lastRoiTime = 0;
  private bytesThisSecond = 0;
  private lastThrottleReset = Date.now();
  
  private onOverviewFrame?: (data: string) => void;
  private onRoiFrame?: (data: string) => void;
  private onContextUpdate?: (context: ScreenContext) => void;
  private onTextSnippet?: (text: string) => void;
  private onAudioStateChange?: (enabled: boolean) => void;
  
  constructor(config?: Partial<GlassModeConfig>) {
    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }
    
    // Track mouse position
    if (typeof window !== 'undefined') {
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('selectionchange', this.handleSelectionChange);
    }
  }
  
  private handleMouseMove = (e: MouseEvent) => {
    this.cursorPosition = { x: e.clientX, y: e.clientY };
  };
  
  private handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 10) {
      // Show "Share with AI?" prompt for substantial selections
      this.showTextSelectionPrompt(selection.toString());
    }
  };
  
  private showTextSelectionPrompt(text: string) {
    // Simple confirmation for text sharing
    const share = window.confirm('Share selection with AI?');
    if (share && this.onTextSnippet) {
      this.onTextSnippet(text);
    }
  }
  
  /**
   * Start Glass Mode capture
   */
  async start(callbacks: {
    onOverviewFrame?: (data: string) => void;
    onRoiFrame?: (data: string) => void;
    onContextUpdate?: (context: ScreenContext) => void;
    onTextSnippet?: (text: string) => void;
    onAudioStateChange?: (enabled: boolean) => void;
  }) {
    this.onOverviewFrame = callbacks.onOverviewFrame;
    this.onRoiFrame = callbacks.onRoiFrame;
    this.onContextUpdate = callbacks.onContextUpdate;
    this.onTextSnippet = callbacks.onTextSnippet;
    this.onAudioStateChange = callbacks.onAudioStateChange;
    
    try {
      // Capture screen with audio
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } as any, // cursor: 'always' is supported but not in TypeScript types yet
        audio: true,
      } as any);
      
      // Separate video and audio tracks
      this.videoTrack = this.stream.getVideoTracks()[0];
      this.audioTrack = this.stream.getAudioTracks()[0];
      
      // Create video element for capture
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = new MediaStream([this.videoTrack]);
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      
      await this.videoElement.play();
      
      // Notify about audio availability
      if (this.audioTrack && this.onAudioStateChange) {
        this.onAudioStateChange(true);
      }
      
      // Start encoding loops
      this.startOverviewEncoding();
      this.startRoiEncoding();
      this.startContextEmission();
      
      // Handle stream end
      this.videoTrack.addEventListener('ended', () => {
        this.stop();
      });
      
      console.log('🪟 Glass Mode started');
      return true;
    } catch (error) {
      console.error('❌ Glass Mode start failed:', error);
      throw error;
    }
  }
  
  /**
   * Stop Glass Mode capture
   */
  stop() {
    // Clear intervals
    if (this.overviewInterval) clearInterval(this.overviewInterval);
    if (this.roiInterval) clearInterval(this.roiInterval);
    if (this.contextInterval) clearInterval(this.contextInterval);
    
    // Stop tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    
    this.stream = null;
    this.videoTrack = null;
    this.audioTrack = null;
    this.videoElement = null;
    
    if (this.onAudioStateChange) {
      this.onAudioStateChange(false);
    }
    
    console.log('🪟 Glass Mode stopped');
  }
  
  /**
   * Set screen audio enabled/disabled (mute control)
   */
  setScreenAudioEnabled(enabled: boolean) {
    if (this.audioTrack) {
      this.audioTrack.enabled = enabled;
      console.log(`🔇 Screen audio ${enabled ? 'unmuted' : 'muted'}`);
    }
  }
  
  /**
   * Check if audio track is available
   */
  hasAudioTrack(): boolean {
    return this.audioTrack !== null;
  }
  
  /**
   * Start overview encoding loop (0.5-1 FPS)
   */
  private startOverviewEncoding() {
    const intervalMs = 1000 / this.config.overviewFps;
    
    this.overviewInterval = window.setInterval(async () => {
      if (!this.videoElement || !this.onOverviewFrame) return;
      
      const now = Date.now();
      if (now - this.lastOverviewTime < intervalMs) return;
      
      try {
        const encoded = await this.encodeFrame(
          this.videoElement,
          this.config.overviewMaxWidth,
          this.config.overviewQuality,
          false
        );
        
        if (this.checkThrottle(encoded.length)) {
          this.onOverviewFrame(encoded);
          this.lastOverviewTime = now;
        }
      } catch (error) {
        console.error('Overview encoding error:', error);
      }
    }, intervalMs);
  }
  
  /**
   * Start ROI encoding loop (3-5 FPS)
   */
  private startRoiEncoding() {
    const intervalMs = 1000 / this.config.roiFps;
    
    this.roiInterval = window.setInterval(async () => {
      if (!this.videoElement || !this.onRoiFrame) return;
      
      const now = Date.now();
      if (now - this.lastRoiTime < intervalMs) return;
      
      try {
        const encoded = await this.encodeFrame(
          this.videoElement,
          this.config.roiSize,
          this.config.roiQuality,
          true
        );
        
        // ROI has priority if encoder busy
        if (this.checkThrottle(encoded.length, true)) {
          this.onRoiFrame(encoded);
          this.lastRoiTime = now;
        }
      } catch (error) {
        console.error('ROI encoding error:', error);
      }
    }, intervalMs);
  }
  
  /**
   * Start context emission loop (~10 Hz)
   */
  private startContextEmission() {
    this.contextInterval = window.setInterval(() => {
      if (!this.onContextUpdate) return;
      
      const context: ScreenContext = {
        cursorX: this.cursorPosition.x,
        cursorY: this.cursorPosition.y,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        zoom: window.devicePixelRatio,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        timestamp: Date.now(),
      };
      
      this.onContextUpdate(context);
    }, 100); // ~10 Hz
  }
  
  /**
   * Encode a video frame with privacy masking
   */
  private async encodeFrame(
    video: HTMLVideoElement,
    maxSize: number,
    quality: number,
    isRoi: boolean
  ): Promise<string> {
    // Use OffscreenCanvas if available for better performance
    const useOffscreen = typeof OffscreenCanvas !== 'undefined';
    
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (useOffscreen) {
      canvas = new OffscreenCanvas(maxSize, maxSize);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = maxSize;
      canvas.height = maxSize;
    }
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Calculate dimensions
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    
    if (isRoi) {
      // Extract ROI around cursor
      const scale = video.videoWidth / window.innerWidth;
      const centerX = this.cursorPosition.x * scale;
      const centerY = this.cursorPosition.y * scale;
      const roiSize = this.config.roiSize * scale;
      
      sourceX = Math.max(0, centerX - roiSize / 2);
      sourceY = Math.max(0, centerY - roiSize / 2);
      sourceWidth = Math.min(roiSize, video.videoWidth - sourceX);
      sourceHeight = Math.min(roiSize, video.videoHeight - sourceY);
    }
    
    // Scale to fit canvas
    const aspect = sourceWidth / sourceHeight;
    let destWidth = maxSize;
    let destHeight = maxSize / aspect;
    
    if (destHeight > maxSize) {
      destHeight = maxSize;
      destWidth = maxSize * aspect;
    }
    
    // Draw frame
    ctx.drawImage(
      video,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, destWidth, destHeight
    );
    
    // Apply privacy masks
    this.applyPrivacyMasks(ctx as CanvasRenderingContext2D, destWidth, destHeight);
    
    // Encode to base64 (prefer WebP, fallback JPEG)
    let dataUrl: string;
    if (useOffscreen) {
      const blob = await (canvas as OffscreenCanvas).convertToBlob({
        type: 'image/webp',
        quality
      }).catch(() => (canvas as OffscreenCanvas).convertToBlob({
        type: 'image/jpeg',
        quality
      }));
      
      dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } else {
      try {
        dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/webp', quality);
      } catch {
        dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/jpeg', quality);
      }
    }
    
    // Return base64 without data URL prefix
    return dataUrl.split(',')[1];
  }
  
  /**
   * Apply privacy masks to canvas
   */
  private applyPrivacyMasks(ctx: CanvasRenderingContext2D, width: number, height: number) {
    for (const mask of this.privacyMasks) {
      if (mask.type === 'blur') {
        // Blur effect (simplified - in production use proper blur)
        ctx.filter = 'blur(20px)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(mask.x, mask.y, mask.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none';
      } else if (mask.type === 'hide') {
        // Black rectangle
        ctx.fillStyle = '#000';
        ctx.fillRect(mask.x, mask.y, mask.width, mask.height);
      }
    }
  }
  
  /**
   * Check bandwidth throttle
   */
  private checkThrottle(bytes: number, isPriority: boolean = false): boolean {
    const now = Date.now();
    
    // Reset counter every second
    if (now - this.lastThrottleReset >= 1000) {
      this.bytesThisSecond = 0;
      this.lastThrottleReset = now;
    }
    
    const bytesPerSecond = (this.config.throttleMbps * 1024 * 1024) / 8;
    
    // Priority frames (ROI) can exceed slightly
    const limit = isPriority ? bytesPerSecond * 1.2 : bytesPerSecond;
    
    if (this.bytesThisSecond + bytes <= limit) {
      this.bytesThisSecond += bytes;
      return true;
    }
    
    return false;
  }
  
  /**
   * Add privacy mask
   */
  addPrivacyMask(mask: PrivacyMask) {
    this.privacyMasks.push(mask);
  }
  
  /**
   * Clear all privacy masks
   */
  clearPrivacyMasks() {
    this.privacyMasks = [];
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    if (typeof window !== 'undefined') {
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('selectionchange', this.handleSelectionChange);
    }
  }
}
