(function(){
  const map = [
    '###################',
    '#........#........#',
    '#.###.##.#.##.###.#',
    '#.................#',
    '#.###.#.###.#.###.#',
    '#.....#..#..#.....#',
    '#####.## # ##.#####',
    '    #.#     #.#    ',
    '#####.# ##  #.#####',
    '     .  #G#  .     ',
    '#####.# ### #.#####',
    '    #.#     #.#    ',
    '#####.# ### #.#####',
    '#........#........#',
    '#.###.##.#.##.###.#',
    '#...#.........#...#',
    '###.#.#.###.#.#.###',
    '#.....#..#..#.....#',
    '###################'
  ];

  const dirs = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 }
  };
  const ghostColors = ['#ef4444', '#22d3ee', '#f472b6', '#f59e0b'];
  const starts = [
    { x: 9, y: 8 },
    { x: 8, y: 9 },
    { x: 10, y: 9 },
    { x: 9, y: 10 }
  ];

  let canvas, ctx, scoreEl, livesEl, statusEl;
  let open = false;
  let raf = 0;
  let last = 0;
  let pellets = new Set();
  let pacman;
  let ghosts = [];
  let score = 0;
  let lives = 3;
  let state = 'ready';

  function key(x, y){ return x + ',' + y; }
  function isWall(x, y){
    if(y < 0 || y >= map.length || x < 0 || x >= map[0].length) return true;
    return map[y][x] === '#';
  }
  function canMove(ent, dir){
    return !isWall(ent.x + dir.x, ent.y + dir.y);
  }
  function opposite(a, b){
    return a && b && a.x + b.x === 0 && a.y + b.y === 0;
  }
  function dist(a, b){
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function initPellets(){
    pellets = new Set();
    for(let y = 0; y < map.length; y++){
      for(let x = 0; x < map[y].length; x++){
        if(map[y][x] === '.') pellets.add(key(x, y));
      }
    }
  }

  function resetActors(){
    pacman = { x: 9, y: 15, dir: dirs.left, next: dirs.left, tick: 0, mouth: 0 };
    ghosts = starts.map((p, i) => ({
      x: p.x,
      y: p.y,
      dir: dirs.left,
      tick: 0,
      color: ghostColors[i],
      modeOffset: i * 11
    }));
  }

  function newGame(){
    score = 0;
    lives = 3;
    state = 'playing';
    initPellets();
    resetActors();
    updateHud();
    setStatus('Flechas o WASD para moverte.');
  }

  function updateHud(){
    if(scoreEl) scoreEl.textContent = score;
    if(livesEl) livesEl.textContent = lives;
  }

  function setStatus(text){
    if(statusEl) statusEl.textContent = text;
  }

  function moveEntity(ent){
    if(ent.next && canMove(ent, ent.next)) ent.dir = ent.next;
    if(ent.dir && canMove(ent, ent.dir)){
      ent.x += ent.dir.x;
      ent.y += ent.dir.y;
    }
  }

  function chooseGhostDir(g, index){
    const options = Object.values(dirs).filter(d => canMove(g, d) && !opposite(d, g.dir));
    const fallback = Object.values(dirs).filter(d => canMove(g, d));
    const candidates = options.length ? options : fallback;
    if(!candidates.length) return g.dir;

    const scatter = ((score + g.modeOffset) % 80) < 18;
    if(scatter && Math.random() < 0.45) return candidates[Math.floor(Math.random() * candidates.length)];

    const target = index === 0 ? pacman : {
      x: pacman.x + pacman.dir.x * (index + 1),
      y: pacman.y + pacman.dir.y * (index + 1)
    };
    return candidates.slice().sort((a, b) => {
      const aa = { x: g.x + a.x, y: g.y + a.y };
      const bb = { x: g.x + b.x, y: g.y + b.y };
      return dist(aa, target) - dist(bb, target);
    })[0];
  }

  function step(dt){
    if(state !== 'playing') return;
    pacman.tick += dt;
    if(pacman.tick >= 105){
      pacman.tick = 0;
      moveEntity(pacman);
      const pelletKey = key(pacman.x, pacman.y);
      if(pellets.delete(pelletKey)){
        score += 10;
        updateHud();
        if(!pellets.size){
          state = 'won';
          setStatus('Has limpiado el taller. Reinicia para otra partida.');
        }
      }
    }

    ghosts.forEach((g, i) => {
      g.tick += dt;
      if(g.tick >= 145){
        g.tick = 0;
        g.next = chooseGhostDir(g, i);
        moveEntity(g);
      }
    });

    if(ghosts.some(g => g.x === pacman.x && g.y === pacman.y)){
      lives -= 1;
      updateHud();
      if(lives <= 0){
        state = 'lost';
        setStatus('Te han pillado los 4 fantasmas. Reinicia para jugar otra vez.');
      } else {
        setStatus('Te han pillado. Sigue, quedan vidas.');
        resetActors();
      }
    }
  }

  function drawWall(x, y, t){
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(x * t + 1, y * t + 1, t - 2, t - 2);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x * t + 4, y * t + 4, t - 8, t - 8);
  }

  function drawPacman(t){
    const cx = (pacman.x + 0.5) * t;
    const cy = (pacman.y + 0.5) * t;
    const angle = Math.atan2(pacman.dir.y, pacman.dir.x);
    pacman.mouth = (pacman.mouth + 0.15) % Math.PI;
    const bite = 0.25 + Math.abs(Math.sin(pacman.mouth)) * 0.35;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, t * 0.42, angle + bite, angle + Math.PI * 2 - bite);
    ctx.closePath();
    ctx.fill();
  }

  function drawGhost(g, t){
    const x = g.x * t;
    const y = g.y * t;
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(x + t / 2, y + t * 0.44, t * 0.34, Math.PI, 0);
    ctx.lineTo(x + t * 0.84, y + t * 0.82);
    ctx.lineTo(x + t * 0.68, y + t * 0.70);
    ctx.lineTo(x + t * 0.52, y + t * 0.82);
    ctx.lineTo(x + t * 0.36, y + t * 0.70);
    ctx.lineTo(x + t * 0.18, y + t * 0.82);
    ctx.lineTo(x + t * 0.16, y + t * 0.44);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + t * 0.38, y + t * 0.43, t * 0.08, 0, Math.PI * 2);
    ctx.arc(x + t * 0.62, y + t * 0.43, t * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(x + t * 0.40, y + t * 0.44, t * 0.035, 0, Math.PI * 2);
    ctx.arc(x + t * 0.64, y + t * 0.44, t * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(){
    if(!ctx) return;
    const cols = map[0].length;
    const rows = map.length;
    const t = canvas.width / cols;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(let y = 0; y < rows; y++){
      for(let x = 0; x < cols; x++){
        if(map[y][x] === '#') drawWall(x, y, t);
      }
    }

    ctx.fillStyle = '#f8fafc';
    pellets.forEach(p => {
      const parts = p.split(',');
      const x = Number(parts[0]);
      const y = Number(parts[1]);
      ctx.beginPath();
      ctx.arc((x + 0.5) * t, (y + 0.5) * t, t * 0.075, 0, Math.PI * 2);
      ctx.fill();
    });

    drawPacman(t);
    ghosts.forEach(g => drawGhost(g, t));
  }

  function loop(ts){
    if(!open) return;
    const dt = last ? Math.min(40, ts - last) : 16;
    last = ts;
    step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function setDirection(name){
    if(!dirs[name]) return;
    if(state !== 'playing') newGame();
    pacman.next = dirs[name];
  }

  window.openDeptGame = function(){
    const modal = document.getElementById('mDeptGame');
    if(!modal) return;
    canvas = document.getElementById('deptGameCanvas');
    ctx = canvas.getContext('2d');
    scoreEl = document.getElementById('deptGameScore');
    livesEl = document.getElementById('deptGameLives');
    statusEl = document.getElementById('deptGameStatus');
    modal.classList.add('open');
    open = true;
    last = 0;
    newGame();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  };

  window.closeDeptGame = function(){
    const modal = document.getElementById('mDeptGame');
    if(modal) modal.classList.remove('open');
    open = false;
    cancelAnimationFrame(raf);
  };

  window.restartDeptGame = function(){
    newGame();
  };

  window.deptGameMove = function(name){
    setDirection(name);
  };

  window.addEventListener('keydown', e => {
    if(!open) return;
    const mapKey = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
      a: 'left',
      d: 'right',
      w: 'up',
      s: 'down'
    };
    const dir = mapKey[e.key];
    if(dir){
      e.preventDefault();
      setDirection(dir);
    } else if(e.key === 'Escape'){
      window.closeDeptGame();
    }
  });
})();
