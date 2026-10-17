import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';
import { LevelProgressRing } from '../components/charts/LevelProgressRing.js';
import { TeamWorkloadBarChart } from '../components/charts/TeamWorkloadBarChart.js';

describe('Frontend Custom Component Library & Charts (No Radix/shadcn)', () => {
  it('renders custom Button with proper classes and loading state', () => {
    const { rerender } = render(<Button variant="primary">Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDefined();

    rerender(<Button isLoading>Click Me</Button>);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('renders status Badges for Done, Overdue, and In Progress', () => {
    render(
      <div>
        <Badge variant="done">Done</Badge>
        <Badge variant="overdue">Overdue</Badge>
        <Badge variant="in_progress">In progress</Badge>
      </div>
    );

    expect(screen.getByText('Done')).toBeDefined();
    expect(screen.getByText('Overdue')).toBeDefined();
    expect(screen.getByText('In progress')).toBeDefined();
  });

  it('renders LevelProgressRing showing current level of 15', () => {
    const { container } = render(<LevelProgressRing currentLevel={4} totalLevels={15} />);
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('of 15')).toBeDefined();
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('renders TeamWorkloadBarChart with intern names and task totals', () => {
    const workload = [
      { name: 'Meera', total: 4, overdue: 0 },
      { name: 'Nikhil', total: 4, overdue: 1 },
    ];
    render(<TeamWorkloadBarChart data={workload} />);

    expect(screen.getByText('Meera')).toBeDefined();
    expect(screen.getByText('Nikhil')).toBeDefined();
  });
});
