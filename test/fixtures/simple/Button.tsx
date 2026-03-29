import React from 'react';

export interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const Button = ({ label, variant = 'primary', size = 'md', disabled, onClick, children }: ButtonProps) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children || label}
    </button>
  );
};
