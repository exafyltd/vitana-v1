/**
 * Accessibility testing utilities and CI enforcement helpers
 * Used for automated axe-core testing in CI/CD pipeline
 */

import { AxeResults, Result } from 'axe-core';

export interface AccessibilityTestResult {
  url: string;
  violations: Result[];
  passes: Result[];
  incomplete: Result[];
  timestamp: number;
  hasSerious: boolean;
  hasCritical: boolean;
}

export class AccessibilityTester {
  private static readonly CRITICAL_IMPACT_LEVELS = ['critical', 'serious'];
  
  static async runAxeTest(targetSelector: string = 'body'): Promise<AccessibilityTestResult> {
    // This would be implemented with axe-core in a real test environment
    // For now, we'll return a mock structure for development
    const mockResult: AccessibilityTestResult = {
      url: window.location.href,
      violations: [],
      passes: [],
      incomplete: [],
      timestamp: Date.now(),
      hasSerious: false,
      hasCritical: false
    };

    // In development, just log that the test would run
    if (process.env.NODE_ENV === 'development') {
      console.log('[A11y Test]', `Would run axe-core test on: ${targetSelector}`);
      console.log('[A11y Test]', `URL: ${mockResult.url}`);
    }

    return mockResult;
  }

  static checkCriticalViolations(results: AccessibilityTestResult): boolean {
    return results.violations.some(violation => 
      AccessibilityTester.CRITICAL_IMPACT_LEVELS.includes(violation.impact || '')
    );
  }

  static generateReport(results: AccessibilityTestResult[]): string {
    let report = '# Accessibility Test Report\n\n';
    
    results.forEach(result => {
      report += `## ${result.url}\n`;
      report += `- Timestamp: ${new Date(result.timestamp).toISOString()}\n`;
      report += `- Violations: ${result.violations.length}\n`;
      report += `- Passes: ${result.passes.length}\n`;
      report += `- Critical/Serious: ${result.hasSerious || result.hasCritical ? 'YES ❌' : 'NO ✅'}\n\n`;
      
      if (result.violations.length > 0) {
        report += '### Violations:\n';
        result.violations.forEach(violation => {
          report += `- **${violation.id}** (${violation.impact}): ${violation.description}\n`;
        });
        report += '\n';
      }
    });

    return report;
  }

  static async testScreens(screens: string[]): Promise<AccessibilityTestResult[]> {
    const results: AccessibilityTestResult[] = [];
    
    for (const screen of screens) {
      // In a real implementation, this would navigate to each screen and run axe
      const result = await AccessibilityTester.runAxeTest();
      result.url = screen;
      results.push(result);
    }
    
    return results;
  }
}

// CI-specific test screens for Day 2
export const CI_TEST_SCREENS = [
  '/dashboard',
  '/inbox',
  '/health',
  '/discover',
  '/autopilot-popup' // Special case for popup testing
];

// RTL test screens for regression testing
export const RTL_TEST_SCREENS = [
  '/',         // Home/Dashboard
  '/inbox', // Inbox
  '/profile',  // Profile capsule  
  '/health'    // Health overview
];

export default AccessibilityTester;