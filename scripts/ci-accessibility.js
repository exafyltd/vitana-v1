#!/usr/bin/env node

/**
 * CI Accessibility Testing Script
 * Runs axe-core tests headlessly on key screens and fails on serious/critical violations
 */

const puppeteer = require('puppeteer');
const axeCore = require('axe-core');
const fs = require('fs').promises;
const path = require('path');

const CI_TEST_SCREENS = [
  '/',
  '/messages',
  '/health', 
  '/discover'
];

const RTL_TEST_SCREENS = [
  '/',
  '/messages',
  '/profile',
  '/health'
];

class CIAccessibilityTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = process.env.CI_BASE_URL || 'http://localhost:5173';
    this.results = [];
  }

  async setup() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    this.page = await this.browser.newPage();
    
    // Set viewport for consistent testing
    await this.page.setViewport({ width: 1200, height: 800 });
    
    // Inject axe-core
    await this.page.addScriptTag({
      path: require.resolve('axe-core/axe.min.js')
    });
  }

  async testScreen(screenPath) {
    console.log(`Testing ${screenPath}...`);
    
    const url = `${this.baseUrl}${screenPath}`;
    await this.page.goto(url, { waitUntil: 'networkidle0' });
    
    // Wait for content to load
    await this.page.waitForTimeout(2000);
    
    // Run axe-core analysis
    const results = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        axe.run((err, results) => {
          if (err) throw err;
          resolve(results);
        });
      });
    });
    
    return {
      url: screenPath,
      violations: results.violations,
      passes: results.passes,
      incomplete: results.incomplete,
      timestamp: Date.now(),
      hasSerious: results.violations.some(v => v.impact === 'serious'),
      hasCritical: results.violations.some(v => v.impact === 'critical')
    };
  }

  async testRTLScreen(screenPath) {
    console.log(`Testing RTL for ${screenPath}...`);
    
    const url = `${this.baseUrl}${screenPath}`;
    await this.page.goto(url, { waitUntil: 'networkidle0' });
    
    // Enable RTL mode
    await this.page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.classList.add('rtl');
    });
    
    // Wait for layout changes
    await this.page.waitForTimeout(1000);
    
    // Take screenshot for regression testing
    const screenshotPath = path.join(__dirname, '..', 'screenshots', `rtl-${screenPath.replace(/\//g, '_') || 'home'}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log(`RTL screenshot saved: ${screenshotPath}`);
    
    return {
      screenPath,
      screenshotPath,
      timestamp: Date.now()
    };
  }

  async runAllTests() {
    console.log('🚀 Starting CI Accessibility Tests...\n');
    
    // Test accessibility on key screens
    for (const screen of CI_TEST_SCREENS) {
      const result = await this.testScreen(screen);
      this.results.push(result);
    }
    
    // Test RTL snapshots
    const rtlResults = [];
    for (const screen of RTL_TEST_SCREENS) {
      const result = await this.testRTLScreen(screen);
      rtlResults.push(result);
    }
    
    return { a11yResults: this.results, rtlResults };
  }

  async generateReport() {
    let report = '# Accessibility CI Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Base URL: ${this.baseUrl}\n\n`;
    
    let hasFailures = false;
    
    this.results.forEach(result => {
      const status = (result.hasSerious || result.hasCritical) ? '❌ FAIL' : '✅ PASS';
      if (result.hasSerious || result.hasCritical) hasFailures = true;
      
      report += `## ${result.url} ${status}\n`;
      report += `- Violations: ${result.violations.length}\n`;
      report += `- Passes: ${result.passes.length}\n`;
      report += `- Serious: ${result.violations.filter(v => v.impact === 'serious').length}\n`;
      report += `- Critical: ${result.violations.filter(v => v.impact === 'critical').length}\n\n`;
      
      if (result.violations.length > 0) {
        report += '### Violations:\n';
        result.violations.forEach(violation => {
          const impact = violation.impact ? `(${violation.impact.toUpperCase()})` : '';
          report += `- **${violation.id}** ${impact}: ${violation.description}\n`;
          violation.nodes.forEach(node => {
            report += `  - Element: \`${node.target.join(', ')}\`\n`;
          });
        });
        report += '\n';
      }
    });
    
    // Save report
    const reportPath = path.join(__dirname, '..', 'reports', 'accessibility-ci-report.md');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    console.log(`📄 Report saved: ${reportPath}`);
    
    return { hasFailures, reportPath };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const tester = new CIAccessibilityTester();
  
  try {
    await tester.setup();
    const { a11yResults, rtlResults } = await tester.runAllTests();
    const { hasFailures, reportPath } = await tester.generateReport();
    
    console.log('\n📊 Test Summary:');
    console.log(`- Screens tested: ${a11yResults.length}`);
    console.log(`- RTL snapshots: ${rtlResults.length}`);
    console.log(`- Total violations: ${a11yResults.reduce((sum, r) => sum + r.violations.length, 0)}`);
    console.log(`- Serious/Critical: ${a11yResults.filter(r => r.hasSerious || r.hasCritical).length}`);
    
    if (hasFailures) {
      console.error('\n❌ CI FAILED: Serious or critical accessibility violations found!');
      process.exit(1);
    } else {
      console.log('\n✅ CI PASSED: No serious or critical accessibility violations found!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('CI test failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = CIAccessibilityTester;