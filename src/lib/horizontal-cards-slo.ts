/**
 * Service Level Objectives (SLOs) for Horizontal Cards
 * 
 * Critical Metrics:
 * - Time to Interactive (TTI): < 2000ms
 * - Card Interaction Latency: < 200ms
 * - Infinite Scroll Latency: < 500ms
 * - Accessibility Score: ≥ 95%
 * - Zero Critical A11y Violations
 */

interface SLOMetrics {
  tti: number;
  cardInteractionLatency: number;
  infiniteScrollLatency: number;
  a11yScore: number;
  criticalViolations: number;
}

class HorizontalCardsSLO {
  private metrics: SLOMetrics = {
    tti: 0,
    cardInteractionLatency: 0,
    infiniteScrollLatency: 0,
    a11yScore: 0,
    criticalViolations: 0
  };

  private startTime: number = 0;

  startTTI() {
    this.startTime = performance.now();
  }

  endTTI() {
    this.metrics.tti = performance.now() - this.startTime;
    
    if (this.metrics.tti > 2000) {
      console.warn(`[SLO Violation] TTI: ${this.metrics.tti}ms (target: <2000ms)`);
    } else {
      console.log(`[SLO Met] TTI: ${this.metrics.tti}ms ✓`);
    }
  }

  measureInteraction(fn: () => void) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    
    this.metrics.cardInteractionLatency = duration;
    
    if (duration > 200) {
      console.warn(`[SLO Violation] Interaction latency: ${duration}ms (target: <200ms)`);
    }
  }

  async measureInfiniteScroll(fn: () => Promise<void>) {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    
    this.metrics.infiniteScrollLatency = duration;
    
    if (duration > 500) {
      console.warn(`[SLO Violation] Infinite scroll latency: ${duration}ms (target: <500ms)`);
    }
  }

  setA11yResults(score: number, criticalCount: number) {
    this.metrics.a11yScore = score;
    this.metrics.criticalViolations = criticalCount;
    
    if (score < 95) {
      console.error(`[SLO Violation] A11y score: ${score}% (target: ≥95%)`);
    }
    
    if (criticalCount > 0) {
      console.error(`[SLO Violation] Critical A11y violations: ${criticalCount} (target: 0)`);
    }
  }

  getReport(): SLOMetrics {
    return { ...this.metrics };
  }

  passesAllSLOs(): boolean {
    return (
      this.metrics.tti < 2000 &&
      this.metrics.cardInteractionLatency < 200 &&
      this.metrics.infiniteScrollLatency < 500 &&
      this.metrics.a11yScore >= 95 &&
      this.metrics.criticalViolations === 0
    );
  }
}

export const horizontalCardsSLO = new HorizontalCardsSLO();
