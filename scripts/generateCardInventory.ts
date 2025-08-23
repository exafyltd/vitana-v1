import fs from 'fs';
import path from 'path';
import systemCards from '../config/system_cards.json';
import cardTemplates from '../config/card_templates.json';

interface ScreenSlots {
  [screenRoute: string]: {
    screen: string;
    title: string;
    slots: {
      [slotId: string]: {
        name: string;
        allowedTemplates: string[];
        allowedSystemCards: string[];
        maxCards: number;
      };
    };
  };
}

// Define all Vitana screens based on the routing structure
const vitanaScreens = [
  // Main routes
  { route: '/', title: 'Home' },
  { route: '/dashboard', title: 'Dashboard' },
  { route: '/ai', title: 'AI Hub' },
  { route: '/calendar', title: 'Calendar' },
  { route: '/community', title: 'Community' },
  { route: '/discover', title: 'Discover' },
  { route: '/health', title: 'Health' },
  { route: '/health-tracker', title: 'Health Tracker' },
  { route: '/messages', title: 'Messages' },
  { route: '/profile', title: 'Profile' },
  { route: '/settings', title: 'Settings' },
  
  // AI sub-routes
  { route: '/ai/recommendations', title: 'AI Recommendations' },
  { route: '/ai/companion', title: 'AI Companion' },
  { route: '/ai/daily-summary', title: 'Daily Summary' },
  { route: '/ai/insights', title: 'AI Insights' },
  
  // Calendar sub-routes
  { route: '/calendar/appointments', title: 'Appointments' },
  { route: '/calendar/day', title: 'Day View' },
  { route: '/calendar/events', title: 'Events' },
  { route: '/calendar/month', title: 'Month View' },
  { route: '/calendar/motivation', title: 'Motivation Calendar' },
  { route: '/calendar/progress', title: 'Progress Calendar' },
  { route: '/calendar/recommendations', title: 'Calendar Recommendations' },
  { route: '/calendar/reminders', title: 'Reminders' },
  { route: '/calendar/week', title: 'Week View' },
  
  // Community sub-routes
  { route: '/community/ai-insights', title: 'Community AI Insights' },
  { route: '/community/challenges', title: 'Challenges' },
  { route: '/community/events', title: 'Community Events' },
  { route: '/community/groups', title: 'Groups' },
  { route: '/community/live-interaction', title: 'Live Interaction' },
  { route: '/community/live-rooms', title: 'Live Rooms' },
  { route: '/community/matchmaking', title: 'Matchmaking' },
  { route: '/community/media-hub', title: 'Media Hub' },
  { route: '/community/meetups', title: 'Meetups' },
  { route: '/community/my-business', title: 'My Business' },
  { route: '/community/my-groups', title: 'My Groups' },
  
  // Dashboard sub-routes
  { route: '/dashboard/ai-feed', title: 'AI Feed' },
  { route: '/dashboard/actions', title: 'Dashboard Actions' },
  { route: '/dashboard/context', title: 'Dashboard Context' },
  { route: '/dashboard/matches', title: 'Matches' },
  
  // Discover sub-routes
  { route: '/discover/browse-all', title: 'Browse All' },
  { route: '/discover/categories', title: 'Categories' },
  { route: '/discover/deals', title: 'Deals' },
  { route: '/discover/providers', title: 'Providers' },
  { route: '/discover/recommendations', title: 'Discover Recommendations' },
  { route: '/discover/saved', title: 'Saved Items' },
  { route: '/discover/trending', title: 'Trending' },
  
  // Health sub-routes
  { route: '/health/biomarker-results', title: 'Biomarker Results' },
  { route: '/health/conditions-risks', title: 'Conditions & Risks' },
  { route: '/health/education-resources', title: 'Education Resources' },
  { route: '/health/pillars-of-health', title: 'Pillars of Health' },
  { route: '/health/wellness-services', title: 'Wellness Services' },
  
  // Health Tracker sub-routes
  { route: '/health-tracker/connected-devices', title: 'Connected Devices' },
  { route: '/health-tracker/daily-weekly-tracking', title: 'Daily/Weekly Tracking' },
  { route: '/health-tracker/exercise', title: 'Exercise Tracker' },
  { route: '/health-tracker/hydration', title: 'Hydration Tracker' },
  { route: '/health-tracker/mental-health', title: 'Mental Health' },
  { route: '/health-tracker/my-vitana-index', title: 'My Vitana Index' },
  { route: '/health-tracker/nutrition', title: 'Nutrition Tracker' },
  { route: '/health-tracker/progress-goals', title: 'Progress & Goals' },
  { route: '/health-tracker/sleep', title: 'Sleep Tracker' },
  { route: '/health-tracker/trends', title: 'Health Trends' },
  { route: '/health-tracker/vitana-index', title: 'Vitana Index' },
  
  // Messages sub-routes
  { route: '/messages/archived', title: 'Archived Messages' },
  { route: '/messages/direct', title: 'Direct Messages' },
  { route: '/messages/group', title: 'Group Messages' },
  { route: '/messages/notifications', title: 'Message Notifications' },
  
  // Settings sub-routes
  { route: '/settings/billing', title: 'Billing' },
  { route: '/settings/connected-apps', title: 'Connected Apps' },
  { route: '/settings/preferences', title: 'Preferences' },
  { route: '/settings/privacy', title: 'Privacy' },
  { route: '/settings/notifications', title: 'Settings Notifications' },
  { route: '/settings/support', title: 'Support' }
];

