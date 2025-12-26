(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
  const stars = [];
  const STAR_COUNT = 120;
  let mouseX = 0, mouseY = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function rand(min, max){ return Math.random() * (max - min) + min }

  function initStars(){
    stars.length = 0;
    for(let i=0;i<STAR_COUNT;i++){
      stars.push({
        x: Math.random()*width,
        y: Math.random()*height,
        z: rand(0.2,1),
        r: rand(0.3,1.6),
        vx: rand(-0.02,0.02),
      });
    }
  }

  function draw(){
    ctx.clearRect(0,0,width,height);

    // subtle nebula glow
    const g = ctx.createLinearGradient(0,0,width, height);
    g.addColorStop(0, 'rgba(12,18,30,0.25)');
    g.addColorStop(1, 'rgba(8,10,20,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,width,height);

    // stars
    for(const s of stars){
      const px = s.x + (mouseX - width/2) * 0.02 * (1 - s.z);
      const py = s.y + (mouseY - height/2) * 0.02 * (1 - s.z);
      const alpha = 0.6 + 0.4*(1 - s.z);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, s.r * (1 + (1 - s.z)), 0, Math.PI*2);
      ctx.fill();
    }

    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for(let y=0;y<height;y+=4){
      ctx.fillRect(0,y,width,1);
    }
  }

  function step(){
    for(const s of stars){
      s.x += s.vx * (1 + (1 - s.z)*2);
      if(s.x < -10) s.x = width + 10;
      if(s.x > width + 10) s.x = -10;
    }
    draw();
    requestAnimationFrame(step);
  }

  window.addEventListener('resize', () => { resize(); initStars(); });
  window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('touchmove', (e)=>{ if(e.touches && e.touches[0]){ mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY } });

  // initialize
  resize();
  initStars();
  requestAnimationFrame(step);
})();
