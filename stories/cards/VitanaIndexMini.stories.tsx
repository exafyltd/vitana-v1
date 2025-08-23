import type { Meta, StoryObj } from '@storybook/react';
import VitanaIndexMini from '../../src/components/health/VitanaIndexMini';

const meta: Meta<typeof VitanaIndexMini> = {
  title: 'Cards/Health/VitanaIndexMini',
  component: VitanaIndexMini,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    score: {
      control: { type: 'range', min: 0, max: 100 }
    },
    trend: {
      control: 'select',
      options: ['up', 'down', 'stable']
    },
    variant: {
      control: 'select',
      options: ['card', 'compact', 'badge']
    },
    showDetails: {
      control: 'boolean'
    }
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    score: 75,
    trend: 'up',
    variant: 'card',
    showDetails: true,
  },
};

export const Excellent: Story = {
  args: {
    score: 92,
    trend: 'up',
    variant: 'card',
    showDetails: true,
  },
};

export const NeedsAttention: Story = {
  args: {
    score: 35,
    trend: 'down',
    variant: 'card',
    showDetails: true,
  },
};

export const Compact: Story = {
  args: {
    score: 68,
    trend: 'stable',
    variant: 'compact',
    showDetails: false,
  },
};

export const Badge: Story = {
  args: {
    score: 85,
    trend: 'up',
    variant: 'badge',
    showDetails: false,
  },
};