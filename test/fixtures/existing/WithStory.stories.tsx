// Pre-existing story file for testing skip behavior
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WithStory } from './WithStory';

const meta: Meta<typeof WithStory> = {
  component: WithStory,
  title: 'Test / WithStory',
};

export default meta;
type Story = StoryObj<typeof WithStory>;

export const Default: Story = {
  args: { text: 'Hello' },
};
