import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  colorPalette?: 'red' | 'green' | 'blue' | 'yellow';
}

export const Badge = ({ children, colorPalette = 'blue' }: BadgeProps) => {
  return <span className={`badge badge-${colorPalette}`}>{children}</span>;
};
