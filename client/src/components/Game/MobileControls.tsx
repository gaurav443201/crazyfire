import React, { useRef, useState } from 'react';

export default function MobileControls() {
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isTouchActive, setIsTouchActive] = useState(false);
  const joystickBaseRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouchActive(true);
    updateJoystick(e.touches[0]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchActive) return;
    updateJoystick(e.touches[0]);
  };

  const handleTouchEnd = () => {
    setIsTouchActive(false);
    setJoystickPos({ x: 0, y: 0 });
    
    // Dispatch reset movement keys
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
  };

  const updateJoystick = (touch: React.Touch) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 40); // clamp distance limit

    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    setJoystickPos({ x, y });

    // Translate joystick displacement to virtual key events for the GameEngine
    const threshold = 15;
    
    // Forward / Backward
    if (y < -threshold) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }));
    } else if (y > threshold) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    } else {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }));
    }

    // Strafe Left / Right
    if (x < -threshold) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
    } else if (x > threshold) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    } else {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
    }
  };

  // Dispatch simulated events for simple action buttons
  const triggerAction = (code: string, eventName: 'keydown' | 'keyup') => {
    window.dispatchEvent(new KeyboardEvent(eventName, { code }));
  };

  const simulatedShoot = () => {
    // Simulated mouse click shooting
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const clickEvent = new MouseEvent('mousedown', { button: 0, bubbles: true });
      canvas.dispatchEvent(clickEvent);
    }
  };

  const simulatedADSToggle = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Toggle ADS with Right Mouse click simulation
      const eventType = document.pointerLockElement ? 'mousedown' : 'mouseup';
      const adsEvent = new MouseEvent(eventType, { button: 2, bubbles: true });
      canvas.dispatchEvent(adsEvent);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-40 select-none">
      {/* LEFT ZONE: Virtual Joystick area */}
      <div 
        className="absolute bottom-8 left-8 w-36 h-36 flex items-center justify-center pointer-events-auto rounded-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          ref={joystickBaseRef} 
          className="joystick-base w-24 h-24 relative flex items-center justify-center"
        >
          <div 
            className="joystick-knob w-10 h-10 absolute shadow-[0_0_12px_rgba(255,255,255,0.4)]"
            style={{
              left: `calc(50% + ${joystickPos.x}px)`,
              top: `calc(50% + ${joystickPos.y}px)`,
            }}
          />
        </div>
      </div>

      {/* RIGHT ZONE: Big Action Buttons */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 pointer-events-auto items-end">
        {/* Row 1: ADS + Jump */}
        <div className="flex gap-3">
          <button 
            onTouchStart={simulatedADSToggle}
            className="w-14 h-14 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 font-bold text-xs flex items-center justify-center active:scale-90 transition shadow-lg backdrop-blur-md"
          >
            ADS
          </button>
          <button 
            onTouchStart={() => triggerAction('Space', 'keydown')}
            onTouchEnd={() => triggerAction('Space', 'keyup')}
            className="w-14 h-14 rounded-full bg-slate-900/80 border border-slate-700/50 text-white font-bold text-xs flex items-center justify-center active:scale-90 transition shadow-lg backdrop-blur-md"
          >
            JUMP
          </button>
        </div>

        {/* Row 2: Reload + Slide */}
        <div className="flex gap-3">
          <button 
            onTouchStart={() => triggerAction('KeyR', 'keydown')}
            className="w-14 h-14 rounded-full bg-slate-900/80 border border-slate-700/50 text-white font-bold text-xs flex items-center justify-center active:scale-90 transition shadow-lg backdrop-blur-md"
          >
            LOAD
          </button>
          <button 
            onTouchStart={() => {
              triggerAction('ShiftLeft', 'keydown'); // Sprint
              triggerAction('KeyC', 'keydown');     // Slide
            }}
            onTouchEnd={() => {
              triggerAction('ShiftLeft', 'keyup');
              triggerAction('KeyC', 'keyup');
            }}
            className="w-14 h-14 rounded-full bg-slate-900/80 border border-slate-700/50 text-white font-bold text-xs flex items-center justify-center active:scale-90 transition shadow-lg backdrop-blur-md"
          >
            SLIDE
          </button>
        </div>

        {/* BIG TACTICAL FIRE BUTTON */}
        <button 
          onTouchStart={simulatedShoot}
          className="w-20 h-20 rounded-full bg-red-600/80 border-2 border-red-500 text-white font-black text-sm flex items-center justify-center active:scale-95 transition shadow-2xl backdrop-blur-md shadow-red-600/30"
        >
          FIRE
        </button>
      </div>

      {/* Swipe target label for Look Aim */}
      <div className="absolute inset-y-0 right-1/3 left-1/3 flex items-center justify-center pointer-events-none opacity-20">
        <span className="text-[10px] font-rajdhani tracking-[0.3em] uppercase">SWIPE TO AIM AREA</span>
      </div>
    </div>
  );
}
