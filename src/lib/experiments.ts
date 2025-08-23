/**
 * A/B Testing Framework for Card ID System
 * Manages experiment assignment and tracking
 */

export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  targetScreens: string[];
  variants: ExperimentVariant[];
  successMetrics: string[];
  sampleRate: number; // 0-1, percentage of users to include
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // 0-1, percentage allocation
  config: Record<string, any>;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: Date;
}

class ExperimentService {
  private assignments: Map<string, ExperimentAssignment> = new Map();
  private experiments: Map<string, ExperimentConfig> = new Map();

  constructor() {
    this.loadExperiments();
    this.loadAssignments();
  }

  private loadExperiments(): void {
    // Define active experiments
    const experiments: ExperimentConfig[] = [
      {
        id: 'AB-DASH-01',
        name: 'Dashboard Masonry Layout',
        description: 'Test C-001 layout variant A vs B on dashboard',
        startDate: new Date('2025-08-23'),
        endDate: new Date('2025-08-30'),
        targetScreens: ['/dashboard'],
        variants: [
          {
            id: 'variant-a',
            name: 'Layout A - Compact',
            weight: 0.5,
            config: { layout: 'compact', cardSpacing: 'tight' }
          },
          {
            id: 'variant-b', 
            name: 'Layout B - Spacious',
            weight: 0.5,
            config: { layout: 'spacious', cardSpacing: 'comfortable' }
          }
        ],
        successMetrics: ['confirm_all_ctr', 'dismiss_rate'],
        sampleRate: 1.0
      },
      {
        id: 'AB-AI-02',
        name: 'AI Recommendations Combo',
        description: 'Test C-011 alone vs C-011+C-015 combo on AI recommendations',
        startDate: new Date('2025-08-23'),
        endDate: new Date('2025-08-30'),
        targetScreens: ['/ai/recommendations'],
        variants: [
          {
            id: 'single-card',
            name: 'C-011 Alone',
            weight: 0.5,
            config: { cards: ['C-011'], layout: 'single' }
          },
          {
            id: 'combo-cards',
            name: 'C-011 + C-015 Combo',
            weight: 0.5,
            config: { cards: ['C-011', 'C-015'], layout: 'combo' }
          }
        ],
        successMetrics: ['task_completion_rate', 'next_day_adherence'],
        sampleRate: 1.0
      },
      {
        id: 'AB-DISC-03',
        name: 'Discover Recommendations Variant',
        description: 'Test CT-DO-002 variant A vs B on discover recommendations',
        startDate: new Date('2025-08-23'),
        endDate: new Date('2025-08-30'),
        targetScreens: ['/discover/recommendations'],
        variants: [
          {
            id: 'variant-a',
            name: 'Variant A - Standard',
            weight: 0.5,
            config: { template: 'CT-DO-002', style: 'standard', ctaStyle: 'button' }
          },
          {
            id: 'variant-b',
            name: 'Variant B - Enhanced',
            weight: 0.5,
            config: { template: 'CT-DO-002', style: 'enhanced', ctaStyle: 'card-action' }
          }
        ],
        successMetrics: ['add_to_cart', 'session_duration'],
        sampleRate: 1.0
      }
    ];

    experiments.forEach(exp => {
      this.experiments.set(exp.id, exp);
    });
  }

  private loadAssignments(): void {
    // Load from localStorage
    const stored = localStorage.getItem('vitana_experiment_assignments');
    if (stored) {
      try {
        const assignments = JSON.parse(stored);
        Object.entries(assignments).forEach(([key, value]: [string, any]) => {
          this.assignments.set(key, {
            experimentId: value.experimentId,
            variantId: value.variantId,
            assignedAt: new Date(value.assignedAt)
          });
        });
      } catch (error) {
        console.warn('Failed to load experiment assignments:', error);
      }
    }
  }

  private saveAssignments(): void {
    const assignments: Record<string, any> = {};
    this.assignments.forEach((assignment, key) => {
      assignments[key] = {
        experimentId: assignment.experimentId,
        variantId: assignment.variantId,
        assignedAt: assignment.assignedAt.toISOString()
      };
    });
    localStorage.setItem('vitana_experiment_assignments', JSON.stringify(assignments));
  }

  private getUserId(): string {
    // Get or generate stable user ID for experiment assignment
    let userId = localStorage.getItem('vitana_user_id');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('vitana_user_id', userId);
    }
    return userId;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private assignVariant(experiment: ExperimentConfig): string {
    const userId = this.getUserId();
    const seed = `${experiment.id}-${userId}`;
    const hash = this.hashString(seed);
    const random = (hash % 10000) / 10000; // Normalize to 0-1

    // Check if user should be included in experiment
    if (random > experiment.sampleRate) {
      return 'control'; // User not in experiment
    }

    // Assign variant based on weights
    let weightSum = 0;
    for (const variant of experiment.variants) {
      weightSum += variant.weight;
      if (random <= weightSum) {
        return variant.id;
      }
    }

    // Fallback to first variant
    return experiment.variants[0]?.id || 'control';
  }

  getExperimentAssignment(experimentId: string, screenRoute: string): ExperimentAssignment | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return null;
    }

    // Check if experiment is active
    const now = new Date();
    if (now < experiment.startDate || now > experiment.endDate) {
      return null;
    }

    // Check if current screen is targeted
    if (!experiment.targetScreens.includes(screenRoute)) {
      return null;
    }

    // Check if already assigned
    const existingAssignment = this.assignments.get(experimentId);
    if (existingAssignment) {
      return existingAssignment;
    }

    // Assign new variant
    const variantId = this.assignVariant(experiment);
    const assignment: ExperimentAssignment = {
      experimentId,
      variantId,
      assignedAt: new Date()
    };

    this.assignments.set(experimentId, assignment);
    this.saveAssignments();

    return assignment;
  }

  getVariantConfig(experimentId: string, variantId: string): Record<string, any> | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return null;
    }

    const variant = experiment.variants.find(v => v.id === variantId);
    return variant?.config || null;
  }

  getAllActiveExperiments(): ExperimentConfig[] {
    const now = new Date();
    return Array.from(this.experiments.values()).filter(exp => 
      now >= exp.startDate && now <= exp.endDate
    );
  }

  getExperimentForScreen(screenRoute: string): ExperimentAssignment[] {
    const activeExperiments = this.getAllActiveExperiments();
    const assignments: ExperimentAssignment[] = [];

    for (const experiment of activeExperiments) {
      if (experiment.targetScreens.includes(screenRoute)) {
        const assignment = this.getExperimentAssignment(experiment.id, screenRoute);
        if (assignment) {
          assignments.push(assignment);
        }
      }
    }

    return assignments;
  }

  // Method for debugging/testing
  clearAssignments(): void {
    this.assignments.clear();
    localStorage.removeItem('vitana_experiment_assignments');
  }

  // Method to get assignment status for debugging
  getAssignmentStatus(): Record<string, ExperimentAssignment> {
    const status: Record<string, ExperimentAssignment> = {};
    this.assignments.forEach((assignment, experimentId) => {
      status[experimentId] = assignment;
    });
    return status;
  }
}

export const experiments = new ExperimentService();
export default experiments;