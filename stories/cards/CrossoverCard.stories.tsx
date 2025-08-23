import type { Meta, StoryObj } from '@storybook/react';
import { CrossoverCard } from '../../src/components/crossover/CrossoverCard';
import { Heart, Activity, Users } from 'lucide-react';

const meta: Meta<typeof CrossoverCard> = {
  title: 'Cards/Crossover/CrossoverCard',
  component: CrossoverCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    category: {
      control: 'select',
      options: ['vitana', 'mental', 'physical', 'social', 'nutrition', 'community', 'calendar']
    },
    size: {
      control: 'select',
      options: ['default', 'compact']
    },
    urgent: {
      control: 'boolean'
    }
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Activity,
    category: 'vitana',
    title: 'Health Tracking',
    subtitle: 'Monitor your wellness journey with smart insights',
    content: (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Track your daily health metrics and get personalized recommendations.
        </p>
      </div>
    ),
    buttonText: 'Start Tracking',
    onButtonClick: () => console.log('Primary button clicked'),
  },
};

export const WithSecondaryButton: Story = {
  args: {
    ...Default.args,
    secondaryButtonText: 'Learn More',
    onSecondaryButtonClick: () => console.log('Secondary button clicked'),
  },
};

export const Urgent: Story = {
  args: {
    ...Default.args,
    urgent: true,
    title: 'Urgent Health Alert',
    subtitle: 'Immediate attention required for your wellness',
    buttonText: 'Take Action Now',
  },
};

export const Mental: Story = {
  args: {
    icon: Heart,
    category: 'mental',
    title: 'Mental Wellness',
    subtitle: 'Nurture your mental health with mindful practices',
    content: (
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Meditation streak: 7 days</p>
        <p className="text-xs text-muted-foreground">Keep up the great work!</p>
      </div>
    ),
    buttonText: 'Continue Practice',
  },
};

export const Community: Story = {
  args: {
    icon: Users,
    category: 'community',
    title: 'Community Activity',
    subtitle: 'Connect with your wellness community',
    content: (
      <div className="text-center space-y-2">
        <p className="text-sm font-medium">12 friends active now</p>
        <p className="text-xs text-muted-foreground">Join the group workout</p>
      </div>
    ),
    buttonText: 'Join Activity',
  },
};

export const Compact: Story = {
  args: {
    ...Default.args,
    size: 'compact',
    title: 'Quick Health Check',
    subtitle: 'Compact view for essential info',
  },
};