function generateCardInventory(): void {
  let inventoryMarkdown = `# Vitana Card Inventory\n\n`;
  inventoryMarkdown += `Generated: ${new Date().toISOString()}\n`;
  inventoryMarkdown += `Total Screens: ${vitanaScreens.length}\n`;
  inventoryMarkdown += `System Cards: ${Object.keys(systemCards.systemCards).length}\n`;
  inventoryMarkdown += `Card Templates: ${Object.keys(cardTemplates.templates).length}\n\n`;

  // Load all slot configurations
  const slotsDir = path.join(__dirname, '../config/slots');
  let screenSlots: ScreenSlots = {};
  
  try {
    const slotFiles = fs.readdirSync(slotsDir).filter(file => file.endsWith('.json'));
    slotFiles.forEach(file => {
      const slotConfig = JSON.parse(fs.readFileSync(path.join(slotsDir, file), 'utf8'));
      screenSlots[slotConfig.screen] = slotConfig;
    });
  } catch (error) {
    console.warn('Slots directory not found, using default configuration');
  }

  // Generate inventory for each screen
  vitanaScreens.forEach(screen => {
    inventoryMarkdown += `### ${screen.route}\n`;
    inventoryMarkdown += `**Title:** ${screen.title}\n\n`;
    
    const slotConfig = screenSlots[screen.route];
    
    if (slotConfig) {
      Object.entries(slotConfig.slots).forEach(([slotId, slot]) => {
        inventoryMarkdown += `- **Slot:** ${slotId} (${slot.name})\n`;
        
        // List allowed templates
        slot.allowedTemplates?.forEach(templateId => {
          const template = cardTemplates.templates[templateId];
          inventoryMarkdown += `  - Template: ${templateId} — ${template?.name || 'Unknown'}\n`;
        });
        
        // List allowed system cards
        slot.allowedSystemCards?.forEach(systemCardId => {
          const systemCard = systemCards.systemCards[systemCardId];
          inventoryMarkdown += `  - SystemCard: ${systemCardId} — ${systemCard?.name || 'Unknown'}\n`;
        });
        
        inventoryMarkdown += `\n`;
      });
    } else {
      // Default configuration for screens without slot configs
      inventoryMarkdown += `- **Slot:** main\n`;
      inventoryMarkdown += `  - Template: (Configuration needed)\n\n`;
    }
    
    inventoryMarkdown += `\n`;
  });

  // Add summary sections
  inventoryMarkdown += `## System Cards Registry\n\n`;
  Object.entries(systemCards.systemCards).forEach(([id, card]) => {
    inventoryMarkdown += `- **${id}:** ${card.name}\n`;
    inventoryMarkdown += `  - Purpose: ${card.purpose}\n`;
    inventoryMarkdown += `  - Template: ${card.templateId}\n`;
    inventoryMarkdown += `  - Screens: ${card.screens.join(', ')}\n\n`;
  });

  inventoryMarkdown += `## Card Templates Registry\n\n`;
  Object.entries(cardTemplates.templates).forEach(([id, template]) => {
    inventoryMarkdown += `- **${id}:** ${template.name}\n`;
    inventoryMarkdown += `  - Category: ${template.category}\n`;
    inventoryMarkdown += `  - Component: ${template.componentPath}\n`;
    inventoryMarkdown += `  - Version: ${template.version}\n\n`;
  });

  // Ensure reports directory exists
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Write the inventory file
  const outputPath = path.join(reportsDir, 'cards_by_screen.md');
  fs.writeFileSync(outputPath, inventoryMarkdown);
  
  console.log(`✅ Card inventory generated: ${outputPath}`);
  console.log(`📊 Processed ${vitanaScreens.length} screens`);
  console.log(`🎯 Found ${Object.keys(systemCards.systemCards).length} system cards`);
  console.log(`🎨 Found ${Object.keys(cardTemplates.templates).length} card templates`);
}

// Export for use in package.json scripts
export { generateCardInventory };

// Run if called directly
if (require.main === module) {
  generateCardInventory();
}