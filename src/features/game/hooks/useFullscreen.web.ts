import { useEffect, useState } from 'react';

export function useFullscreen(defaultValue: boolean) {
  const [fullscreen, setFullscreen] = useState(defaultValue);
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);
  const toggleFullscreen = () => {
    const next = !fullscreen;
    setFullscreen(next);
    if (next && document.fullscreenEnabled) {
      // The expanded game layout still works when the browser denies fullscreen.
      void document.documentElement.requestFullscreen().catch(() => {});
    } else if (!next && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  };
  return { fullscreen, toggleFullscreen };
}
