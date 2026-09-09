import { useState } from 'react';

export function useFullscreen(defaultValue: boolean) {
  const [fullscreen, setFullscreen] = useState(defaultValue);
  return {
    fullscreen,
    toggleFullscreen: () => setFullscreen((value) => !value),
  };
}
