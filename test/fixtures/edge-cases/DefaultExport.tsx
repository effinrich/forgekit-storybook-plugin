import React from 'react';

interface CardProps {
  title: string;
  description?: string;
}

export default function Card({ title, description }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
