
import React, { useState, useEffect, useRef } from 'react';

interface JoystickProps {
  onMove: (forward: number, side: number) => void;
}

const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
  };

  const handleMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = rect.width / 2;

    const limitedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);

    const x = Math.cos(angle) * limitedDistance;
    const y = Math.sin(angle) * limitedDistance;

    setPosition({ x, y });

    // Normalizado de -1 a 1
    // Invertemos o Y porque no mundo 3D 'frente' costuma ser negativo Z ou usamos front/side logic
    onMove(-y / maxDistance, x / maxDistance);
  };

  const handleEnd = () => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="w-32 h-32 bg-white/10 rounded-full border border-white/20 flex items-center justify-center touch-none select-none"
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    >
      <div 
        ref={joystickRef}
        className="w-12 h-12 bg-white/40 rounded-full shadow-lg pointer-events-none"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      />
    </div>
  );
};

export default Joystick;
