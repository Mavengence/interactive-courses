// Animated semantic-galaxy backdrop for the hero.
// Points drift in clusters, connected by faint lines — like an embedding space.
(function(){
  function startGalaxy(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w, h;
    const clusters = [
      { cx: 0.18, cy: 0.30, hue: 55 },
      { cx: 0.82, cy: 0.28, hue: 40 },
      { cx: 0.50, cy: 0.70, hue: 45 },
      { cx: 0.25, cy: 0.78, hue: 50 },
      { cx: 0.75, cy: 0.80, hue: 35 },
    ];
    const points = [];
    clusters.forEach((c) => {
      for (let i=0; i<14; i++) {
        points.push({
          cluster: c,
          x: c.cx + (Math.random()-0.5)*0.18,
          y: c.cy + (Math.random()-0.5)*0.18,
          vx: (Math.random()-0.5)*0.00008,
          vy: (Math.random()-0.5)*0.00008,
          r: 1.5 + Math.random()*1.8,
          phase: Math.random()*Math.PI*2,
        });
      }
    });
    // Bridge points between clusters
    for (let i=0; i<10; i++) {
      points.push({
        cluster: { hue: 50 },
        x: Math.random(), y: Math.random(),
        vx: (Math.random()-0.5)*0.00012, vy: (Math.random()-0.5)*0.00012,
        r: 1 + Math.random()*1.2,
        phase: Math.random()*Math.PI*2,
      });
    }

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w*dpr; canvas.height = h*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    window.addEventListener('resize', resize);
    resize();

    const reduceMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let t0 = performance.now();
    function frame(t) {
      const dt = t - t0; t0 = t;
      ctx.clearRect(0,0,w,h);

      // Soft radial wash
      const g = ctx.createRadialGradient(w*0.5, h*0.35, 0, w*0.5, h*0.35, w*0.7);
      g.addColorStop(0, 'oklch(0.95 0.04 75 / 0.5)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0,0,w,h);

      // Update points
      points.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.phase += 0.001 * dt;
        // Gentle pull to cluster centre
        if (p.cluster.cx != null) {
          p.x += (p.cluster.cx - p.x) * 0.0004;
          p.y += (p.cluster.cy - p.y) * 0.0004;
        } else {
          if (p.x<0||p.x>1) p.vx*=-1;
          if (p.y<0||p.y>1) p.vy*=-1;
        }
      });

      // Draw connections within cluster (soft lines)
      ctx.lineWidth = 0.6;
      for (let i=0; i<points.length; i++) {
        for (let j=i+1; j<points.length; j++) {
          const a = points[i], b = points[j];
          if (a.cluster !== b.cluster) continue;
          const dx = (a.x-b.x)*w, dy = (a.y-b.y)*h;
          const d = Math.sqrt(dx*dx+dy*dy);
          if (d < 110) {
            const alpha = (1 - d/110) * 0.14;
            ctx.strokeStyle = `oklch(0.65 0.1 ${a.cluster.hue} / ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x*w, a.y*h);
            ctx.lineTo(b.x*w, b.y*h);
            ctx.stroke();
          }
        }
      }

      // Draw points
      points.forEach(p => {
        const twinkle = 0.6 + Math.sin(p.phase)*0.4;
        ctx.fillStyle = `oklch(0.6 0.14 ${p.cluster.hue} / ${0.55*twinkle})`;
        ctx.beginPath();
        ctx.arc(p.x*w, p.y*h, p.r, 0, Math.PI*2);
        ctx.fill();
      });

      if (!reduceMotion) requestAnimationFrame(frame);
    }
    // Honor prefers-reduced-motion: render a single static frame, no RAF loop.
    requestAnimationFrame(frame);
  }
  window.startGalaxy = startGalaxy;
})();
