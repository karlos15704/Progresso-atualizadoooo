import React, { useEffect, useRef } from "react";

export const Canvas3DEducation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse tilt dynamics
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = (e.clientX - rect.left - width / 2) / (width / 2);
      targetMouseY = (e.clientY - rect.top - height / 2) / (height / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Generate Floating 3D Node Data
    const nodeCount = 45;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: (Math.random() - 0.5) * 350,
      y: (Math.random() - 0.5) * 350,
      z: (Math.random() - 0.5) * 350,
      size: Math.random() * 3.5 + 1.5,
      color: Math.random() > 0.5 ? "#3b82f6" : Math.random() > 0.3 ? "#6366f1" : "#06b6d4",
      speed: (Math.random() - 0.5) * 0.015,
    }));

    // Generate Data Rings
    let angleX = 0;
    let angleY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      angleY += 0.008 + mouseX * 0.01;
      angleX += 0.004 + mouseY * 0.01;

      const centerX = width / 2;
      const centerY = height / 2;
      const fov = 400;

      // Project and draw connecting lines between close nodes
      const projectedNodes: { x: number; y: number; z: number; size: number; color: string }[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        // 3D Rotation Y
        let cosY = Math.cos(angleY);
        let sinY = Math.sin(angleY);
        let x1 = n.x * cosY - n.z * sinY;
        let z1 = n.z * cosY + n.x * sinY;

        // 3D Rotation X
        let cosX = Math.cos(angleX);
        let sinX = Math.sin(angleX);
        let y1 = n.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + n.y * sinX;

        // Depth projection
        const scale = fov / (fov + z2 + 250);
        const px = centerX + x1 * scale;
        const py = centerY + y1 * scale;

        projectedNodes.push({ x: px, y: py, z: z2, size: n.size * scale, color: n.color });
      }

      // Draw Connections
      ctx.lineWidth = 0.6;
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p1 = projectedNodes[i];
          const p2 = projectedNodes[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 95) {
            const alpha = (1 - dist / 95) * 0.35;
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw Central Glowing Tech Orb
      const orbRadius = 55 + Math.sin(Date.now() * 0.002) * 5;
      const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, orbRadius * 1.8);
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.9)");
      gradient.addColorStop(0.4, "rgba(99, 102, 241, 0.4)");
      gradient.addColorStop(0.8, "rgba(6, 182, 212, 0.1)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Draw Orbital Data Ring
      ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, orbRadius * 1.6, orbRadius * 0.5, angleY * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Nodes
      for (let i = 0; i < projectedNodes.length; i++) {
        const p = projectedNodes[i];
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full block rounded-3xl" />
      
      {/* Floating Glassmorphic Badges Overlay on Top of 3D Canvas */}
      <div className="absolute top-6 left-6 px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl flex items-center gap-2.5 animate-bounce" style={{ animationDuration: '4s' }}>
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
        <span className="text-[11px] font-bold text-slate-200">IA OMR em Tempo Real</span>
      </div>

      <div className="absolute bottom-8 right-6 px-4 py-2.5 rounded-2xl bg-slate-900/85 border border-indigo-500/30 backdrop-blur-md shadow-2xl shadow-indigo-950/60 flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs">
          ⚡ 99.8%
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none">Precisão Global</span>
          <span className="text-[11px] font-semibold text-white">Infraestrutura VPS Dedicada</span>
        </div>
      </div>
    </div>
  );
};
