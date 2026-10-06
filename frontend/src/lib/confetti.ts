/**
 * Party Popper Confetti Blast Utility
 * Pure HTML5 Canvas confetti explosion launcher for celebrations.
 */
export function triggerPartyPopper() {
  // Create fixed overlay canvas
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);

  const colors = [
    '#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', 
    '#f59e0b', '#ec4899', '#06b6d4', '#eab308', '#ffffff'
  ];

  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
    shape: 'rect' | 'circle';
  }> = [];

  function addBurst(originX: number, originY: number, count: number, velocityScale = 1) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI) - Math.PI / 2; // Upward arc
      const speed = (Math.random() * 16 + 8) * velocityScale;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed + (originX < width / 2 ? 4 : -4),
        vy: Math.sin(angle) * speed - (Math.random() * 8 + 4),
        size: Math.random() * 10 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      });
    }
  }

  // Wave 1: Left & Right Cannons
  addBurst(width * 0.1, height * 0.85, 80, 1.2);
  addBurst(width * 0.9, height * 0.85, 80, 1.2);
  addBurst(width * 0.5, height * 0.5, 50, 0.9);

  // Wave 2: Secondary Cannon Shot 300ms later
  setTimeout(() => {
    addBurst(width * 0.25, height * 0.75, 60, 1.1);
    addBurst(width * 0.75, height * 0.75, 60, 1.1);
  }, 300);

  let animationFrame: number;
  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    ctx!.clearRect(0, 0, width, height);

    let activeCount = 0;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.42; // gravity effect
      p.vx *= 0.985; // air resistance
      p.rotation += p.rotationSpeed;

      if (elapsed > 2500) {
        p.opacity -= 0.02;
      }

      if (p.opacity > 0 && p.y < height + 80) {
        activeCount++;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);
        ctx!.globalAlpha = Math.max(0, p.opacity);
        ctx!.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        } else {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx!.fill();
        }

        ctx!.restore();
      }
    });

    if (activeCount > 0 && elapsed < 5000) {
      animationFrame = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrame);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  }

  animationFrame = requestAnimationFrame(render);
}
