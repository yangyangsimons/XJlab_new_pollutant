import React, { useEffect, useState, useRef } from 'react';

interface ScaleContainerProps {
  children: React.ReactNode;
}

export function ScaleContainer({ children }: ScaleContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const targetRatio = 1920 / 1080;
      const currentRatio = width / height;
      
      let newScale = 1;
      if (currentRatio > targetRatio) {
        newScale = height / 1080;
      } else {
        newScale = width / 1920;
      }
      
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="flex items-center justify-center w-screen h-screen overflow-hidden bg-brand-bg">
      <div 
        ref={containerRef}
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative'
        }}
        className="flex flex-col flex-shrink-0"
      >
        {children}
      </div>
    </div>
  );
}
