import React from 'react';

interface WithStoryProps {
  text: string;
}

export const WithStory = ({ text }: WithStoryProps) => {
  return <span>{text}</span>;
};
