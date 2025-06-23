import React, { useEffect, useRef } from 'react';

interface Wave {
  amplitude: number;
  frequency: number;
  phase: number;
  speed: number;
  color: string;
}

const LogoAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waves = useRef<Wave[]>([
    { amplitude: 16, frequency: 0.1, phase: 0, speed: 0.05, color: '#bbb' },
    { amplitude: 22, frequency: 0.12, phase: 0, speed: 0.07, color: '#ddd' },
    { amplitude: 28, frequency: 0.14, phase: 0, speed: 0.04, color: '#ffffff' }
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      waves.current.forEach(wave => {
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + 
                   wave.amplitude * Math.sin(wave.frequency * x + wave.phase);
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        wave.phase += wave.speed;
      });

      requestAnimationFrame(animate);
    };

    resizeCanvas();
    const animationId = requestAnimationFrame(animate);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

export default LogoAnimation;