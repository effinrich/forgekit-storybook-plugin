import React from 'react';
import { Link } from 'react-router-dom';

interface RouterLinkProps {
  to: string;
  children: React.ReactNode;
}

export const RouterLink = ({ to, children }: RouterLinkProps) => {
  return <Link to={to}>{children}</Link>;
};
