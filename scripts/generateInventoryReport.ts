#!/usr/bin/env bun
/**
 * Generate Card Inventory Reports
 * Creates comprehensive reports of card usage across screens
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface SystemCard {
  name: string;
  purpose: string;
  templateId: string;
  singleton: boolean;
  screens: string[];
  slots: string[];
}

interface Template {
  name: string;
  category: string;
  componentPath: string;
  version: string;
  description: string;
  propsSchema: Record<string, any>;
  actions: string[];
  supportsSystemCards: boolean;
}

interface SlotConfig {
  screen: string;
  title: string;
  slots: Record<string, {
    name: string;
    allowedTemplates: string[];
    allowedSystemCards: string[];
    maxCards: number;
  }>;
}

interface InventoryReport {
  generated: string;
  summary: {
    totalSystemCards: number;
    totalTemplates: number;
    totalScreens: number;
    totalSlots: number;
  };
  cardsByScreen: Record<string, {
    screenTitle: string;
    totalSlots: number;
    cards: Array<{
      slotName: string;
      systemCards: string[];
      templates: string[];
      maxCards: number;
    }>;
  }>;
  templateUsage: Record<string, {
    name: string;
    category: string;
    usedInScreens: string[];
    usedBySystemCards: string[];
    totalUsage: number;
  }>;
  systemCardDistribution: Record<string, {
    name: string;
    templateId: string;
    screensCount: number;
    screens: string[];
  }>;
}

class InventoryGenerator {
  private systemCards: Record<string, SystemCard> = {};
  private templates: Record<string, Template> = {};
  private slotConfigs: SlotConfig[] = [];

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    // Load system cards
    const systemCardsPath = resolve('./config/system_cards.json');
    if (existsSync(systemCardsPath)) {
      const systemCardsData = JSON.parse(readFileSync(systemCardsPath, 'utf8'));
      this.systemCards = systemCardsData.systemCards || {};
    }

    // Load templates (try both files)
    const templatesPath = resolve('./config/card_templates.json');
    const expandedTemplatesPath = resolve('./config/card_templates_expanded.json');
    
    let templatesData: any = {};
    if (existsSync(expandedTemplatesPath)) {
      templatesData = JSON.parse(readFileSync(expandedTemplatesPath, 'utf8'));
    } else if (existsSync(templatesPath)) {
      templatesData = JSON.parse(readFileSync(templatesPath, 'utf8'));
    }
    this.templates = templatesData.templates || {};

    // Load slot configurations
    this.loadSlotConfigs();
  }

  private loadSlotConfigs(): void {
    const slotsDir = resolve('./config/slots');
    if (!existsSync(slotsDir)) return;

    const slotFiles = ['index.json', 'dashboard.json'];
    
    for (const file of slotFiles) {
      const filePath = resolve(slotsDir, file);
      if (existsSync(filePath)) {
        try {
          const config = JSON.parse(readFileSync(filePath, 'utf8'));
          this.slotConfigs.push(config);
        } catch (error) {
          console.warn(`Failed to load slot config: ${file}`, error);
        }
      }
    }
  }

  generateReport(): InventoryReport {
    const report: InventoryReport = {
      generated: new Date().toISOString(),
      summary: {
        totalSystemCards: Object.keys(this.systemCards).length,
        totalTemplates: Object.keys(this.templates).length,
        totalScreens: this.slotConfigs.length,
        totalSlots: this.slotConfigs.reduce((sum, config) => 
          sum + Object.keys(config.slots || {}).length, 0
        )
      },
      cardsByScreen: {},
      templateUsage: {},
      systemCardDistribution: {}
    };

    // Generate cards by screen
    this.slotConfigs.forEach(config => {
      const screen = config.screen;
      const slots = config.slots || {};
      
      report.cardsByScreen[screen] = {
        screenTitle: config.title,
        totalSlots: Object.keys(slots).length,
        cards: Object.entries(slots).map(([slotId, slot]) => ({
          slotName: slot.name,
          systemCards: slot.allowedSystemCards || [],
          templates: slot.allowedTemplates || [],
          maxCards: slot.maxCards || 1
        }))
      };
    });

    // Generate template usage
    Object.entries(this.templates).forEach(([templateId, template]) => {
      const usage = {
        name: template.name,
        category: template.category,
        usedInScreens: [] as string[],
        usedBySystemCards: [] as string[],
        totalUsage: 0
      };

      // Find screens using this template
      this.slotConfigs.forEach(config => {
        Object.entries(config.slots || {}).forEach(([slotId, slot]) => {
          if (slot.allowedTemplates?.includes(templateId)) {
            usage.usedInScreens.push(config.screen);
          }
        });
      });

      // Find system cards using this template
      Object.entries(this.systemCards).forEach(([cardId, card]) => {
        if (card.templateId === templateId) {
          usage.usedBySystemCards.push(cardId);
        }
      });

      usage.totalUsage = usage.usedInScreens.length + usage.usedBySystemCards.length;
      report.templateUsage[templateId] = usage;
    });

    // Generate system card distribution
    Object.entries(this.systemCards).forEach(([cardId, card]) => {
      report.systemCardDistribution[cardId] = {
        name: card.name,
        templateId: card.templateId,
        screensCount: card.screens.length,
        screens: card.screens
      };
    });

    return report;
  }

  generateMarkdownReport(report: InventoryReport): string {
    let markdown = `# Vitana Card Inventory Report\n\n`;
    markdown += `Generated: ${report.generated}\n\n`;

    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **System Cards**: ${report.summary.totalSystemCards}\n`;
    markdown += `- **Templates**: ${report.summary.totalTemplates}\n`;
    markdown += `- **Screens**: ${report.summary.totalScreens}\n`;
    markdown += `- **Slots**: ${report.summary.totalSlots}\n\n`;

    // Cards by screen
    markdown += `## Cards by Screen\n\n`;
    Object.entries(report.cardsByScreen).forEach(([screen, screenData]) => {
      markdown += `### ${screenData.screenTitle} (${screen})\n\n`;
      markdown += `**Slots**: ${screenData.totalSlots}\n\n`;
      
      screenData.cards.forEach(card => {
        markdown += `#### ${card.slotName}\n`;
        markdown += `- **Max Cards**: ${card.maxCards}\n`;
        markdown += `- **System Cards**: ${card.systemCards.join(', ') || 'None'}\n`;
        markdown += `- **Templates**: ${card.templates.join(', ') || 'None'}\n\n`;
      });
    });

    // Template usage
    markdown += `## Template Usage\n\n`;
    const sortedTemplates = Object.entries(report.templateUsage)
      .sort(([,a], [,b]) => b.totalUsage - a.totalUsage);

    sortedTemplates.forEach(([templateId, usage]) => {
      markdown += `### ${usage.name} (${templateId})\n`;
      markdown += `- **Category**: ${usage.category}\n`;
      markdown += `- **Total Usage**: ${usage.totalUsage}\n`;
      markdown += `- **Used in Screens**: ${usage.usedInScreens.join(', ') || 'None'}\n`;
      markdown += `- **Used by System Cards**: ${usage.usedBySystemCards.join(', ') || 'None'}\n\n`;
    });

    // System card distribution
    markdown += `## System Card Distribution\n\n`;
    Object.entries(report.systemCardDistribution).forEach(([cardId, card]) => {
      markdown += `### ${card.name} (${cardId})\n`;
      markdown += `- **Template**: ${card.templateId}\n`;
      markdown += `- **Screens Count**: ${card.screensCount}\n`;
      markdown += `- **Screens**: ${card.screens.join(', ')}\n\n`;
    });

    return markdown;
  }

  generateRuntimeSample(): any {
    // Generate a sample runtime configuration
    const sample = {
      timestamp: new Date().toISOString(),
      activeExperiments: [
        {
          id: 'AB-DASH-01',
          variant: 'variant-a',
          screens: ['/dashboard']
        },
        {
          id: 'AB-AI-02', 
          variant: 'combo-cards',
          screens: ['/ai/recommendations']
        },
        {
          id: 'AB-DISC-03',
          variant: 'variant-b',
          screens: ['/discover/recommendations']
        }
      ],
      cardInstances: Object.keys(this.systemCards).map(cardId => ({
        systemCardId: cardId,
        templateId: this.systemCards[cardId].templateId,
        instanceId: `${cardId}-${Date.now()}`,
        screen: this.systemCards[cardId].screens[0],
        experimentId: Math.random() > 0.5 ? 'AB-DASH-01' : null
      })),
      templateStats: Object.entries(this.templates).map(([templateId, template]) => ({
        templateId,
        name: template.name,
        category: template.category,
        activeInstances: Math.floor(Math.random() * 10) + 1,
        impressions24h: Math.floor(Math.random() * 1000) + 100,
        clicks24h: Math.floor(Math.random() * 100) + 10
      }))
    };

    return sample;
  }

  async run(): Promise<void> {
    console.log('Generating Vitana Card Inventory Report...');

    const report = this.generateReport();
    const markdown = this.generateMarkdownReport(report);
    const runtimeSample = this.generateRuntimeSample();

    // Write reports
    writeFileSync('./reports/cards_by_screen.md', markdown);
    writeFileSync('./reports/cards_runtime_sample.json', JSON.stringify(runtimeSample, null, 2));
    writeFileSync('./reports/full_inventory.json', JSON.stringify(report, null, 2));

    console.log('✅ Reports generated:');
    console.log('   📄 ./reports/cards_by_screen.md');
    console.log('   📊 ./reports/cards_runtime_sample.json');
    console.log('   🗃️ ./reports/full_inventory.json');
    
    console.log(`\n📈 Summary:`);
    console.log(`   System Cards: ${report.summary.totalSystemCards}`);
    console.log(`   Templates: ${report.summary.totalTemplates}`);
    console.log(`   Screens: ${report.summary.totalScreens}`);
    console.log(`   Slots: ${report.summary.totalSlots}`);
  }
}

// Run if called directly
if (import.meta.main) {
  const generator = new InventoryGenerator();
  generator.run().catch(console.error);
}

export default InventoryGenerator;