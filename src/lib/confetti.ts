// Confetti Animation System for Wallet Success Events
import { notify } from '@/lib/i18n-toast';

export interface ConfettiConfig {
  particleCount?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  ticks?: number;
  colors?: string[];
  shapes?: ('square' | 'circle')[];
  scalar?: number;
}

export interface SuccessEvent {
  type: 'balance_update' | 'reward_earned' | 'transaction_complete' | 'subscription_activated';
  amount?: number;
  currency?: string;
  message?: string;
  confettiConfig?: ConfettiConfig;
}

// Default confetti configurations for different events
const defaultConfigs: Record<SuccessEvent['type'], ConfettiConfig> = {
  balance_update: {
    particleCount: 100,
    spread: 70,
    colors: ['#10B981', '#059669', '#047857'],
    shapes: ['circle'],
    scalar: 1.2
  },
  reward_earned: {
    particleCount: 150,
    spread: 90,
    colors: ['#8B5CF6', '#7C3AED', '#6D28D9'],
    shapes: ['square', 'circle'],
    scalar: 1.5
  },
  transaction_complete: {
    particleCount: 80,
    spread: 60,
    colors: ['#3B82F6', '#2563EB', '#1D4ED8'],
    shapes: ['circle'],
    scalar: 1.0
  },
  subscription_activated: {
    particleCount: 120,
    spread: 80,
    colors: ['#F59E0B', '#D97706', '#B45309'],
    shapes: ['square'],
    scalar: 1.3
  }
};

// Confetti implementation (canvas-based)
class ConfettiManager {
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId?: number;

  private createCanvas() {
    if (this.canvas) return;
    
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    this.ctx = this.canvas.getContext('2d');
    document.body.appendChild(this.canvas);
  }

  private removeCanvas() {
    if (this.canvas) {
      document.body.removeChild(this.canvas);
      this.canvas = undefined;
      this.ctx = undefined;
    }
  }

  fire(config: ConfettiConfig = {}) {
    this.createCanvas();
    if (!this.ctx) return;

    const finalConfig = { ...defaultConfigs.balance_update, ...config };
    
    // Create particles
    for (let i = 0; i < (finalConfig.particleCount || 100); i++) {
      this.particles.push(new Particle(finalConfig));
    }

    this.animate();
  }

  private animate = () => {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update and draw particles
    this.particles = this.particles.filter(particle => {
      particle.update();
      particle.draw(this.ctx!);
      return particle.isAlive();
    });

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.animate);
    } else {
      this.cleanup();
    }
  };

  private cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }
    setTimeout(() => this.removeCanvas(), 100);
  }
}

class Particle {
  private x: number;
  private y: number;
  private velocityX: number;
  private velocityY: number;
  private gravity: number;
  private decay: number;
  private life: number;
  private color: string;
  private shape: 'square' | 'circle';
  private size: number;

  constructor(config: ConfettiConfig) {
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    
    const angle = (Math.random() - 0.5) * (config.spread || 70) * (Math.PI / 180);
    const velocity = (config.startVelocity || 45) * (0.5 + Math.random() * 0.5);
    
    this.velocityX = Math.cos(angle) * velocity;
    this.velocityY = Math.sin(angle) * velocity;
    this.gravity = config.gravity || 0.3;
    this.decay = config.decay || 0.94;
    this.life = config.ticks || 200;
    
    this.color = config.colors?.[Math.floor(Math.random() * config.colors.length)] || '#8B5CF6';
    this.shape = config.shapes?.[Math.floor(Math.random() * config.shapes.length)] || 'circle';
    this.size = (config.scalar || 1) * (2 + Math.random() * 4);
  }

  update() {
    this.velocityX *= this.decay;
    this.velocityY *= this.decay;
    this.velocityY += this.gravity;
    
    this.x += this.velocityX;
    this.y += this.velocityY;
    
    this.life--;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / 200;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
    }
  }

  isAlive() {
    return this.life > 0 && this.y < window.innerHeight + 10;
  }
}

const confettiManager = new ConfettiManager();

// Public API
export function celebrateSuccess(event: SuccessEvent) {
  // Fire confetti
  const config = { ...defaultConfigs[event.type], ...event.confettiConfig };
  confettiManager.fire(config);

  // Show toast notification
  const defaultMessages = {
    balance_update: `Balance updated successfully!`,
    reward_earned: `You earned ${event.amount || 0} ${event.currency || 'VTNA Credits'}!`,
    transaction_complete: `Transaction completed successfully!`,
    subscription_activated: `Subscription activated!`
  };

  notify('toasts.common.success');

  // Trigger any additional refresh logic
  setTimeout(() => {
    // Refresh balance displays, etc.
    window.dispatchEvent(new CustomEvent('wallet:refresh'));
  }, 1000);
}

export { confettiManager };