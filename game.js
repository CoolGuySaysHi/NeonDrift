// NEON DRIFT v3 — Three.js r128 + Bloom post-processing

'use strict';

// ─── STATE ───────────────────────────────────────────────────────────────────
const STATE = {
  coins: 500, selectedCar: 0, ownedCars: [0], completedChallenges: [],
  inGame: false, paused: false, cameraMode: 0,
  driftScore: 0, driftMult: 1, driftActive: false, driftTimer: 0, totalDrift: 0,
  missionProgress: 0, currentMission: 0, zonesVisited: new Set(),
  distanceTravelled: 0, topSpeed: 0, airTime: 0, airTimer: 0,
  dayTime: 0.50, daySpeed: 0.004,  // 0.5 = noon
};
function saveState() { try { localStorage.setItem('nd3', JSON.stringify({coins:STATE.coins,selectedCar:STATE.selectedCar,ownedCars:STATE.ownedCars,completedChallenges:STATE.completedChallenges})); } catch(e){} }
function loadState() { try { const s=JSON.parse(localStorage.getItem('nd3')||'{}'); if(s.coins!==undefined)STATE.coins=s.coins; if(s.selectedCar!==undefined)STATE.selectedCar=s.selectedCar; if(s.ownedCars)STATE.ownedCars=s.ownedCars; if(s.completedChallenges)STATE.completedChallenges=s.completedChallenges; } catch(e){} }

// ─── CAR DEFINITIONS ─────────────────────────────────────────────────────────
const CARS = [
  { id: 0,  name:'VIPER-X',    class:'STREET',   color:0x00c8ff, price:0,    maxSpeed:28, accel:18, brakeStr:25, turnSpeed:2.2, grip:0.88, driftFactor:0.18, stats:{speed:60,accel:60,handling:70,drift:65} },
  { id: 1,  name:'PHANTOM GT', class:'SPORT',    color:0xff00cc, price:800,  maxSpeed:38, accel:28, brakeStr:32, turnSpeed:2.4, grip:0.90, driftFactor:0.20, stats:{speed:85,accel:80,handling:80,drift:70} },
  { id: 2,  name:'TERRA HAWK', class:'OFF-ROAD', color:0xffb300, price:600,  maxSpeed:24, accel:15, brakeStr:22, turnSpeed:2.0, grip:0.92, driftFactor:0.12, stats:{speed:55,accel:55,handling:88,drift:50} },
  { id: 3,  name:'NOVA-7',     class:'HYPERCAR', color:0x00ff88, price:2000, maxSpeed:58, accel:48, brakeStr:40, turnSpeed:2.2, grip:0.86, driftFactor:0.22, stats:{speed:100,accel:100,handling:78,drift:82} },
  { id: 4,  name:'STEEL WOLF', class:'MUSCLE',   color:0xff4400, price:1200, maxSpeed:42, accel:30, brakeStr:20, turnSpeed:1.8, grip:0.80, driftFactor:0.30, stats:{speed:95,accel:85,handling:62,drift:88} },
  { id: 5,  name:'WRAITH',     class:'STEALTH',  color:0x9900ff, price:3500, maxSpeed:50, accel:40, brakeStr:38, turnSpeed:2.3, grip:0.89, driftFactor:0.24, stats:{speed:95,accel:95,handling:85,drift:78} },
  { id: 6,  name:'CITY RUNNER',class:'STREET',   color:0xff3355, price:400,  maxSpeed:22, accel:16, brakeStr:28, turnSpeed:2.5, grip:0.91, driftFactor:0.16, stats:{speed:50,accel:58,handling:75,drift:60} },
  { id: 7,  name:'ECLIPSE-R',  class:'SPORT',    color:0x00ffee, price:1500, maxSpeed:44, accel:34, brakeStr:35, turnSpeed:2.3, grip:0.89, driftFactor:0.21, stats:{speed:100,accel:88,handling:82,drift:74} },
  { id: 8,  name:'BRUTUS',     class:'MUSCLE',   color:0x333333, price:900,  maxSpeed:39, accel:26, brakeStr:18, turnSpeed:1.7, grip:0.78, driftFactor:0.32, stats:{speed:88,accel:78,handling:58,drift:90} },
  { id: 9,  name:'SPECTRE',    class:'HYPERCAR', color:0xffffff, price:4000, maxSpeed:62, accel:52, brakeStr:42, turnSpeed:2.1, grip:0.87, driftFactor:0.23, stats:{speed:100,accel:100,handling:80,drift:85} },
  { id:10,  name:'DUNE KING',  class:'OFF-ROAD', color:0x44bb44, price:700,  maxSpeed:26, accel:17, brakeStr:23, turnSpeed:2.1, grip:0.93, driftFactor:0.11, stats:{speed:60,accel:57,handling:92,drift:55} },
  { id:11,  name:'KATANA',     class:'SPORT',    color:0xff6600, price:2500, maxSpeed:48, accel:38, brakeStr:37, turnSpeed:2.4, grip:0.90, driftFactor:0.22, stats:{speed:100,accel:92,handling:88,drift:80} },
];

const CHALLENGES = [
  { id:0, icon:'🌀', name:'DRIFT KING',      desc:'Reach 5000 drift points',    reward:300,  type:'drift',    target:5000 },
  { id:1, icon:'⚡', name:'LIGHTNING RUN',   desc:'Hit 100 km/h',               reward:200,  type:'speed',    target:100  },
  { id:2, icon:'✈️', name:'AIR TIME',        desc:'3 seconds airborne',         reward:400,  type:'air',      target:3    },
  { id:3, icon:'🗺️', name:'EXPLORER',        desc:'Visit 5 zones',              reward:250,  type:'explore',  target:5    },
  { id:4, icon:'🏁', name:'DISTANCE DRIVER', desc:'Drive 5km total',            reward:500,  type:'distance', target:5000 },
  { id:5, icon:'🔥', name:'HYPER DRIFT',     desc:'Reach x5 drift multiplier',  reward:600,  type:'multdrift',target:5    },
  { id:6, icon:'🚀', name:'TOP SPEED',       desc:'Hit 200 km/h',               reward:1000, type:'topspeed', target:200  },
];

const MISSIONS = [
  { title:'First Drive',   desc:'Drive and explore',       type:'explore', target:1,    reward:50  },
  { title:'Zone Scout',    desc:'Visit 3 different zones', type:'explore', target:3,    reward:150 },
  { title:'Speed Run',     desc:'Hit 80 km/h',             type:'speed',   target:80,   reward:100 },
  { title:'Drift Session', desc:'Score 1000 drift pts',    type:'drift',   target:1000, reward:200 },
  { title:'Long Haul',     desc:'Drive 2km',               type:'distance',target:2000, reward:300 },
  { title:'Sky High',      desc:'Get 2s airtime',          type:'air',     target:2,    reward:400 },
  { title:'Drift Master',  desc:'Score 3000 drift pts',    type:'drift',   target:3000, reward:500 },
];

const ZONES = [
  { name:'NEON CITY CENTRE', cx:0,    cz:0,    r:90  },
  { name:'HARBOUR DISTRICT', cx:500,  cz:-400, r:120 },
  { name:'HIGHLAND PASS',    cx:-280, cz:220,  r:100 },
  { name:'INDUSTRIAL ZONE',  cx:360,  cz:420,  r:120 },
  { name:'TUNNEL NETWORK',   cx:-400, cz:-200, r:90  },
  { name:'EAST HIGHWAY',     cx:530,  cz:0,    r:130 },
  { name:'DRIFT PARK',       cx:-200, cz:-480, r:90  },
];

// ─── RACE DEFINITIONS ────────────────────────────────────────────────────────
// Each race: a series of checkpoint [x,z] positions + reward + name
const RACES = [
  { id:0, name:'CITY SPRINT',    reward:400,  par:60,  checkpoints:[[0,-200],[150,-300],[300,-200],[300,0],[150,100],[0,0]] },
  { id:1, name:'HARBOUR RUN',    reward:600,  par:90,  checkpoints:[[300,-200],[450,-300],[550,-400],[500,-250],[350,-150],[200,-100]] },
  { id:2, name:'RING ROAD',      reward:800,  par:120, checkpoints:[[300,-350],[350,0],[300,350],[-350,350],[-350,-350],[0,-350]] },
  { id:3, name:'DRIFT CIRCUIT',  reward:500,  par:80,  checkpoints:[[-100,-400],[-300,-400],[-300,-560],[-100,-560],[-100,-400]] },
  { id:4, name:'HIGHWAY BLAST',  reward:1000, par:45,  checkpoints:[[0,0],[200,0],[400,0],[600,0],[700,-50],[600,-100]] },
];

// Race state
const RACE = {
  active: false,
  raceId: -1,
  checkpoint: 0,
  startTime: 0,
  elapsed: 0,
  bestTimes: {},
};

// ─── NITRO STATE ─────────────────────────────────────────────────────────────
const NITRO = {
  charge: 1.0,      // 0-1, full by default
  active: false,
  cooldown: false,   // can't reactivate until fully re-charged after depletion
  BOOST_MULT: 1.9,   // speed multiplier while active
  DRAIN_RATE: 0.38,  // charge lost per second while active
  FILL_RATE:  0.10,  // charge gained per second while not active (drift fills faster)
};

// ─── WANTED STATE ────────────────────────────────────────────────────────────
const WANTED = {
  level: 0,          // 0-5 stars
  meter: 0.0,        // 0-1 fill within current level
  active: false,
  cooling: false,    // evading — meter draining
  coolTimer: 0,      // seconds since last offence
  COOL_NEEDED: 8,    // seconds hiding needed to drop a level
  cops: [],          // array of cop car objects
  policeFlashEl: null,
  lastOffenceSpeed: 0,
};

// ─── TRAFFIC STATE ────────────────────────────────────────────────────────────
const TRAFFIC = {
  cars: [],          // array of traffic car objects
  MAX_CARS: 12,
  spawnTimer: 0,
  SPAWN_INTERVAL: 3,
};

// ─── PHYSICS STATE ───────────────────────────────────────────────────────────
const carPhysics = {
  pos: new THREE.Vector3(0,0,0), vel: new THREE.Vector3(),
  heading:0, angularVel:0, onGround:true, verticalVel:0, groundY:0,
};

// ─── INPUT ───────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => { keys[e.code]=true;  handleKeyDown(e); });
window.addEventListener('keyup',   e => { keys[e.code]=false; });

// ─── WORLD DATA ──────────────────────────────────────────────────────────────
const neonColors = [0x00f5ff,0xff00cc,0x00ff88,0xffe600,0x8800ff];

const ROAD_SEGMENTS = [
  [-350,-350, 350,-350, 22], [ 350,-350, 350,350, 22],
  [ 350, 350,-350, 350, 22], [-350, 350,-350,-350, 22],
  [-350,-350, 0,0, 16], [350,-350, 0,0, 16],
  [350,350, 0,0, 16], [-350,350, 0,0, 16],
  [350,-350, 550,-450, 14], [550,-450, 700,-350, 14],
  [350,350, 350,550, 14], [350,550, 200,700, 14],
  [-350,-200,-550,-200, 14], [-550,-200,-700,-350, 14],
  [-100,-400,-300,-400, 14], [-300,-400,-300,-560, 14],
  [-300,-560,-100,-560, 14], [-100,-560,-100,-400, 14],
  [-350,200,-700,200, 14], [100,700,350,700, 14],
  [350,0, 720,0, 18],
];

const BUILDINGS_DATA = [
  [-60,-60,30,30,80,0x1a2535],[-30,-70,20,20,60,0x1a2535],[50,-50,25,35,100,0x151e2b],[70,-70,20,20,50,0x1a2535],
  [-70,50,35,25,90,0x151e2b],[60,60,30,30,75,0x1a2535],[-50,-90,20,40,55,0x1a2535],[90,20,25,20,65,0x151e2b],
  [30,30,20,20,45,0x1a2535],[-80,-30,25,15,70,0x1a2535],
  [480,-380,40,30,40,0x1a2535],[530,-360,25,25,30,0x1a2535],[560,-420,30,40,50,0x151e2b],[620,-380,35,35,35,0x1a2535],
  [320,420,50,40,25,0x141414],[400,480,40,50,20,0x141414],[260,500,60,30,30,0x141414],[450,430,35,35,40,0x141414],[370,560,55,45,22,0x141414],
  [-450,-250,30,25,45,0x1a2535],[-500,-200,20,20,35,0x151e2b],[-480,-300,35,30,55,0x1a2535],[-560,-280,25,25,40,0x1a2535],
  [-200,100,30,25,45,0x1a2535],[-180,150,20,20,35,0x151e2b],[150,-100,25,30,55,0x1a2535],[130,-140,20,25,40,0x1a2535],
  [-100,200,35,30,65,0x151e2b],[-130,220,20,20,50,0x1a2535],[200,200,30,30,50,0x1a2535],[250,-200,25,25,60,0x151e2b],
  [-200,-200,35,25,55,0x1a2535],[180,300,20,30,42,0x1a2535],
  [100,-500,30,30,50,0x1a2535],[-100,-520,25,25,60,0x1a2535],[200,-550,35,20,45,0x151e2b],[-200,-480,20,30,35,0x1a2535],
  [-500,150,45,30,30,0x141e28],[-580,220,30,30,25,0x141e28],[-530,300,40,25,20,0x141e28],
  [150,560,35,25,40,0x1a2535],[280,580,25,30,35,0x1a2535],[350,520,30,30,45,0x151e2b],
];

const RAMPS = [
  {cx:0,cz:-300,rx:20,rz:45,h:8,angle:0}, {cx:300,cz:-300,rx:30,rz:18,h:6,angle:Math.PI/4},
  {cx:-250,cz:150,rx:18,rz:40,h:10,angle:-0.3}, {cx:150,cz:500,rx:25,rz:22,h:7,angle:0.5},
  {cx:-150,cz:-480,rx:30,rz:18,h:5,angle:0}, {cx:500,cz:0,rx:20,rz:30,h:6,angle:Math.PI/2},
];

let buildingAABBs = [];

// ─── THREE.JS GLOBALS ─────────────────────────────────────────────────────────
let renderer, scene, camera, composer;
let ambientLight, sunLight, fillLight, starsPoints;
let carMesh, carWheels = [];
let running = false, animId = null, prevTime = 0;
let dayNightLabel = null;
let _camPos, _camTgt;
let cinematicAngle = 0;

// ─── INIT ─────────────────────────────────────────────────────────────────────
function initThree() {
  const canvas = document.getElementById('game-canvas');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x6aa8d4, 200, 650);
  scene.background = new THREE.Color(0x6aa8d4);

  camera = new THREE.PerspectiveCamera(62, window.innerWidth/window.innerHeight, 0.5, 800);

  // ── HDR environment for reflections (procedural) ──
  // No PMREMGenerator needed for Lambert/Phong materials

  // Bloom removed for performance — use emissive materials for glow effect instead

  // Point camera at origin from above-behind — world will be visible immediately
  camera.position.set(0, 4.5, -10);
  camera.lookAt(0, 1.5, 6);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Build a simple RoomEnvironment-style scene for reflections
function buildEnvScene() {
  const envS = new THREE.Scene();
  // Surrounding gradient panels to fake a sky/ground env
  const cols = [0x0044aa, 0x002266, 0x111133, 0x001144, 0xff6622, 0x220011];
  const dirs = [
    [0,0,-50,0,0,0], [0,0,50,0,Math.PI,0],
    [-50,0,0,0,Math.PI/2,0], [50,0,0,0,-Math.PI/2,0],
    [0,50,0,-Math.PI/2,0,0], [0,-5,0,Math.PI/2,0,0],
  ];
  dirs.forEach(([x,y,z,rx,ry,rz], i) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(100,100),
      new THREE.MeshBasicMaterial({ color: cols[i], side: THREE.BackSide })
    );
    m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
    envS.add(m);
  });
  return envS;
}

// ─── WORLD ───────────────────────────────────────────────────────────────────
function buildWorld() {
  // ── Lights ──
  ambientLight = new THREE.AmbientLight(0xaabbcc, 1.2);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xfff0dd, 1.2);
  sunLight.position.set(200,400,100);
  sunLight.castShadow = false;  // disable shadow for performance
  sunLight.shadow.mapSize.set(1024,1024);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far  = 400;  // only shadow near camera
  sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -200;
  sunLight.shadow.camera.right = sunLight.shadow.camera.top = 200;
  scene.add(sunLight);

  fillLight = new THREE.DirectionalLight(0x4488ff, 0.6);
  fillLight.position.set(200,100,200);
  scene.add(fillLight);

  // Minimal accent lights
  for (let i=0;i<4;i++) {
    const pl = new THREE.PointLight(neonColors[i%neonColors.length], 0.8, 50);
    pl.position.set((Math.random()-.5)*600, 3, (Math.random()-.5)*600);
    scene.add(pl);
  }

  // ── Ground ──
  // Use a canvas texture for the road surface to get visible tarmac markings
  const groundMat = new THREE.MeshLambertMaterial({color:0x3a4455});
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000,2000,1,1), groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = false;  // no shadows on ground for perf
  scene.add(ground);

  buildRoads();
  buildBuildings();
  buildRamps();
  buildStars();
  buildDecor();
}

function makeGroundTexture() {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2a3444';
  ctx.fillRect(0,0,s,s);
  // subtle noise
  for (let i=0;i<1000;i++) {
    const v = Math.floor(Math.random()*20);
    ctx.fillStyle = `rgba(${v+20},${v+25},${v+35},0.3)`;
    ctx.fillRect(Math.random()*s, Math.random()*s, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(60,60);
  return tex;
}

function makeRoadTexture() {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  // Dark asphalt
  ctx.fillStyle = '#323c4a';
  ctx.fillRect(0,0,s,s);
  // noise
  for (let i=0;i<3000;i++) {
    const v = Math.floor(Math.random()*15);
    ctx.fillStyle = `rgba(${v+25},${v+28},${v+36},0.5)`;
    ctx.fillRect(Math.random()*s, Math.random()*s, 3, 3);
  }
  // white centre dashes
  ctx.fillStyle = '#ffffff';
  for (let y=0;y<s;y+=80) { ctx.fillRect(s/2-2, y, 4, 40); }
  // yellow edge lines
  ctx.fillStyle = '#ffee00';
  ctx.fillRect(8, 0, 5, s);
  ctx.fillRect(s-13, 0, 5, s);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildRoads() {
  // Simple solid-colour road — texture cloning unreliable, this always works
  const roadMat = new THREE.MeshLambertMaterial({color:0x2a3040});
  const lineMat = new THREE.MeshLambertMaterial({color:0xffffff, emissive:0xffffff, emissiveIntensity:0.1});

  ROAD_SEGMENTS.forEach(([x1,z1,x2,z2,w]) => {
    const dx=x2-x1, dz=z2-z1;
    const len=Math.sqrt(dx*dx+dz*dz);
    const angle=Math.atan2(dx,dz);
    const cx=(x1+x2)/2, cz=(z1+z2)/2;

    const mat = roadMat;  // shared material, solid colour

    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
    road.rotation.set(-Math.PI/2, 0, -angle);
    road.position.set(cx, 0.03, cz);
    road.receiveShadow = true;
    scene.add(road);

    // Edge lines removed for performance

    // Streetlights
    const lampCount = Math.floor(len/50);
    for (let i=0;i<=lampCount;i++) {
      const t2=i/Math.max(lampCount,1);
      const lx=x1+dx*t2 + (-dz/len)*(w/2+3);
      const lz=z1+dz*t2 + (dx/len)*(w/2+3);
      buildLamp(lx, lz, neonColors[i%neonColors.length]);
    }
  });
}

// Shared lamp materials (created once)
const _lampPostMat = new THREE.MeshLambertMaterial({color:0x223344});
const _lampHeadMats = {};
function buildLamp(x, z, col) {
  const key = col.toString(16);
  if (!_lampHeadMats[key]) {
    _lampHeadMats[key] = new THREE.MeshLambertMaterial({color:col,emissive:col,emissiveIntensity:0.8});
  }
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.14,7,6), _lampPostMat);
  post.position.set(x,3.5,z);
  scene.add(post);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.25,0.8), _lampHeadMats[key]);
  head.position.set(x,7.2,z);
  scene.add(head);
  // NO PointLight per lamp — too expensive. Emissive glow is enough.
}

function buildBuildings() {
  // Pre-build 3 shared facade textures — one per colour family
  const _facadeTex = [
    makeBuildingTexture(0x1a2535),
    makeBuildingTexture(0x151e2b),
    makeBuildingTexture(0x141414),
  ];
  const _roofMat = new THREE.MeshLambertMaterial({color:0x0a0f1a});
  const _facadeMats = _facadeTex.map(tex => [
    new THREE.MeshLambertMaterial({map:tex}), // +x
    new THREE.MeshLambertMaterial({map:tex}), // -x
    _roofMat, _roofMat,                       // top/bottom
    new THREE.MeshLambertMaterial({map:tex}), // +z
    new THREE.MeshLambertMaterial({map:tex}), // -z
  ]);
  // Shared accent materials
  const _accentMats = neonColors.map(c =>
    new THREE.MeshLambertMaterial({color:c,emissive:c,emissiveIntensity:0.3})
  );

  BUILDINGS_DATA.forEach(([x,z,w,d,h,col]) => {
    // Pick facade by colour
    const fi = col === 0x141414 ? 2 : col === 0x151e2b ? 1 : 0;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), _facadeMats[fi]);
    mesh.position.set(x,h/2,z);
    mesh.castShadow = false;  // buildings don't need shadows for perf
    mesh.receiveShadow = false;
    scene.add(mesh);

    const ai = Math.floor(Math.random()*_accentMats.length);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(w+0.3,0.4,d+0.3), _accentMats[ai]);
    accent.position.set(x,h+0.2,z);
    scene.add(accent);

    buildingAABBs.push({ minX:x-w/2, maxX:x+w/2, minZ:z-d/2, maxZ:z+d/2 });
  });
}

function makeBuildingTexture(baseCol) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const r = (baseCol>>16)&0xff, g=(baseCol>>8)&0xff, b=baseCol&0xff;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0,0,s,s);
  const cols2 = 4, rows2 = 6;
  const wx = s/cols2, wy = s/rows2;
  for (let row=0;row<rows2;row++) {
    for (let col=0;col<cols2;col++) {
      const lit = Math.random() > 0.35;
      if (lit) {
        const warm = Math.random() > 0.4;
        ctx.fillStyle = warm ? `rgba(255,240,180,0.85)` : `rgba(180,220,255,0.85)`;
      } else {
        ctx.fillStyle = `rgba(5,10,20,0.7)`;
      }
      ctx.fillRect(col*wx+2, row*wy+2, wx-4, wy-4);
    }
  }
  // vertical concrete seams
  ctx.fillStyle = `rgba(0,0,0,0.25)`;
  for (let col=1;col<cols2;col++) ctx.fillRect(col*wx-1,0,2,s);
  for (let row=1;row<rows2;row++) ctx.fillRect(0,row*wy-1,s,2);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function buildRamps() {
  const mat = new THREE.MeshLambertMaterial({color:0x252d3a});
  const stripMat = new THREE.MeshLambertMaterial({color:0xffe600,emissive:0xffe600,emissiveIntensity:0.3});
  RAMPS.forEach(r => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(r.rx*2,r.h,r.rz*2), mat);
    mesh.position.set(r.cx,r.h/2-0.5,r.cz);
    mesh.rotation.set(0.35,r.angle,0);
    mesh.castShadow = false; mesh.receiveShadow = false;
    scene.add(mesh);
    for (let i=0;i<3;i++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(r.rx*2,0.35), stripMat);
      strip.rotation.x = -Math.PI/2;
      strip.position.set(r.cx,r.h*0.02+0.1,r.cz-r.rz+(i/2)*r.rz);
      scene.add(strip);
    }
  });
}

function buildStars() {
  const positions = [];
  for (let i=0;i<1000;i++) {
    positions.push((Math.random()-.5)*2200, 80+Math.random()*500, (Math.random()-.5)*2200);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  starsPoints = new THREE.Points(geo, new THREE.PointsMaterial({color:0xffffff,size:0.6,sizeAttenuation:true}));
  scene.add(starsPoints);
}

function buildDecor() {
  // Elevated highway section
  const deckMat = new THREE.MeshLambertMaterial({color:0x1e2838});
  const pillarMat = new THREE.MeshLambertMaterial({color:0x1a2030});
  const deck = new THREE.Mesh(new THREE.BoxGeometry(380,1.2,22), deckMat);
  deck.position.set(530,14,0); deck.castShadow=true; scene.add(deck);
  for (let px=360;px<=720;px+=55) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.8,14,8), pillarMat);
    p.position.set(px,7,0); scene.add(p);
  }
  const rampUp = new THREE.Mesh(new THREE.BoxGeometry(80,14,22), deckMat);
  rampUp.position.set(350,7,0); rampUp.rotation.z=-0.35; scene.add(rampUp);

  // Neon arches over roads
  const archMat = new THREE.MeshLambertMaterial({color:0x00f5ff,emissive:0x00f5ff,emissiveIntensity:0.8});
  [[0,-350],[350,0],[0,350],[-350,0]].forEach(([ax,az]) => {
    for (const side of [-1,1]) {
      const pill=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,16,8),archMat);
      pill.position.set(ax+side*13,8,az); scene.add(pill);
    }
    const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,27,8),archMat);
    bar.rotation.z=Math.PI/2; bar.position.set(ax,16,az); scene.add(bar);
  });

  // Harbour water
  const waterMat = new THREE.MeshLambertMaterial({color:0x041830,transparent:true,opacity:0.88});
  const water = new THREE.Mesh(new THREE.PlaneGeometry(280,200), waterMat);
  water.rotation.x=-Math.PI/2; water.position.set(600,-0.3,-450); scene.add(water);

  // Harbour cranes
  buildCrane(530,-400); buildCrane(620,-430);

  // Race start markers (glowing rings on the road)
  RACES.forEach((race, ri) => {
    const [sx, sz] = race.checkpoints[0];
    // Big glowing ring on ground
    const ringGeo = new THREE.RingGeometry(4, 5, 32);
    const ringMat = new THREE.MeshLambertMaterial({
      color: 0xffe600, emissive: 0xffe600, emissiveIntensity: 0.6,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI/2;
    ring.position.set(sx, 0.06, sz);
    scene.add(ring);
    // Vertical banner pillars
    for (const s of [-1,1]) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2,0.2,6,8),
        new THREE.MeshLambertMaterial({color:0xffe600,emissive:0xffe600,emissiveIntensity:0.4})
      );
      pillar.position.set(sx + s*5, 3, sz);
      scene.add(pillar);
    }
    // Floating race name label stored for HUD
  });
}

function buildCrane(cx,cz) {
  const mat=new THREE.MeshLambertMaterial({color:0x1a2535});
  const t=new THREE.Mesh(new THREE.BoxGeometry(3,55,3),mat); t.position.set(cx,27.5,cz); scene.add(t);
  const b=new THREE.Mesh(new THREE.BoxGeometry(50,2,2),mat); b.position.set(cx+25,55,cz); scene.add(b);
  const wMat=new THREE.MeshLambertMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:1.5});
  const w=new THREE.Mesh(new THREE.SphereGeometry(0.6,6,6),wMat); w.position.set(cx+50,56,cz); scene.add(w);
}

// ─── CAR BUILDER ─────────────────────────────────────────────────────────────
// Real GLB model embedded as base64 — no server needed.
// Paint colour is swapped per car by traversing materials after load.

const CAR_GLB_B64 = "Z2xURgIAAAA4MgIAJOAAAEpTT057ImFjY2Vzc29ycyI6W3siYnVmZmVyVmlldyI6MCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo0OTAsInR5cGUiOiJWRUMzIiwibWF4IjpbMC45MzAwMDAwMDcxNTI1NTc0LDAuODk5OTk5OTc2MTU4MTQyMSwyLjE3NDk5OTk1MjMxNjI4NF0sIm1pbiI6Wy0wLjkzMDAwMDAwNzE1MjU1NzQsMC4wMDk5OTk5OTk3NzY0ODI1ODIsLTIuMTc0OTk5OTUyMzE2Mjg0XX0seyJidWZmZXJWaWV3IjoxLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjQ5MCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MjU5MiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzQ4OV0sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjMsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MTEsInR5cGUiOiJWRUMzIiwibWF4IjpbMC42MzIzOTk5NzYyNTM1MDk1LDAuNDAwMDAwMDA1OTYwNDY0NSwyLjE3NDk5OTk1MjMxNjI4NF0sIm1pbiI6Wy0wLjYzMjM5OTk3NjI1MzUwOTUsMC4wMDk5OTk5OTk3NzY0ODI1ODIsMi4xNzQ5OTk5NTIzMTYyODRdfSx7ImJ1ZmZlclZpZXciOjQsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MTEsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo1LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjI3LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbMTBdLCJtaW4iOlswXX0seyJidWZmZXJWaWV3Ijo2LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjExLCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuNzI1Mzk5OTcxMDA4MzAwOCwwLjQwMDAwMDAwNTk2MDQ2NDUsLTIuMTc0OTk5OTUyMzE2Mjg0XSwibWluIjpbLTAuNzI1Mzk5OTcxMDA4MzAwOCwwLjAwOTk5OTk5OTc3NjQ4MjU4MiwtMi4xNzQ5OTk5NTIzMTYyODRdfSx7ImJ1ZmZlclZpZXciOjcsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MTEsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo4LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjI3LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbMTBdLCJtaW4iOlswXX0seyJidWZmZXJWaWV3Ijo5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMC44MzcwMDAwMTIzOTc3NjYxLDAuMDI5OTk5OTk5MzI5NDQ3NzQ2LDEuOTU3NDk5OTgwOTI2NTEzN10sIm1pbiI6Wy0wLjgzNzAwMDAxMjM5Nzc2NjEsLTAuMDA5OTk5OTk5Nzc2NDgyNTgyLC0xLjk1NzQ5OTk4MDkyNjUxMzddfSx7ImJ1ZmZlclZpZXciOjEwLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxMSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxMiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuNTc2NjAwMDE1MTYzNDIxNiwwLjg1NTAwMDAxOTA3MzQ4NjMsMS4yNzc5OTk5OTcxMzg5NzddLCJtaW4iOlstMC41NzY2MDAwMTUxNjM0MjE2LDAuNDQ0OTk5OTkyODQ3NDQyNiwxLjIzODAwMDAzNTI4NTk0OTddfSx7ImJ1ZmZlclZpZXciOjEzLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxNCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxNSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuNTM5Mzk5OTgxNDk4NzE4MywwLjgyOTk5OTk4MzMxMDY5OTUsLTEuMjM4MDAwMDM1Mjg1OTQ5N10sIm1pbiI6Wy0wLjUzOTM5OTk4MTQ5ODcxODMsMC40Njk5OTk5OTg4MDc5MDcxLC0xLjI3Nzk5OTk5NzEzODk3N119LHsiYnVmZmVyVmlldyI6MTYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE3LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjE4LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuNjM3Mzk5OTcxNDg1MTM3OSwwLjg1MDAwMDAyMzg0MTg1NzksMC43ODI5OTk5OTIzNzA2MDU1XSwibWluIjpbLTAuNjY3NDAwMDAyNDc5NTUzMiwwLjQ5MDAwMDAwOTUzNjc0MzE2LC0wLjc4Mjk5OTk5MjM3MDYwNTVdfSx7ImJ1ZmZlclZpZXciOjE5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoyMCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoyMSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuNjY3NDAwMDAyNDc5NTUzMiwwLjg1MDAwMDAyMzg0MTg1NzksMC43ODI5OTk5OTIzNzA2MDU1XSwibWluIjpbMC42MzczOTk5NzE0ODUxMzc5LDAuNDkwMDAwMDA5NTM2NzQzMTYsLTAuNzgyOTk5OTkyMzcwNjA1NV19LHsiYnVmZmVyVmlldyI6MjIsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIzLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjI0LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMC42MDQ0OTk5OTU3MDg0NjU2LDAuOTQ5OTk5OTg4MDc5MDcxLDEuMDg3NDk5OTc2MTU4MTQyXSwibWluIjpbLTAuNjA0NDk5OTk1NzA4NDY1NiwwLjg5OTk5OTk3NjE1ODE0MjEsLTEuMDg3NDk5OTc2MTU4MTQyXX0seyJidWZmZXJWaWV3IjoyNSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MjYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MjcsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlswLjkwMjEwMDAyNjYwNzUxMzQsMC40MDUwMDAwMDExOTIwOTI5LDIuMTUzMjQ5OTc5MDE5MTY1XSwibWluIjpbLTAuOTAyMTAwMDI2NjA3NTEzNCwwLjM3NSwwLjU0Mzc0OTk4ODA3OTA3MV19LHsiYnVmZmVyVmlldyI6MjgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjI5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjMwLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMC45NDg1OTk5OTQxODI1ODY3LDAuMjQ0MDAwMDAyNzQxODEzNjYsMi4zOTQ5OTk5ODA5MjY1MTM3XSwibWluIjpbLTAuOTQ4NTk5OTk0MTgyNTg2NywtMC4wMDQwMDAwMDAxODk5ODk4MDUsMi4xNzQ5OTk5NTIzMTYyODRdfSx7ImJ1ZmZlclZpZXciOjMxLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjozMiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjozMywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuNTIwNzk5OTk0NDY4Njg5LDAuMjMxOTk5OTkzMzI0Mjc5NzksMi4zNTUwMDAwMTkwNzM0ODYzXSwibWluIjpbLTAuNTIwNzk5OTk0NDY4Njg5LDAuMDU2MDAwMDAxNzI4NTM0NywyLjI3NTAwMDA5NTM2NzQzMTZdfSx7ImJ1ZmZlclZpZXciOjM0LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjozNSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjozNiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuNTc2NjAwMDE1MTYzNDIxNiwwLjI0NDAwMDAwMjc0MTgxMzY2LDIuMzA5OTk5OTQyNzc5NTQxXSwibWluIjpbLTAuNTc2NjAwMDE1MTYzNDIxNiwwLjA0Mzk5OTk5OTc2MTU4MTQyLDIuMjU5OTk5OTkwNDYzMjU3XX0seyJidWZmZXJWaWV3IjozNywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MzgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MzksImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlswLjc2MjYwMDAwNDY3MzAwNDIsMC4wNzUwMDAwMDI5ODAyMzIyNCwyLjQ1NDk5OTkyMzcwNjA1NDddLCJtaW4iOlstMC43NjI2MDAwMDQ2NzMwMDQyLDAuMDA0OTk5OTk5ODg4MjQxMjkxLDIuMTc0OTk5OTUyMzE2Mjg0XX0seyJidWZmZXJWaWV3Ijo0MCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6NDEsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6NDIsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC40NDc0OTk5OTA0NjMyNTY4NCwwLjM4NDAwMDAwMzMzNzg2MDEsMi4zNTUwMDAwMTkwNzM0ODYzXSwibWluIjpbLTAuOTEyNTAwMDIzODQxODU3OSwwLjI1NjAwMDAxMjE1OTM0NzUzLDIuMjM0OTk5ODk1MDk1ODI1XX0seyJidWZmZXJWaWV3Ijo0MywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6NDQsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6NDUsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuNTk3OTk5OTg5OTg2NDE5NywwLjQwODc1NDIyOTU0NTU5MzI2LDIuMzE5OTk5OTMzMjQyNzk4XSwibWluIjpbLTAuNzYyMDAwMDI0MzE4Njk1MSwwLjI0NzI0NTc1ODc3MTg5NjM2LDIuMjY5OTk5OTgwOTI2NTEzN119LHsiYnVmZmVyVmlldyI6NDYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo0NywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjoyMTYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOlszN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjQ4LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuNDc1NDAwMDAwODEwNjIzMTcsMC4yNjE5OTk5OTQ1MTYzNzI3LDIuMzM1MDAwMDM4MTQ2OTcyN10sIm1pbiI6Wy0wLjg4NDU5OTk4MzY5MjE2OTIsMC4yMzM5OTk5OTczNzczOTU2MywyLjI5NTAwMDA3NjI5Mzk0NTNdfSx7ImJ1ZmZlclZpZXciOjQ5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo1MCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3Ijo1MSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuOTEyNTAwMDIzODQxODU3OSwwLjM4NDAwMDAwMzMzNzg2MDEsMi4zNTUwMDAwMTkwNzM0ODYzXSwibWluIjpbMC40NDc0OTk5OTA0NjMyNTY4NCwwLjI1NjAwMDAxMjE1OTM0NzUzLDIuMjM0OTk5ODk1MDk1ODI1XX0seyJidWZmZXJWaWV3Ijo1MiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6NTMsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6NTQsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzgsInR5cGUiOiJWRUMzIiwibWF4IjpbMC43NjIwMDAwMjQzMTg2OTUxLDAuNDA4NzU0MjI5NTQ1NTkzMjYsMi4zMTk5OTk5MzMyNDI3OThdLCJtaW4iOlswLjU5Nzk5OTk4OTk4NjQxOTcsMC4yNDcyNDU3NTg3NzE4OTYzNiwyLjI2OTk5OTk4MDkyNjUxMzddfSx7ImJ1ZmZlclZpZXciOjU1LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6NTYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MjE2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbMzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3Ijo1NywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuODg0NTk5OTgzNjkyMTY5MiwwLjI2MTk5OTk5NDUxNjM3MjcsMi4zMzUwMDAwMzgxNDY5NzI3XSwibWluIjpbMC40NzU0MDAwMDA4MTA2MjMxNywwLjIzMzk5OTk5NzM3NzM5NTYzLDIuMjk1MDAwMDc2MjkzOTQ1M119LHsiYnVmZmVyVmlldyI6NTgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjU5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjYwLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMC45NDg1OTk5OTQxODI1ODY3LDAuMjMxOTk5OTkzMzI0Mjc5NzksLTIuMTc0OTk5OTUyMzE2Mjg0XSwibWluIjpbLTAuOTQ4NTk5OTk0MTgyNTg2NywwLjAsLTIuMzk0OTk5OTgwOTI2NTEzN119LHsiYnVmZmVyVmlldyI6NjEsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjYyLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjYzLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMC42ODgxOTk5OTY5NDgyNDIyLDAuMTAwMDAwMDAxNDkwMTE2MTIsLTIuMTY0OTk5OTYxODUzMDI3M10sIm1pbiI6Wy0wLjY4ODE5OTk5Njk0ODI0MjIsMC4wLC0yLjQ2NDk5OTkxNDE2OTMxMTVdfSx7ImJ1ZmZlclZpZXciOjY0LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo2NSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3Ijo2NiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuODE4NDAwMDI1MzY3NzM2OCwwLjM2MDAwMDAxNDMwNTExNDc1LC0yLjE3MDAwMDA3NjI5Mzk0NTNdLCJtaW4iOlstMC44MTg0MDAwMjUzNjc3MzY4LDAuMzE5OTk5OTkyODQ3NDQyNiwtMi4yMjAwMDAwMjg2MTAyMjk1XX0seyJidWZmZXJWaWV3Ijo2NywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6NjgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6NjksImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC40MTEwMDAwMTMzNTE0NDA0MywwLjM3OTk5OTk5NTIzMTYyODQsLTIuMTc0OTk5OTUyMzE2Mjg0XSwibWluIjpbLTAuOTY4OTk5OTgxODgwMTg4LDAuMjQ0MDAwMDAyNzQxODEzNjYsLTIuMjk1MDAwMDc2MjkzOTQ1M119LHsiYnVmZmVyVmlldyI6NzAsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjcxLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjcyLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuNDY2ODAwMDA0MjQzODUwNywwLjM1NjAwMDAwNjE5ODg4MzA2LC0yLjIyMDAwMDAyODYxMDIyOTVdLCJtaW4iOlstMC45MTMyMDAwMjA3OTAxMDAxLDAuMjY4MDAwMDA2Njc1NzIwMiwtMi4yODk5OTk5NjE4NTMwMjczXX0seyJidWZmZXJWaWV3Ijo3MywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6NzQsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6NzUsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlswLjk2ODk5OTk4MTg4MDE4OCwwLjM3OTk5OTk5NTIzMTYyODQsLTIuMTc0OTk5OTUyMzE2Mjg0XSwibWluIjpbMC40MTEwMDAwMTMzNTE0NDA0MywwLjI0NDAwMDAwMjc0MTgxMzY2LC0yLjI5NTAwMDA3NjI5Mzk0NTNdfSx7ImJ1ZmZlclZpZXciOjc2LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo3NywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3Ijo3OCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzAuOTEzMjAwMDIwNzkwMTAwMSwwLjM1NjAwMDAwNjE5ODg4MzA2LC0yLjIyMDAwMDAyODYxMDIyOTVdLCJtaW4iOlswLjQ2NjgwMDAwNDI0Mzg1MDcsMC4yNjgwMDAwMDY2NzU3MjAyLC0yLjI4OTk5OTk2MTg1MzAyNzNdfSx7ImJ1ZmZlclZpZXciOjc5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo4MCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3Ijo4MSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozMCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC4yMTE5OTk5OTc0OTY2MDQ5MiwwLjE3NjI5NTEwMTY0MjYwODY0LC0yLjE3NDk5OTk1MjMxNjI4NF0sIm1pbiI6Wy0wLjM0Nzk5OTk4OTk4NjQxOTcsMC4wNDM3MDQ5MDA4OTA1ODg3NiwtMi41MTUwMDAxMDQ5MDQxNzVdfSx7ImJ1ZmZlclZpZXciOjgyLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjMwLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6ODMsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MTY4LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbMjldLCJtaW4iOlswXX0seyJidWZmZXJWaWV3Ijo4NCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozMCwidHlwZSI6IlZFQzMiLCJtYXgiOlswLjM0Nzk5OTk4OTk4NjQxOTcsMC4xNzYyOTUxMDE2NDI2MDg2NCwtMi4xNzQ5OTk5NTIzMTYyODRdLCJtaW4iOlswLjIxMTk5OTk5NzQ5NjYwNDkyLDAuMDQzNzA0OTAwODkwNTg4NzYsLTIuNTE1MDAwMTA0OTA0MTc1XX0seyJidWZmZXJWaWV3Ijo4NSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozMCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjg2LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjE2OCwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzI5XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6ODcsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC45MzAwMDAwMDcxNTI1NTc0LDAuMTU5OTk5OTk2NDIzNzIxMywxLjU2NTk5OTk4NDc0MTIxMV0sIm1pbiI6Wy0xLjAsMC4wLC0xLjU2NTk5OTk4NDc0MTIxMV19LHsiYnVmZmVyVmlldyI6ODgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjg5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjkwLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMS4wLDAuMTU5OTk5OTk2NDIzNzIxMywxLjU2NTk5OTk4NDc0MTIxMV0sIm1pbiI6WzAuOTMwMDAwMDA3MTUyNTU3NCwwLjAsLTEuNTY1OTk5OTg0NzQxMjExXX0seyJidWZmZXJWaWV3Ijo5MSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6OTIsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6OTMsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMS4wMjk5OTk5NzEzODk3NzA1LDAuNDY5OTk5OTk4ODA3OTA3MSwxLjM0NTAwMDAyODYxMDIyOTVdLCJtaW4iOlstMS4xNDk5OTk5NzYxNTgxNDIsMC40MDk5OTk5OTY0MjM3MjEzLDEuMjY0OTk5OTg1Njk0ODg1M119LHsiYnVmZmVyVmlldyI6OTQsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjk1LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjk2LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTEuMDQ0OTk5OTU3MDg0NjU1OCwwLjU1NTAwMDAwNzE1MjU1NzQsMS42MDUwMDAwMTkwNzM0ODYzXSwibWluIjpbLTEuMTM0OTk5OTkwNDYzMjU2OCwwLjM2NTAwMDAwOTUzNjc0MzE2LDEuMzA0OTk5OTQ3NTQ3OTEyNl19LHsiYnVmZmVyVmlldyI6OTcsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjk4LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjk5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTEuMDcyNDk5OTkwNDYzMjU2OCwwLjUyOTk5OTk3MTM4OTc3MDUsMS41NzAwMDAwNTI0NTIwODc0XSwibWluIjpbLTEuMTA3NDk5OTU3MDg0NjU1OCwwLjM4OTk5OTk4NTY5NDg4NTI1LDEuMzQwMDAwMDMzMzc4NjAxXX0seyJidWZmZXJWaWV3IjoxMDAsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEwMSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxMDIsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlsxLjE0OTk5OTk3NjE1ODE0MiwwLjQ2OTk5OTk5ODgwNzkwNzEsMS4zNDUwMDAwMjg2MTAyMjk1XSwibWluIjpbMS4wMjk5OTk5NzEzODk3NzA1LDAuNDA5OTk5OTk2NDIzNzIxMywxLjI2NDk5OTk4NTY5NDg4NTNdfSx7ImJ1ZmZlclZpZXciOjEwMywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTA0LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjEwNSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMTM0OTk5OTkwNDYzMjU2OCwwLjU1NTAwMDAwNzE1MjU1NzQsMS42MDUwMDAwMTkwNzM0ODYzXSwibWluIjpbMS4wNDQ5OTk5NTcwODQ2NTU4LDAuMzY1MDAwMDA5NTM2NzQzMTYsMS4zMDQ5OTk5NDc1NDc5MTI2XX0seyJidWZmZXJWaWV3IjoxMDYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEwNywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxMDgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlsxLjEwNzQ5OTk1NzA4NDY1NTgsMC41Mjk5OTk5NzEzODk3NzA1LDEuNTcwMDAwMDUyNDUyMDg3NF0sIm1pbiI6WzEuMDcyNDk5OTkwNDYzMjU2OCwwLjM4OTk5OTk4NTY5NDg4NTI1LDEuMzQwMDAwMDMzMzc4NjAxXX0seyJidWZmZXJWaWV3IjoxMDksImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjExMCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxMTEsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NTgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuODg3NDk5OTg4MDc5MDcxLDAuNjg5OTk5OTk3NjE1ODE0MiwxLjY0NDk5OTk4MDkyNjUxMzddLCJtaW4iOlstMS4xMTI0OTk5NTIzMTYyODQyLDAuMCwwLjk1NDk5OTk4MzMxMDY5OTVdfSx7ImJ1ZmZlclZpZXciOjExMiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjExMywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozMzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls1N10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjExNCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC44OTMxMjQ5OTc2MTU4MTQyLDAuNjAwMzAwMDE0MDE5MDEyNSwxLjU1NTI5OTk5NzMyOTcxMl0sIm1pbiI6Wy0xLjEwNjg3NDk0Mjc3OTU0MSwwLjA4OTY5OTk5ODQ5Nzk2Mjk1LDEuMDQ0NzAwMDI2NTEyMTQ2XX0seyJidWZmZXJWaWV3IjoxMTUsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NTgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxMTYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbNTddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxMTcsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NTAsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuOTE5MDAwMDI5NTYzOTAzOCwwLjU0NTA5OTk3MzY3ODU4ODksMS41MDAxMDAwMTY1OTM5MzNdLCJtaW4iOlstMS4wODA5OTk5NzA0MzYwOTYyLDAuMTQ0ODk5OTk0MTM0OTAyOTUsMS4wOTk5MDAwMDcyNDc5MjQ4XX0seyJidWZmZXJWaWV3IjoxMTgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NTAsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxMTksImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6Mjg4LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbNDldLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxMjAsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC45MDc3NTAwMTA0OTA0MTc1LDAuMzU4Nzk5OTkzOTkxODUxOCwxLjUxMDQ1MDAwNTUzMTMxMV0sIm1pbiI6Wy0xLjA5MjI0OTk4OTUwOTU4MjUsMC4zMzEyMDAwMDM2MjM5NjI0LDEuMzEwMzQ5OTQxMjUzNjYyXX0seyJidWZmZXJWaWV3IjoxMjEsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEyMiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxMjMsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC45MDc3NTAwMTA0OTA0MTc1LDAuNDYzNzk2NjQ1NDAyOTA4MywxLjQzNDE2NTQ3Nzc1MjY4NTVdLCJtaW4iOlstMS4wOTIyNDk5ODk1MDk1ODI1LDAuNDM2MTk2NjI1MjMyNjk2NTMsMS4yMzQwNjU1MzI2ODQzMjYyXX0seyJidWZmZXJWaWV3IjoxMjQsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEyNSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxMjYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC45MDc3NTAwMTA0OTA0MTc1LDAuNDIzNjkxNDgxMzUxODUyNCwxLjMxMDczNDUxMDQyMTc1M10sIm1pbiI6Wy0xLjA5MjI0OTk4OTUwOTU4MjUsMC4zOTYwOTE0OTA5ODM5NjMsMS4xMTA2MzQ1NjUzNTMzOTM2XX0seyJidWZmZXJWaWV3IjoxMjcsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEyOCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxMjksImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC45MDc3NTAwMTA0OTA0MTc1LDAuMjkzOTA4NTA2NjMxODUxMiwxLjMxMDczNDUxMDQyMTc1M10sIm1pbiI6Wy0xLjA5MjI0OTk4OTUwOTU4MjUsMC4yNjYzMDg1MTYyNjM5NjE4LDEuMTEwNjM0NTY1MzUzMzkzNl19LHsiYnVmZmVyVmlldyI6MTMwLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxMzEsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MTMyLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuOTA3NzUwMDEwNDkwNDE3NSwwLjI1MzgwMzM3MjM4MzExNzcsMS40MzQxNjU0Nzc3NTI2ODU1XSwibWluIjpbLTEuMDkyMjQ5OTg5NTA5NTgyNSwwLjIyNjIwMzM2NzExNDA2NzA4LDEuMjM0MDY1NTMyNjg0MzI2Ml19LHsiYnVmZmVyVmlldyI6MTMzLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxMzQsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MTM1LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuOTM0NzUwMDIwNTAzOTk3OCwwLjU2NTgwMDAxMTE1Nzk4OTUsMS4zNTE3NTAwMTYyMTI0NjM0XSwibWluIjpbLTEuMDY1MjUwMDM5MTAwNjQ3LDAuNDY5MTk5OTg1MjY1NzMxOCwxLjI0ODI1MDAwNzYyOTM5NDVdfSx7ImJ1ZmZlclZpZXciOjEzNiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTM3LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjEzOCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo0MiwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC45Njg1MDAwMTgxMTk4MTIsMC41MjQzOTk5OTU4MDM4MzMsMS40Nzk0MDAwMzg3MTkxNzcyXSwibWluIjpbLTEuMDMxNDk5OTgxODgwMTg4LDAuMTY1NjAwMDAxODExOTgxMiwxLjEyMDU5OTk4NTEyMjY4MDddfSx7ImJ1ZmZlclZpZXciOjEzOSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo0MiwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE0MCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjoyNDAsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls0MV0sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjE0MSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1OCwidHlwZSI6IlZFQzMiLCJtYXgiOlsxLjExMjQ5OTk1MjMxNjI4NDIsMC42ODk5OTk5OTc2MTU4MTQyLDEuNjQ0OTk5OTgwOTI2NTEzN10sIm1pbiI6WzAuODg3NDk5OTg4MDc5MDcxLDAuMCwwLjk1NDk5OTk4MzMxMDY5OTVdfSx7ImJ1ZmZlclZpZXciOjE0MiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE0MywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozMzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls1N10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjE0NCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1OCwidHlwZSI6IlZFQzMiLCJtYXgiOlsxLjEwNjg3NDk0Mjc3OTU0MSwwLjYwMDMwMDAxNDAxOTAxMjUsMS41NTUyOTk5OTczMjk3MTJdLCJtaW4iOlswLjg5MzEyNDk5NzYxNTgxNDIsMC4wODk2OTk5OTg0OTc5NjI5NSwxLjA0NDcwMDAyNjUxMjE0Nl19LHsiYnVmZmVyVmlldyI6MTQ1LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjU4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTQ2LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjMzNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzU3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MTQ3LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjUwLCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMDgwOTk5OTcwNDM2MDk2MiwwLjU0NTA5OTk3MzY3ODU4ODksMS41MDAxMDAwMTY1OTM5MzNdLCJtaW4iOlswLjkxOTAwMDAyOTU2MzkwMzgsMC4xNDQ4OTk5OTQxMzQ5MDI5NSwxLjA5OTkwMDAwNzI0NzkyNDhdfSx7ImJ1ZmZlclZpZXciOjE0OCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1MCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE0OSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjoyODgsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls0OV0sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjE1MCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMDkyMjQ5OTg5NTA5NTgyNSwwLjM1ODc5OTk5Mzk5MTg1MTgsMS41MTA0NTAwMDU1MzEzMTFdLCJtaW4iOlswLjkwNzc1MDAxMDQ5MDQxNzUsMC4zMzEyMDAwMDM2MjM5NjI0LDEuMzEwMzQ5OTQxMjUzNjYyXX0seyJidWZmZXJWaWV3IjoxNTEsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE1MiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxNTMsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlsxLjA5MjI0OTk4OTUwOTU4MjUsMC40NjM3OTY2NDU0MDI5MDgzLDEuNDM0MTY1NDc3NzUyNjg1NV0sIm1pbiI6WzAuOTA3NzUwMDEwNDkwNDE3NSwwLjQzNjE5NjYyNTIzMjY5NjUzLDEuMjM0MDY1NTMyNjg0MzI2Ml19LHsiYnVmZmVyVmlldyI6MTU0LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxNTUsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MTU2LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMS4wOTIyNDk5ODk1MDk1ODI1LDAuNDIzNjkxNDgxMzUxODUyNCwxLjMxMDczNDUxMDQyMTc1M10sIm1pbiI6WzAuOTA3NzUwMDEwNDkwNDE3NSwwLjM5NjA5MTQ5MDk4Mzk2MywxLjExMDYzNDU2NTM1MzM5MzZdfSx7ImJ1ZmZlclZpZXciOjE1NywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTU4LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjE1OSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMDkyMjQ5OTg5NTA5NTgyNSwwLjI5MzkwODUwNjYzMTg1MTIsMS4zMTA3MzQ1MTA0MjE3NTNdLCJtaW4iOlswLjkwNzc1MDAxMDQ5MDQxNzUsMC4yNjYzMDg1MTYyNjM5NjE4LDEuMTEwNjM0NTY1MzUzMzkzNl19LHsiYnVmZmVyVmlldyI6MTYwLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxNjEsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MTYyLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMS4wOTIyNDk5ODk1MDk1ODI1LDAuMjUzODAzMzcyMzgzMTE3NywxLjQzNDE2NTQ3Nzc1MjY4NTVdLCJtaW4iOlswLjkwNzc1MDAxMDQ5MDQxNzUsMC4yMjYyMDMzNjcxMTQwNjcwOCwxLjIzNDA2NTUzMjY4NDMyNjJdfSx7ImJ1ZmZlclZpZXciOjE2MywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTY0LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjE2NSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMDY1MjUwMDM5MTAwNjQ3LDAuNTY1ODAwMDExMTU3OTg5NSwxLjM1MTc1MDAxNjIxMjQ2MzRdLCJtaW4iOlswLjkzNDc1MDAyMDUwMzk5NzgsMC40NjkxOTk5ODUyNjU3MzE4LDEuMjQ4MjUwMDA3NjI5Mzk0NV19LHsiYnVmZmVyVmlldyI6MTY2LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxNjcsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MTY4LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjQyLCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMDMxNDk5OTgxODgwMTg4LDAuNTI0Mzk5OTk1ODAzODMzLDEuNDc5NDAwMDM4NzE5MTc3Ml0sIm1pbiI6WzAuOTY4NTAwMDE4MTE5ODEyLDAuMTY1NjAwMDAxODExOTgxMiwxLjEyMDU5OTk4NTEyMjY4MDddfSx7ImJ1ZmZlclZpZXciOjE2OSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo0MiwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE3MCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjoyNDAsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls0MV0sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjE3MSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC44ODc0OTk5ODgwNzkwNzEsMC42ODk5OTk5OTc2MTU4MTQyLC0wLjk1NDk5OTk4MzMxMDY5OTVdLCJtaW4iOlstMS4xMTI0OTk5NTIzMTYyODQyLDAuMCwtMS42NDQ5OTk5ODA5MjY1MTM3XX0seyJidWZmZXJWaWV3IjoxNzIsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NTgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxNzMsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbNTddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxNzQsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NTgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuODkzMTI0OTk3NjE1ODE0MiwwLjYwMDMwMDAxNDAxOTAxMjUsLTEuMDQ0NzAwMDI2NTEyMTQ2XSwibWluIjpbLTEuMTA2ODc0OTQyNzc5NTQxLDAuMDg5Njk5OTk4NDk3OTYyOTUsLTEuNTU1Mjk5OTk3MzI5NzEyXX0seyJidWZmZXJWaWV3IjoxNzUsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NTgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxNzYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbNTddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxNzcsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NTAsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuOTE5MDAwMDI5NTYzOTAzOCwwLjU0NTA5OTk3MzY3ODU4ODksLTEuMDk5OTAwMDA3MjQ3OTI0OF0sIm1pbiI6Wy0xLjA4MDk5OTk3MDQzNjA5NjIsMC4xNDQ4OTk5OTQxMzQ5MDI5NSwtMS41MDAxMDAwMTY1OTM5MzNdfSx7ImJ1ZmZlclZpZXciOjE3OCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1MCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE3OSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjoyODgsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls0OV0sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjE4MCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6Wy0wLjkwNzc1MDAxMDQ5MDQxNzUsMC4zNTg3OTk5OTM5OTE4NTE4LC0xLjA4OTU1MDAxODMxMDU0NjldLCJtaW4iOlstMS4wOTIyNDk5ODk1MDk1ODI1LDAuMzMxMjAwMDAzNjIzOTYyNCwtMS4yODk2NDk5NjMzNzg5MDYyXX0seyJidWZmZXJWaWV3IjoxODEsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE4MiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxODMsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC45MDc3NTAwMTA0OTA0MTc1LDAuNDYzNzk2NjQ1NDAyOTA4MywtMS4xNjU4MzQ1NDYwODkxNzI0XSwibWluIjpbLTEuMDkyMjQ5OTg5NTA5NTgyNSwwLjQzNjE5NjYyNTIzMjY5NjUzLC0xLjM2NTkzNDQ5MTE1NzUzMTddfSx7ImJ1ZmZlclZpZXciOjE4NCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTg1LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjE4NiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6Wy0wLjkwNzc1MDAxMDQ5MDQxNzUsMC40MjM2OTE0ODEzNTE4NTI0LC0xLjI4OTI2NTUxMzQyMDEwNV0sIm1pbiI6Wy0xLjA5MjI0OTk4OTUwOTU4MjUsMC4zOTYwOTE0OTA5ODM5NjMsLTEuNDg5MzY1NDU4NDg4NDY0NF19LHsiYnVmZmVyVmlldyI6MTg3LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxODgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MTg5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuOTA3NzUwMDEwNDkwNDE3NSwwLjI5MzkwODUwNjYzMTg1MTIsLTEuMjg5MjY1NTEzNDIwMTA1XSwibWluIjpbLTEuMDkyMjQ5OTg5NTA5NTgyNSwwLjI2NjMwODUxNjI2Mzk2MTgsLTEuNDg5MzY1NDU4NDg4NDY0NF19LHsiYnVmZmVyVmlldyI6MTkwLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxOTEsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MTkyLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuOTA3NzUwMDEwNDkwNDE3NSwwLjI1MzgwMzM3MjM4MzExNzcsLTEuMTY1ODM0NTQ2MDg5MTcyNF0sIm1pbiI6Wy0xLjA5MjI0OTk4OTUwOTU4MjUsMC4yMjYyMDMzNjcxMTQwNjcwOCwtMS4zNjU5MzQ0OTExNTc1MzE3XX0seyJidWZmZXJWaWV3IjoxOTMsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE5NCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxOTUsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMiLCJtYXgiOlstMC45MzQ3NTAwMjA1MDM5OTc4LDAuNTY1ODAwMDExMTU3OTg5NSwtMS4yNDgyNTAwMDc2MjkzOTQ1XSwibWluIjpbLTEuMDY1MjUwMDM5MTAwNjQ3LDAuNDY5MTk5OTg1MjY1NzMxOCwtMS4zNTE3NTAwMTYyMTI0NjM0XX0seyJidWZmZXJWaWV3IjoxOTYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE5NywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoxOTgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NDIsInR5cGUiOiJWRUMzIiwibWF4IjpbLTAuOTY4NTAwMDE4MTE5ODEyLDAuNTI0Mzk5OTk1ODAzODMzLC0xLjEyMDU5OTk4NTEyMjY4MDddLCJtaW4iOlstMS4wMzE0OTk5ODE4ODAxODgsMC4xNjU2MDAwMDE4MTE5ODEyLC0xLjQ3OTQwMDAzODcxOTE3NzJdfSx7ImJ1ZmZlclZpZXciOjE5OSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo0MiwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIwMCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjoyNDAsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls0MV0sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjIwMSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1OCwidHlwZSI6IlZFQzMiLCJtYXgiOlsxLjExMjQ5OTk1MjMxNjI4NDIsMC42ODk5OTk5OTc2MTU4MTQyLC0wLjk1NDk5OTk4MzMxMDY5OTVdLCJtaW4iOlswLjg4NzQ5OTk4ODA3OTA3MSwwLjAsLTEuNjQ0OTk5OTgwOTI2NTEzN119LHsiYnVmZmVyVmlldyI6MjAyLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjU4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MjAzLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjMzNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzU3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MjA0LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjU4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMTA2ODc0OTQyNzc5NTQxLDAuNjAwMzAwMDE0MDE5MDEyNSwtMS4wNDQ3MDAwMjY1MTIxNDZdLCJtaW4iOlswLjg5MzEyNDk5NzYxNTgxNDIsMC4wODk2OTk5OTg0OTc5NjI5NSwtMS41NTUyOTk5OTczMjk3MTJdfSx7ImJ1ZmZlclZpZXciOjIwNSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIwNiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozMzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls1N10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjIwNywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1MCwidHlwZSI6IlZFQzMiLCJtYXgiOlsxLjA4MDk5OTk3MDQzNjA5NjIsMC41NDUwOTk5NzM2Nzg1ODg5LC0xLjA5OTkwMDAwNzI0NzkyNDhdLCJtaW4iOlswLjkxOTAwMDAyOTU2MzkwMzgsMC4xNDQ4OTk5OTQxMzQ5MDI5NSwtMS41MDAxMDAwMTY1OTM5MzNdfSx7ImJ1ZmZlclZpZXciOjIwOCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo1MCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIwOSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjoyODgsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls0OV0sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjIxMCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMDkyMjQ5OTg5NTA5NTgyNSwwLjM1ODc5OTk5Mzk5MTg1MTgsLTEuMDg5NTUwMDE4MzEwNTQ2OV0sIm1pbiI6WzAuOTA3NzUwMDEwNDkwNDE3NSwwLjMzMTIwMDAwMzYyMzk2MjQsLTEuMjg5NjQ5OTYzMzc4OTA2Ml19LHsiYnVmZmVyVmlldyI6MjExLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoyMTIsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MjEzLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMS4wOTIyNDk5ODk1MDk1ODI1LDAuNDYzNzk2NjQ1NDAyOTA4MywtMS4xNjU4MzQ1NDYwODkxNzI0XSwibWluIjpbMC45MDc3NTAwMTA0OTA0MTc1LDAuNDM2MTk2NjI1MjMyNjk2NTMsLTEuMzY1OTM0NDkxMTU3NTMxN119LHsiYnVmZmVyVmlldyI6MjE0LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoyMTUsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MjE2LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMS4wOTIyNDk5ODk1MDk1ODI1LDAuNDIzNjkxNDgxMzUxODUyNCwtMS4yODkyNjU1MTM0MjAxMDVdLCJtaW4iOlswLjkwNzc1MDAxMDQ5MDQxNzUsMC4zOTYwOTE0OTA5ODM5NjMsLTEuNDg5MzY1NDU4NDg4NDY0NF19LHsiYnVmZmVyVmlldyI6MjE3LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoyMTgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtYXgiOls3XSwibWluIjpbMF19LHsiYnVmZmVyVmlldyI6MjE5LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjgsInR5cGUiOiJWRUMzIiwibWF4IjpbMS4wOTIyNDk5ODk1MDk1ODI1LDAuMjkzOTA4NTA2NjMxODUxMiwtMS4yODkyNjU1MTM0MjAxMDVdLCJtaW4iOlswLjkwNzc1MDAxMDQ5MDQxNzUsMC4yNjYzMDg1MTYyNjM5NjE4LC0xLjQ4OTM2NTQ1ODQ4ODQ2NDRdfSx7ImJ1ZmZlclZpZXciOjIyMCwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MjIxLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjIyMiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMDkyMjQ5OTg5NTA5NTgyNSwwLjI1MzgwMzM3MjM4MzExNzcsLTEuMTY1ODM0NTQ2MDg5MTcyNF0sIm1pbiI6WzAuOTA3NzUwMDEwNDkwNDE3NSwwLjIyNjIwMzM2NzExNDA2NzA4LC0xLjM2NTkzNDQ5MTE1NzUzMTddfSx7ImJ1ZmZlclZpZXciOjIyMywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MjI0LCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI1LCJub3JtYWxpemVkIjpmYWxzZSwiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbN10sIm1pbiI6WzBdfSx7ImJ1ZmZlclZpZXciOjIyNSwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEuMDY1MjUwMDM5MTAwNjQ3LDAuNTY1ODAwMDExMTU3OTg5NSwtMS4yNDgyNTAwMDc2MjkzOTQ1XSwibWluIjpbMC45MzQ3NTAwMjA1MDM5OTc4LDAuNDY5MTk5OTg1MjY1NzMxOCwtMS4zNTE3NTAwMTYyMTI0NjM0XX0seyJidWZmZXJWaWV3IjoyMjYsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIyNywiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyNSwibm9ybWFsaXplZCI6ZmFsc2UsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiIsIm1heCI6WzddLCJtaW4iOlswXX0seyJidWZmZXJWaWV3IjoyMjgsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NDIsInR5cGUiOiJWRUMzIiwibWF4IjpbMS4wMzE0OTk5ODE4ODAxODgsMC41MjQzOTk5OTU4MDM4MzMsLTEuMTIwNTk5OTg1MTIyNjgwN10sIm1pbiI6WzAuOTY4NTAwMDE4MTE5ODEyLDAuMTY1NjAwMDAxODExOTgxMiwtMS40Nzk0MDAwMzg3MTkxNzcyXX0seyJidWZmZXJWaWV3IjoyMjksImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6NDIsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoyMzAsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjUsIm5vcm1hbGl6ZWQiOmZhbHNlLCJjb3VudCI6MjQwLCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbNDFdLCJtaW4iOlswXX1dLCJhc3NldCI6eyJnZW5lcmF0b3IiOiJOZW9uRHJpZnQtQ2FyQnVpbGRlciIsInZlcnNpb24iOiIyLjAifSwiYnVmZmVyVmlld3MiOlt7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MCwiYnl0ZUxlbmd0aCI6NTg4MCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjU4ODAsImJ5dGVMZW5ndGgiOjU4ODAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoxMTc2MCwiYnl0ZUxlbmd0aCI6MTAzNjgsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyMjEyOCwiYnl0ZUxlbmd0aCI6MTMyLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjIyNjAsImJ5dGVMZW5ndGgiOjEzMiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjIyMzkyLCJieXRlTGVuZ3RoIjoxMDgsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyMjUwMCwiYnl0ZUxlbmd0aCI6MTMyLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjI2MzIsImJ5dGVMZW5ndGgiOjEzMiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjIyNzY0LCJieXRlTGVuZ3RoIjoxMDgsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyMjg3MiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyMjk2OCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyMzA2NCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjMyMDgsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjMzMDQsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjM0MDAsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjIzNTQ0LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjIzNjQwLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjIzNzM2LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyMzg4MCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyMzk3NiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyNDA3MiwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjQyMTYsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjQzMTIsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjQ0MDgsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI0NTUyLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI0NjQ4LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI0NzQ0LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyNDg4OCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyNDk4NCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyNTA4MCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjUyMjQsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjUzMjAsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjU0MTYsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI1NTYwLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI1NjU2LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI1NzUyLCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyNTg5NiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyNTk5MiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyNjA4OCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjYyMzIsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjYzMjgsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjY0MjQsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI2NTY4LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI2NjY0LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI2NzYwLCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyNjkwNCwiYnl0ZUxlbmd0aCI6NDU2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjczNjAsImJ5dGVMZW5ndGgiOjQ1NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI3ODE2LCJieXRlTGVuZ3RoIjo4NjQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyODY4MCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyODc3NiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyODg3MiwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjkwMTYsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjkxMTIsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MjkyMDgsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI5MzUyLCJieXRlTGVuZ3RoIjo0NTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyOTgwOCwiYnl0ZUxlbmd0aCI6NDU2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzAyNjQsImJ5dGVMZW5ndGgiOjg2NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMxMTI4LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMxMjI0LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMxMzIwLCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozMTQ2NCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozMTU2MCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozMTY1NiwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzE4MDAsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzE4OTYsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzE5OTIsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMyMTM2LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMyMjMyLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMyMzI4LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozMjQ3MiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozMjU2OCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozMjY2NCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzI4MDgsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzI5MDQsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzMwMDAsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMzMTQ0LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMzMjQwLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMzMzM2LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozMzQ4MCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozMzU3NiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozMzY3MiwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzM4MTYsImJ5dGVMZW5ndGgiOjM2MCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM0MTc2LCJieXRlTGVuZ3RoIjozNjAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozNDUzNiwiYnl0ZUxlbmd0aCI6NjcyLCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzUyMDgsImJ5dGVMZW5ndGgiOjM2MCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM1NTY4LCJieXRlTGVuZ3RoIjozNjAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozNTkyOCwiYnl0ZUxlbmd0aCI6NjcyLCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzY2MDAsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzY2OTYsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MzY3OTIsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM2OTM2LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM3MDMyLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM3MTI4LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozNzI3MiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozNzM2OCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozNzQ2NCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6Mzc2MDgsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6Mzc3MDQsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6Mzc4MDAsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM3OTQ0LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM4MDQwLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM4MTM2LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozODI4MCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozODM3NiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozODQ3MiwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6Mzg2MTYsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6Mzg3MTIsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6Mzg4MDgsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM4OTUyLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM5MDQ4LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjM5MTQ0LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjozOTI4OCwiYnl0ZUxlbmd0aCI6Njk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6Mzk5ODQsImJ5dGVMZW5ndGgiOjY5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjQwNjgwLCJieXRlTGVuZ3RoIjoxMzQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDIwMjQsImJ5dGVMZW5ndGgiOjY5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjQyNzIwLCJieXRlTGVuZ3RoIjo2OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo0MzQxNiwiYnl0ZUxlbmd0aCI6MTM0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjQ0NzYwLCJieXRlTGVuZ3RoIjo2MDAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo0NTM2MCwiYnl0ZUxlbmd0aCI6NjAwLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDU5NjAsImJ5dGVMZW5ndGgiOjExNTIsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo0NzExMiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo0NzIwOCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo0NzMwNCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDc0NDgsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDc1NDQsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDc2NDAsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjQ3Nzg0LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjQ3ODgwLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjQ3OTc2LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo0ODEyMCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo0ODIxNiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo0ODMxMiwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDg0NTYsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDg1NTIsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDg2NDgsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjQ4NzkyLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjQ4ODg4LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjQ4OTg0LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo0OTEyOCwiYnl0ZUxlbmd0aCI6NTA0LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDk2MzIsImJ5dGVMZW5ndGgiOjUwNCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjUwMTM2LCJieXRlTGVuZ3RoIjo5NjAsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1MTA5NiwiYnl0ZUxlbmd0aCI6Njk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTE3OTIsImJ5dGVMZW5ndGgiOjY5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjUyNDg4LCJieXRlTGVuZ3RoIjoxMzQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTM4MzIsImJ5dGVMZW5ndGgiOjY5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjU0NTI4LCJieXRlTGVuZ3RoIjo2OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1NTIyNCwiYnl0ZUxlbmd0aCI6MTM0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjU2NTY4LCJieXRlTGVuZ3RoIjo2MDAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1NzE2OCwiYnl0ZUxlbmd0aCI6NjAwLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTc3NjgsImJ5dGVMZW5ndGgiOjExNTIsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1ODkyMCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1OTAxNiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1OTExMiwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTkyNTYsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTkzNTIsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTk0NDgsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjU5NTkyLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjU5Njg4LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjU5Nzg0LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1OTkyOCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo2MDAyNCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo2MDEyMCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NjAyNjQsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NjAzNjAsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NjA0NTYsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjYwNjAwLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjYwNjk2LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjYwNzkyLCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo2MDkzNiwiYnl0ZUxlbmd0aCI6NTA0LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NjE0NDAsImJ5dGVMZW5ndGgiOjUwNCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjYxOTQ0LCJieXRlTGVuZ3RoIjo5NjAsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo2MjkwNCwiYnl0ZUxlbmd0aCI6Njk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NjM2MDAsImJ5dGVMZW5ndGgiOjY5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjY0Mjk2LCJieXRlTGVuZ3RoIjoxMzQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NjU2NDAsImJ5dGVMZW5ndGgiOjY5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjY2MzM2LCJieXRlTGVuZ3RoIjo2OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo2NzAzMiwiYnl0ZUxlbmd0aCI6MTM0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjY4Mzc2LCJieXRlTGVuZ3RoIjo2MDAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo2ODk3NiwiYnl0ZUxlbmd0aCI6NjAwLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6Njk1NzYsImJ5dGVMZW5ndGgiOjExNTIsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3MDcyOCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3MDgyNCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3MDkyMCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NzEwNjQsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NzExNjAsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NzEyNTYsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjcxNDAwLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjcxNDk2LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjcxNTkyLCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3MTczNiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3MTgzMiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3MTkyOCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NzIwNzIsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NzIxNjgsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NzIyNjQsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjcyNDA4LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjcyNTA0LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjcyNjAwLCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3Mjc0NCwiYnl0ZUxlbmd0aCI6NTA0LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NzMyNDgsImJ5dGVMZW5ndGgiOjUwNCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjczNzUyLCJieXRlTGVuZ3RoIjo5NjAsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3NDcxMiwiYnl0ZUxlbmd0aCI6Njk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NzU0MDgsImJ5dGVMZW5ndGgiOjY5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjc2MTA0LCJieXRlTGVuZ3RoIjoxMzQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6Nzc0NDgsImJ5dGVMZW5ndGgiOjY5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjc4MTQ0LCJieXRlTGVuZ3RoIjo2OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3ODg0MCwiYnl0ZUxlbmd0aCI6MTM0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjgwMTg0LCJieXRlTGVuZ3RoIjo2MDAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo4MDc4NCwiYnl0ZUxlbmd0aCI6NjAwLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6ODEzODQsImJ5dGVMZW5ndGgiOjExNTIsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo4MjUzNiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo4MjYzMiwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo4MjcyOCwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6ODI4NzIsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6ODI5NjgsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6ODMwNjQsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjgzMjA4LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjgzMzA0LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjgzNDAwLCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo4MzU0NCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo4MzY0MCwiYnl0ZUxlbmd0aCI6OTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo4MzczNiwiYnl0ZUxlbmd0aCI6MTQ0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6ODM4ODAsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6ODM5NzYsImJ5dGVMZW5ndGgiOjk2LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6ODQwNzIsImJ5dGVMZW5ndGgiOjE0NCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjg0MjE2LCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjg0MzEyLCJieXRlTGVuZ3RoIjo5NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjg0NDA4LCJieXRlTGVuZ3RoIjoxNDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo4NDU1MiwiYnl0ZUxlbmd0aCI6NTA0LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6ODUwNTYsImJ5dGVMZW5ndGgiOjUwNCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjg1NTYwLCJieXRlTGVuZ3RoIjo5NjAsInRhcmdldCI6MzQ5NjN9XSwiYnVmZmVycyI6W3siYnl0ZUxlbmd0aCI6ODY1MjB9XSwibWF0ZXJpYWxzIjpbeyJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlswLjAsMC43OCwxLjAsMS4wXSwibWV0YWxsaWNGYWN0b3IiOjAuODgsInJvdWdobmVzc0ZhY3RvciI6MC4xMn0sImVtaXNzaXZlRmFjdG9yIjpbMC4wLDAuMCwwLjBdLCJhbHBoYU1vZGUiOiJPUEFRVUUiLCJkb3VibGVTaWRlZCI6ZmFsc2UsIm5hbWUiOiJwYWludCJ9LHsicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC4wNCwwLjA5LDAuMTQsMS4wXSwibWV0YWxsaWNGYWN0b3IiOjAuMiwicm91Z2huZXNzRmFjdG9yIjowLjA2fSwiZW1pc3NpdmVGYWN0b3IiOlswLjAsMC4wLDAuMF0sImRvdWJsZVNpZGVkIjp0cnVlLCJuYW1lIjoiZ2xhc3MifSx7InBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuMDUsMC4wNSwwLjA2LDEuMF0sIm1ldGFsbGljRmFjdG9yIjowLjQsInJvdWdobmVzc0ZhY3RvciI6MC41NX0sImVtaXNzaXZlRmFjdG9yIjpbMC4wLDAuMCwwLjBdLCJhbHBoYU1vZGUiOiJPUEFRVUUiLCJkb3VibGVTaWRlZCI6ZmFsc2UsIm5hbWUiOiJkYXJrIn0seyJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlswLjgsMC4wMiwwLjAyLDEuMF0sIm1ldGFsbGljRmFjdG9yIjowLjMsInJvdWdobmVzc0ZhY3RvciI6MC4xNX0sImVtaXNzaXZlRmFjdG9yIjpbMC4wLDAuMCwwLjBdLCJhbHBoYU1vZGUiOiJPUEFRVUUiLCJkb3VibGVTaWRlZCI6ZmFsc2UsIm5hbWUiOiJicmFrZSJ9LHsicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC4wNCwwLjA0LDAuMDQsMS4wXSwibWV0YWxsaWNGYWN0b3IiOjAuMCwicm91Z2huZXNzRmFjdG9yIjowLjk4fSwiZW1pc3NpdmVGYWN0b3IiOlswLjAsMC4wLDAuMF0sImFscGhhTW9kZSI6Ik9QQVFVRSIsImRvdWJsZVNpZGVkIjpmYWxzZSwibmFtZSI6InR5cmUifSx7InBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuODUsMC44NSwwLjg1LDEuMF0sIm1ldGFsbGljRmFjdG9yIjoxLjAsInJvdWdobmVzc0ZhY3RvciI6MC4wNH0sImVtaXNzaXZlRmFjdG9yIjpbMC4wLDAuMCwwLjBdLCJhbHBoYU1vZGUiOiJPUEFRVUUiLCJkb3VibGVTaWRlZCI6ZmFsc2UsIm5hbWUiOiJyaW0ifSx7InBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuMSwwLjEsMC4xLDEuMF0sIm1ldGFsbGljRmFjdG9yIjowLjksInJvdWdobmVzc0ZhY3RvciI6MC4zNX0sImVtaXNzaXZlRmFjdG9yIjpbMC4wLDAuMCwwLjBdLCJhbHBoYU1vZGUiOiJPUEFRVUUiLCJkb3VibGVTaWRlZCI6ZmFsc2UsIm5hbWUiOiJyaW1kYXJrIn0seyJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlsxLjAsMC45NywwLjksMS4wXSwibWV0YWxsaWNGYWN0b3IiOjAuMCwicm91Z2huZXNzRmFjdG9yIjowLjA1fSwiZW1pc3NpdmVGYWN0b3IiOlsxLjAsMC45NSwwLjhdLCJhbHBoYU1vZGUiOiJPUEFRVUUiLCJkb3VibGVTaWRlZCI6ZmFsc2UsIm5hbWUiOiJoZWFkbGlnaHQifSx7InBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuNiwwLjAsMC4wLDEuMF0sIm1ldGFsbGljRmFjdG9yIjowLjAsInJvdWdobmVzc0ZhY3RvciI6MC4wOH0sImVtaXNzaXZlRmFjdG9yIjpbMS4wLDAuMCwwLjBdLCJhbHBoYU1vZGUiOiJPUEFRVUUiLCJkb3VibGVTaWRlZCI6ZmFsc2UsIm5hbWUiOiJ0YWlsbGlnaHQifSx7InBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuOTUsMC45NSwwLjk1LDEuMF0sIm1ldGFsbGljRmFjdG9yIjoxLjAsInJvdWdobmVzc0ZhY3RvciI6MC4wM30sImVtaXNzaXZlRmFjdG9yIjpbMC4wLDAuMCwwLjBdLCJhbHBoYU1vZGUiOiJPUEFRVUUiLCJkb3VibGVTaWRlZCI6ZmFsc2UsIm5hbWUiOiJjaHJvbWUifV0sIm1lc2hlcyI6W3sicHJpbWl0aXZlcyI6W3siYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6MCwiTk9STUFMIjoxfSwiaW5kaWNlcyI6MiwibW9kZSI6NCwibWF0ZXJpYWwiOjB9LHsiYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6MywiTk9STUFMIjo0fSwiaW5kaWNlcyI6NSwibW9kZSI6NCwibWF0ZXJpYWwiOjJ9LHsiYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6NiwiTk9STUFMIjo3fSwiaW5kaWNlcyI6OCwibW9kZSI6NCwibWF0ZXJpYWwiOjJ9LHsiYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6OSwiTk9STUFMIjoxMH0sImluZGljZXMiOjExLCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjoxMiwiTk9STUFMIjoxM30sImluZGljZXMiOjE0LCJtb2RlIjo0LCJtYXRlcmlhbCI6MX0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjoxNSwiTk9STUFMIjoxNn0sImluZGljZXMiOjE3LCJtb2RlIjo0LCJtYXRlcmlhbCI6MX0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjoxOCwiTk9STUFMIjoxOX0sImluZGljZXMiOjIwLCJtb2RlIjo0LCJtYXRlcmlhbCI6MX0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjoyMSwiTk9STUFMIjoyMn0sImluZGljZXMiOjIzLCJtb2RlIjo0LCJtYXRlcmlhbCI6MX0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjoyNCwiTk9STUFMIjoyNX0sImluZGljZXMiOjI2LCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjoyNywiTk9STUFMIjoyOH0sImluZGljZXMiOjI5LCJtb2RlIjo0LCJtYXRlcmlhbCI6MH0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjozMCwiTk9STUFMIjozMX0sImluZGljZXMiOjMyLCJtb2RlIjo0LCJtYXRlcmlhbCI6MH0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjozMywiTk9STUFMIjozNH0sImluZGljZXMiOjM1LCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjozNiwiTk9STUFMIjozN30sImluZGljZXMiOjM4LCJtb2RlIjo0LCJtYXRlcmlhbCI6OX0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjozOSwiTk9STUFMIjo0MH0sImluZGljZXMiOjQxLCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo0MiwiTk9STUFMIjo0M30sImluZGljZXMiOjQ0LCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo0NSwiTk9STUFMIjo0Nn0sImluZGljZXMiOjQ3LCJtb2RlIjo0LCJtYXRlcmlhbCI6N30seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo0OCwiTk9STUFMIjo0OX0sImluZGljZXMiOjUwLCJtb2RlIjo0LCJtYXRlcmlhbCI6N30seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo1MSwiTk9STUFMIjo1Mn0sImluZGljZXMiOjUzLCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo1NCwiTk9STUFMIjo1NX0sImluZGljZXMiOjU2LCJtb2RlIjo0LCJtYXRlcmlhbCI6N30seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo1NywiTk9STUFMIjo1OH0sImluZGljZXMiOjU5LCJtb2RlIjo0LCJtYXRlcmlhbCI6N30seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo2MCwiTk9STUFMIjo2MX0sImluZGljZXMiOjYyLCJtb2RlIjo0LCJtYXRlcmlhbCI6MH0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo2MywiTk9STUFMIjo2NH0sImluZGljZXMiOjY1LCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo2NiwiTk9STUFMIjo2N30sImluZGljZXMiOjY4LCJtb2RlIjo0LCJtYXRlcmlhbCI6OH0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo2OSwiTk9STUFMIjo3MH0sImluZGljZXMiOjcxLCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo3MiwiTk9STUFMIjo3M30sImluZGljZXMiOjc0LCJtb2RlIjo0LCJtYXRlcmlhbCI6OH0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo3NSwiTk9STUFMIjo3Nn0sImluZGljZXMiOjc3LCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo3OCwiTk9STUFMIjo3OX0sImluZGljZXMiOjgwLCJtb2RlIjo0LCJtYXRlcmlhbCI6OH0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo4MSwiTk9STUFMIjo4Mn0sImluZGljZXMiOjgzLCJtb2RlIjo0LCJtYXRlcmlhbCI6OX0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo4NCwiTk9STUFMIjo4NX0sImluZGljZXMiOjg2LCJtb2RlIjo0LCJtYXRlcmlhbCI6OX0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo4NywiTk9STUFMIjo4OH0sImluZGljZXMiOjg5LCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo5MCwiTk9STUFMIjo5MX0sImluZGljZXMiOjkyLCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo5MywiTk9STUFMIjo5NH0sImluZGljZXMiOjk1LCJtb2RlIjo0LCJtYXRlcmlhbCI6MH0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo5NiwiTk9STUFMIjo5N30sImluZGljZXMiOjk4LCJtb2RlIjo0LCJtYXRlcmlhbCI6Mn0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo5OSwiTk9STUFMIjoxMDB9LCJpbmRpY2VzIjoxMDEsIm1vZGUiOjQsIm1hdGVyaWFsIjoxfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEwMiwiTk9STUFMIjoxMDN9LCJpbmRpY2VzIjoxMDQsIm1vZGUiOjQsIm1hdGVyaWFsIjowfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEwNSwiTk9STUFMIjoxMDZ9LCJpbmRpY2VzIjoxMDcsIm1vZGUiOjQsIm1hdGVyaWFsIjoyfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEwOCwiTk9STUFMIjoxMDl9LCJpbmRpY2VzIjoxMTAsIm1vZGUiOjQsIm1hdGVyaWFsIjoxfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjExMSwiTk9STUFMIjoxMTJ9LCJpbmRpY2VzIjoxMTMsIm1vZGUiOjQsIm1hdGVyaWFsIjo0fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjExNCwiTk9STUFMIjoxMTV9LCJpbmRpY2VzIjoxMTYsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjExNywiTk9STUFMIjoxMTh9LCJpbmRpY2VzIjoxMTksIm1vZGUiOjQsIm1hdGVyaWFsIjo2fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEyMCwiTk9STUFMIjoxMjF9LCJpbmRpY2VzIjoxMjIsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEyMywiTk9STUFMIjoxMjR9LCJpbmRpY2VzIjoxMjUsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEyNiwiTk9STUFMIjoxMjd9LCJpbmRpY2VzIjoxMjgsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEyOSwiTk9STUFMIjoxMzB9LCJpbmRpY2VzIjoxMzEsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEzMiwiTk9STUFMIjoxMzN9LCJpbmRpY2VzIjoxMzQsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEzNSwiTk9STUFMIjoxMzZ9LCJpbmRpY2VzIjoxMzcsIm1vZGUiOjQsIm1hdGVyaWFsIjozfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjEzOCwiTk9STUFMIjoxMzl9LCJpbmRpY2VzIjoxNDAsIm1vZGUiOjQsIm1hdGVyaWFsIjo2fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE0MSwiTk9STUFMIjoxNDJ9LCJpbmRpY2VzIjoxNDMsIm1vZGUiOjQsIm1hdGVyaWFsIjo0fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE0NCwiTk9STUFMIjoxNDV9LCJpbmRpY2VzIjoxNDYsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE0NywiTk9STUFMIjoxNDh9LCJpbmRpY2VzIjoxNDksIm1vZGUiOjQsIm1hdGVyaWFsIjo2fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE1MCwiTk9STUFMIjoxNTF9LCJpbmRpY2VzIjoxNTIsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE1MywiTk9STUFMIjoxNTR9LCJpbmRpY2VzIjoxNTUsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE1NiwiTk9STUFMIjoxNTd9LCJpbmRpY2VzIjoxNTgsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE1OSwiTk9STUFMIjoxNjB9LCJpbmRpY2VzIjoxNjEsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE2MiwiTk9STUFMIjoxNjN9LCJpbmRpY2VzIjoxNjQsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE2NSwiTk9STUFMIjoxNjZ9LCJpbmRpY2VzIjoxNjcsIm1vZGUiOjQsIm1hdGVyaWFsIjozfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE2OCwiTk9STUFMIjoxNjl9LCJpbmRpY2VzIjoxNzAsIm1vZGUiOjQsIm1hdGVyaWFsIjo2fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE3MSwiTk9STUFMIjoxNzJ9LCJpbmRpY2VzIjoxNzMsIm1vZGUiOjQsIm1hdGVyaWFsIjo0fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE3NCwiTk9STUFMIjoxNzV9LCJpbmRpY2VzIjoxNzYsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE3NywiTk9STUFMIjoxNzh9LCJpbmRpY2VzIjoxNzksIm1vZGUiOjQsIm1hdGVyaWFsIjo2fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE4MCwiTk9STUFMIjoxODF9LCJpbmRpY2VzIjoxODIsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE4MywiTk9STUFMIjoxODR9LCJpbmRpY2VzIjoxODUsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE4NiwiTk9STUFMIjoxODd9LCJpbmRpY2VzIjoxODgsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE4OSwiTk9STUFMIjoxOTB9LCJpbmRpY2VzIjoxOTEsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE5MiwiTk9STUFMIjoxOTN9LCJpbmRpY2VzIjoxOTQsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE5NSwiTk9STUFMIjoxOTZ9LCJpbmRpY2VzIjoxOTcsIm1vZGUiOjQsIm1hdGVyaWFsIjozfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE5OCwiTk9STUFMIjoxOTl9LCJpbmRpY2VzIjoyMDAsIm1vZGUiOjQsIm1hdGVyaWFsIjo2fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjIwMSwiTk9STUFMIjoyMDJ9LCJpbmRpY2VzIjoyMDMsIm1vZGUiOjQsIm1hdGVyaWFsIjo0fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjIwNCwiTk9STUFMIjoyMDV9LCJpbmRpY2VzIjoyMDYsIm1vZGUiOjQsIm1hdGVyaWFsIjo1fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjIwNywiTk9STUFMIjoy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WAAAAGMAAABiAAAAWgAAAFsAAABlAAAAWgAAAGUAAABkAAAAWwAAAFwAAABmAAAAWwAAAGYAAABlAAAAXAAAAF0AAABnAAAAXAAAAGcAAABmAAAAXQAAAF4AAABoAAAAXQAAAGgAAABnAAAAXgAAAF8AAABpAAAAXgAAAGkAAABoAAAAXwAAAGAAAABqAAAAXwAAAGoAAABpAAAAYAAAAGEAAABrAAAAYAAAAGsAAABqAAAAYQAAAGIAAABsAAAAYQAAAGwAAABrAAAAYgAAAGMAAABtAAAAYgAAAG0AAABsAAAAZAAAAGUAAABvAAAAZAAAAG8AAABuAAAAZQAAAGYAAABwAAAAZQAAAHAAAABvAAAAZgAAAGcAAABxAAAAZgAAAHEAAABwAAAAZwAAAGgAAAByAAAAZwAAAHIAAABxAAAAaAAAAGkAAABzAAAAaAAAAHMAAAByAAAAaQAAAGoAAAB0AAAAaQAAAHQAAABzAAAAagAAAGsAAAB1AAAAagAAAHUAAAB0AAAAawAAAGwAAAB2AAAAawAAAHYAAAB1AAAAbAAAAG0AAAB3AAAAbAAAAHcAAAB2AAAAbgAAAG8AAAB5AAAAbgAAAHkAAAB4AAAAbwAAAHAAAAB6AAAAbwAAAHoAAAB5AAAAcAAAAHEAAAB7AAAAcAAAAHsAAAB6AAAAcQAAAHIAAAB8AAAAcQAAAHwAAAB7AAAAcgAAAHMAAAB9AAAAcgAAAH0AAAB8AAAAcwAAAHQAAAB+AAAAcwAAAH4AAAB9AAAAdAAAAHUAAAB/AAAAdAAAAH8AAAB+AAAAdQAAAHYAAACAAAAAdQAAAIAAAAB/AAAAdgAAAHcAAACBAAAAdgAAAIEAAACAAAAAeAAAAHkAAACDAAAAeAAAAIMAAACCAAAAeQAAAHoAAACEAAAAeQAAAIQAAACDAAAAegAAAHsAAACFAAAAegAAAIUAAACEAAAAewAAAHwAAACGAAAAewAAAIYAAACFAAAAfAAAAH0AAACHAAAAfAAAAIcAAACGAAAAfQAAAH4AAACIAAAAfQAAAIgAAACHAAAAfgAAAH8AAACJAAAAfgAAAIkAAACIAAAAfwAAAIAAAACKAAAAfwAAAIoAAACJAAAAgAAAAIEAAACLAAAAgAAAAIsAAACKAAAAggAAAIMAAACNAAAAggAAAI0AAACMAAAAgwAAAIQAAACOAAAAgwAAAI4AAACNAAAAhAAAAIUAAACPAAAAhAAAAI8AAACOAAAAhQAAAIYAAACQAAAAhQAAAJAAAACPAAAAhgAAAIcAAACRAAAAhgAAAJEAAACQAAAAhwAAAIgAAACSAAAAhwAAAJIAAACRAAAAiAAAAIkAAACTAAAAiAAAAJMAAACSAAAAiQAAAIoAAACUAAAAiQAAAJQAAACTAAAAigAAAIsAAACVAAAAigAAAJUAAACUAAAAjAAAAI0AAACXAAAAjAAAAJcAAACWAAAAjQAAAI4AAACYAAAAjQAAAJgAAACXAAAAjgAAAI8AAACZAAAAjgAAAJkAAACYAAAAjwAAAJAAAACaAAAAjwAAAJoAAACZAAAAkAAAAJEAAACbAAAAkAAAAJsAAACaAAAAkQAAAJIAAACcAAAAkQAAAJwAAACbAAAAkgAAAJMAAACdAAAAkgAAAJ0AAACcAAAAkwAAAJQAAACeAAAAkwAAAJ4AAACdAAAAlAAAAJUAAACfAAAAlAAAAJ8AAACeAAAAlgAAAJcAAAChAAAAlgAAAKEAAACgAAAAlwAAAJgAAACiAAAAlwAAAKIAAAChAAAAmAAAAJkAAACjAAAAmAAAAKMAAACiAAAAmQAAAJoAAACkAAAAmQAAAKQAAACjAAAAmgAAAJsAAAClAAAAmgAAAKUAAACkAAAAmwAAAJwAAACmAAAAmwAAAKYAAAClAAAAnAAAAJ0AAACnAAAAnAAAAKcAAACmAAAAnQAAAJ4AAACoAAAAnQAAAKgAAACnAAAAngAAAJ8AAACpAAAAngAAAKkAAACoAAAAoAAAAKEAAACrAAAAoAAAAKsAAACqAAAAoQAAAKIAAACsAAAAoQAAAKwAAACrAAAAogAAAKMAAACtAAAAogAAAK0AAACsAAAAowAAAKQAAACuAAAAowAAAK4AAACtAAAApAAAAKUAAACvAAAApAAAAK8AAACuAAAApQAAAKYAAACwAAAApQAAALAAAACvAAAApgAAAKcAAACxAAAApgAAALEAAACwAAAApwAAAKgAAACyAAAApwAAALIAAACxAAAAqAAAAKkAAACzAAAAqAAAALMAAACyAAAAqgAAAKsAAAC1AAAAqgAAALUAAAC0AAAAqwAAAKwAAAC2AAAAqwAAALYAAAC1AAAArAAAAK0AAAC3AAAArAAAALcAAAC2AAAArQAAAK4AAAC4AAAArQAAALgAAAC3AAAArgAAAK8AAAC5AAAArgAAALkAAAC4AAAArwAAALAAAAC6AAAArwAAALoAAAC5AAAAsAAAALEAAAC7AAAAsAAAALsAAAC6AAAAsQAAALIAAAC8AAAAsQAAALwAAAC7AAAAsgAAALMAAAC9AAAAsgAAAL0AAAC8AAAAtAAAALUAAAC/AAAAtAAAAL8AAAC+AAAAtQAAALYAAADAAAAAtQAAAMAAAAC/AAAAtgAAALcAAADBAAAAtgAAAMEAAADAAAAAtwAAALgAAADCAAAAtwAAAMIAAADBAAAAuAAAALkAAADDAAAAuAAAAMMAAADCAAAAuQAAALoAAADEAAAAuQAAAMQAAADDAAAAugAAALsAAADFAAAAugAAAMUAAADEAAAAuwAAALwAAADGAAAAuwAAAMYAAADFAAAAvAAAAL0AAADHAAAAvAAAAMcAAADGAAAAvgAAAL8AAADJAAAAvgAAAMkAAADIAAAAvwAAAMAAAADKAAAAvwAAAMoAAADJAAAAwAAAAMEAAADLAAAAwAAAAMsAAADKAAAAwQAAAMIAAADMAAAAwQAAAMwAAADLAAAAwgAAAMMAAADNAAAAwgAAAM0AAADMAAAAwwAAAMQAAADOAAAAwwAAAM4AAADNAAAAxAAAAMUAAADPAAAAxAAAAM8AAADOAAAAxQAAAMYAAADQAAAAxQAAANAAAADPAAAAxgAAAMcAAADRAAAAxgAAANEAAADQAAAAyAAAAMkAAADTAAAAyAAAANMAAADSAAAAyQAAAMoAAADUAAAAyQAAANQAAADTAAAAygAAAMsAAADVAAAAygAAANUAAADUAAAAywAAAMwAAADWAAAAywAAANYAAADVAAAAzAAAAM0AAADXAAAAzAAAANcAAADWAAAAzQAAAM4AAADYAAAAzQAAANgAAADXAAAAzgAAAM8AAADZAAAAzgAAANkAAADYAAAAzwAAANAAAADaAAAAzwAAANoAAADZAAAA0AAAANEAAADbAAAA0AAAANsAAADaAAAA0gAAANMAAADdAAAA0gAAAN0AAADcAAAA0wAAANQAAADeAAAA0wAAAN4AAADdAAAA1AAAANUAAADfAAAA1AAAAN8AAADeAAAA1QAAANYAAADgAAAA1QAAAOAAAADfAAAA1gAAANcAAADhAAAA1gAAAOEAAADgAAAA1wAAANgAAADiAAAA1wAAAOIAAADhAAAA2AAAANkAAADjAAAA2AAAAOMAAADiAAAA2QAAANoAAADkAAAA2QAAAOQAAADjAAAA2gAAANsAAADlAAAA2gAAAOUAAADkAAAA3AAAAN0AAADnAAAA3AAAAOcAAADmAAAA3QAAAN4AAADoAAAA3QAAAOgAAADnAAAA3gAAAN8AAADpAAAA3gAAAOkAAADoAAAA3wAAAOAAAADqAAAA3wAAAOoAAADpAAAA4AAAAOEAAADrAAAA4AAAAOsAAADqAAAA4QAAAOIAAADsAAAA4QAAAOwAAADrAAAA4gAAAOMAAADtAAAA4gAAAO0AAADsAAAA4wAAAOQAAADuAAAA4wAAAO4AAADtAAAA5AAAAOUAAADvAAAA5AAAAO8AAADuAAAA5gAAAOcAAADxAAAA5gAAAPEAAADwAAAA5wAAAOgAAADyAAAA5wAAAPIAAADxAAAA6AAAAOkAAADzAAAA6AAAAPMAAADyAAAA6QAAAOoAAAD0AAAA6QAAAPQAAADzAAAA6gAAAOsAAAD1AAAA6gAAAPUAAAD0AAAA6wAAAOwAAAD2AAAA6wAAAPYAAAD1AAAA7AAAAO0AAAD3AAAA7AAAAPcAAAD2AAAA7QAAAO4AAAD4AAAA7QAAAPgAAAD3AAAA7gAAAO8AAAD5AAAA7gAAAPkAAAD4AAAA8AAAAPEAAAD7AAAA8AAAAPsAAAD6AAAA8QAAAPIAAAD8AAAA8QAAAPwAAAD7AAAA8gAAAPMAAAD9AAAA8gAAAP0AAAD8AAAA8wAAAPQAAAD+AAAA8wAAAP4AAAD9AAAA9AAAAPUAAAD/AAAA9AAAAP8AAAD+AAAA9QAAAPYAAAAAAQAA9QAAAAABAAD/AAAA9gAAAPcAAAABAQAA9gAAAAEBAAAAAQAA9wAAAPgAAAACAQAA9wAAAAIBAAABAQAA+AAAAPkAAAADAQAA+AAAAAMBAAACAQAA+gAAAPsAAAAFAQAA+gAAAAUBAAAEAQAA+wAAAPwAAAAGAQAA+wAAAAYBAAAFAQAA/AAAAP0AAAAHAQAA/AAAAAcBAAAGAQAA/QAAAP4AAAAIAQAA/QAAAAgBAAAHAQAA/gAAAP8AAAAJAQAA/gAAAAkBAAAIAQAA/wAAAAABAAAKAQAA/wAAAAoBAAAJAQAAAAEAAAEBAAALAQAAAAEAAAsBAAAKAQAAAQEAAAIBAAAMAQAAAQEAAAwBAAALAQAAAgEAAAMBAAANAQAAAgEAAA0BAAAMAQAABAEAAAUBAAAPAQAABAEAAA8BAAAOAQAABQEAAAYBAAAQAQAABQEAABABAAAPAQAABgEAAAcBAAARAQAABgEAABEBAAAQAQAABwEAAAgBAAASAQAABwEAABIBAAARAQAACAEAAAkBAAATAQAACAEAABMBAAASAQAACQEAAAoBAAAUAQAACQEAABQBAAATAQAACgEAAAsBAAAVAQAACgEAABUBAAAUAQAACwEAAAwBAAAWAQAACwEAABYBAAAVAQAADAEAAA0BAAAXAQAADAEAABcBAAAWAQAADgEAAA8BAAAZAQAADgEAABkBAAAYAQAADwEAABABAAAaAQAADwEAABoBAAAZAQAAEAEAABEBAAAbAQAAEAEAABsBAAAaAQAAEQEAABIBAAAcAQAAEQEAABwBAAAbAQAAEgEAABMBAAAdAQAAEgEAAB0BAAAcAQAAEwEAABQBAAAeAQAAEwEAAB4BAAAdAQAAFAEAABUBAAAfAQAAFAEAAB8BAAAeAQAAFQEAABYBAAAgAQAAFQEAACABAAAfAQAAFgEAABcBAAAhAQAAFgEAACEBAAAgAQAAGAEAABkBAAAjAQAAGAEAACMBAAAiAQAAGQEAABoBAAAkAQAAGQEAACQBAAAjAQAAGgEAABsBAAAlAQAAGgEAACUBAAAkAQAAGwEAABwBAAAmAQAAGwEAACYBAAAlAQAAHAEAAB0BAAAnAQAAHAEAACcBAAAmAQAAHQEAAB4BAAAoAQAAHQEAACgBAAAnAQAAHgEAAB8BAAApAQAAHgEAACkBAAAoAQAAHwEAACABAAAqAQAAHwEAACoBAAApAQAAIAEAACEBAAArAQAAIAEAACsBAAAqAQAAIgEAACMBAAAtAQAAIgEAAC0BAAAsAQAAIwEAACQBAAAuAQAAIwEAAC4BAAAtAQAAJAEAACUBAAAvAQAAJAEAAC8BAAAuAQAAJQEAACYBAAAwAQAAJQEAADABAAAvAQAAJgEAACcBAAAxAQAAJgEAADEBAAAwAQAAJwEAACgBAAAyAQAAJwEAADIBAAAxAQAAKAEAACkBAAAzAQAAKAEAADMBAAAyAQAAKQEAACoBAAA0AQAAKQEAADQBAAAzAQAAKgEAACsBAAA1AQAAKgEAADUBAAA0AQAALAEAAC0BAAA3AQAALAEAADcBAAA2AQAALQEAAC4BAAA4AQAALQEAADgBAAA3AQAALgEAAC8BAAA5AQAALgEAADkBAAA4AQAALwEAADABAAA6AQAALwEAADoBAAA5AQAAMAEAADEBAAA7AQAAMAEAADsBAAA6AQAAMQEAADIBAAA8AQAAMQEAADwBAAA7AQAAMgEAADMBAAA9AQAAMgEAAD0BAAA8AQAAMwEAADQBAAA+AQAAMwEAAD4BAAA9AQAANAEAADUBAAA/AQAANAEAAD8BAAA+AQAANgEAADcBAABBAQAANgEAAEEBAABAAQAANwEAADgBAABCAQAANwEAAEIBAABBAQAAOAEAADkBAABDAQAAOAEAAEMBAABCAQAAOQEAADoBAABEAQAAOQEAAEQBAABDAQAAOgEAADsBAABFAQAAOgEAAEUBAABEAQAAOwEAADwBAABGAQAAOwEAAEYBAABFAQAAPAEAAD0BAABHAQAAPAEAAEcBAABGAQAAPQEAAD4BAABIAQAAPQEAAEgBAABHAQAAPgEAAD8BAABJAQAAPgEAAEkBAABIAQAAQAEAAEEBAABLAQAAQAEAAEsBAABKAQAAQQEAAEIBAABMAQAAQQEAAEwBAABLAQAAQgEAAEMBAABNAQAAQgEAAE0BAABMAQAAQwEAAEQBAABOAQAAQwEAAE4BAABNAQAARAEAAEUBAABPAQAARAEAAE8BAABOAQAARQEAAEYBAABQAQAARQEAAFABAABPAQAARgEAAEcBAABRAQAARgEAAFEBAABQAQAARwEAAEgBAABSAQAARwEAAFIBAABRAQAASAEAAEkBAABTAQAASAEAAFMBAABSAQAASgEAAEsBAABVAQAASgEAAFUBAABUAQAASwEAAEwBAABWAQAASwEAAFYBAABVAQAATAEAAE0BAABXAQAATAEAAFcBAABWAQAATQEAAE4BAABYAQAATQEAAFgBAABXAQAATgEAAE8BAABZAQAATgEAAFkBAABYAQAATwEAAFABAABaAQAATwEAAFoBAABZAQAAUAEAAFEBAABbAQAAUAEAAFsBAABaAQAAUQEAAFIBAABcAQAAUQEAAFwBAABbAQAAUgEAAFMBAABdAQAAUgEAAF0BAABcAQAAVAEAAFUBAABfAQAAVAEAAF8BAABeAQAAVQEAAFYBAABgAQAAVQEAAGABAABfAQAAVgEAAFcBAABhAQAAVgEAAGEBAABgAQAAVwEAAFgBAABiAQAAVwEAAGIBAABhAQAAWAEAAFkBAABjAQAAWAEAAGMBAABiAQAAWQEAAFoBAABkAQAAWQEAAGQBAABjAQAAWgEAAFsBAABlAQAAWgEAAGUBAABkAQAAWwEAAFwBAABmAQAAWwEAAGYBAABlAQAAXAEAAF0BAABnAQAAXAEAAGcBAABmAQAAXgEAAF8BAABpAQAAXgEAAGkBAABoAQAAXwEAAGABAABqAQAAXwEAAGoBAABpAQAAYAEAAGEBAABrAQAAYAEAAGsBAABqAQAAYQEAAGIBAABsAQAAYQEAAGwBAABrAQAAYgEAAGMBAABtAQAAYgEAAG0BAABsAQAAYwEAAGQBAABuAQAAYwEAAG4BAABtAQAAZAEAAGUBAABvAQAAZAEAAG8BAABuAQAAZQEAAGYBAABwAQAAZQEAAHABAABvAQAAZgEAAGcBAABxAQAAZgEAAHEBAABwAQAAaAEAAGkBAABzAQAAaAEAAHMBAAByAQAAaQEAAGoBAAB0AQAAaQEAAHQBAABzAQAAagEAAGsBAAB1AQAAagEAAHUBAAB0AQAAawEAAGwBAAB2AQAAawEAAHYBAAB1AQAAbAEAAG0BAAB3AQAAbAEAAHcBAAB2AQAAbQEAAG4BAAB4AQAAbQEAAHgBAAB3AQAAbgEAAG8BAAB5AQAAbgEAAHkBAAB4AQAAbwEAAHABAAB6AQAAbwEAAHoBAAB5AQAAcAEAAHEBAAB7AQAAcAEAAHsBAAB6AQAAcgEAAHMBAAB9AQAAcgEAAH0BAAB8AQAAcwEAAHQBAAB+AQAAcwEAAH4BAAB9AQAAdAEAAHUBAAB/AQAAdAEAAH8BAAB+AQAAdQEAAHYBAACAAQAAdQEAAIABAAB/AQAAdgEAAHcBAACBAQAAdgEAAIEBAACAAQAAdwEAAHgBAACCAQAAdwEAAIIBAACBAQAAeAEAAHkBAACDAQAAeAEAAIMBAACCAQAAeQEAAHoBAACEAQAAeQEAAIQBAACDAQAAegEAAHsBAACFAQAAegEAAIUBAACEAQAAfAEAAH0BAACHAQAAfAEAAIcBAACGAQAAfQEAAH4BAACIAQAAfQEAAIgBAACHAQAAfgEAAH8BAACJAQAAfgEAAIkBAACIAQAAfwEAAIABAACKAQAAfwEAAIoBAACJAQAAgAEAAIEBAACLAQAAgAEAAIsBAACKAQAAgQEAAIIBAACMAQAAgQEAAIwBAACLAQAAggEAAIMBAACNAQAAggEAAI0BAACMAQAAgwEAAIQBAACOAQAAgwEAAI4BAACNAQAAhAEAAIUBAACPAQAAhAEAAI8BAACOAQAAhgEAAIcBAACRAQAAhgEAAJEBAACQAQAAhwEAAIgBAACSAQAAhwEAAJIBAACRAQAAiAEAAIkBAACTAQAAiAEAAJMBAACSAQAAiQEAAIoBAACUAQAAiQEAAJQBAACTAQAAigEAAIsBAACVAQAAigEAAJUBAACUAQAAiwEAAIwBAACWAQAAiwEAAJYBAACVAQAAjAEAAI0BAACXAQAAjAEAAJcBAACWAQAAjQEAAI4BAACYAQAAjQEAAJgBAACXAQAAjgEAAI8BAACZAQAAjgEAAJkBAACYAQAAkAEAAJEBAACbAQAAkAEAAJsBAACaAQAAkQEAAJIBAACcAQAAkQEAAJwBAACbAQAAkgEAAJMBAACdAQAAkgEAAJ0BAACcAQAAkwEAAJQBAACeAQAAkwEAAJ4BAACdAQAAlAEAAJUBAACfAQAAlAEAAJ8BAACeAQAAlQEAAJYBAACgAQAAlQEAAKABAACfAQAAlgEAAJcBAAChAQAAlgEAAKEBAACgAQAAlwEAAJgBAACiAQAAlwEAAKIBAAChAQAAmAEAAJkBAACjAQAAmAEAAKMBAACiAQAAmgEAAJsBAAClAQAAmgEAAKUBAACkAQAAmwEAAJwBAACmAQAAmwEAAKYBAAClAQAAnAEAAJ0BAACnAQAAnAEAAKcBAACmAQAAnQEAAJ4BAACoAQAAnQEAAKgBAACnAQAAngEAAJ8BAACpAQAAngEAAKkBAACoAQAAnwEAAKABAACqAQAAnwEAAKoBAACpAQAAoAEAAKEBAACrAQAAoAEAAKsBAACqAQAAoQEAAKIBAACsAQAAoQEAAKwBAACrAQAAogEAAKMBAACtAQAAogEAAK0BAACsAQAApAEAAKUBAACvAQAApAEAAK8BAACuAQAApQEAAKYBAACwAQAApQEAALABAACvAQAApgEAAKcBAACxAQAApgEAALEBAACwAQAApwEAAKgBAACyAQAApwEAALIBAACxAQAAqAEAAKkBAACzAQAAqAEAALMBAACyAQAAqQEAAKoBAAC0AQAAqQEAALQBAACzAQAAqgEAAKsBAAC1AQAAqgEAALUBAAC0AQAAqwEAAKwBAAC2AQAAqwEAALYBAAC1AQAArAEAAK0BAAC3AQAArAEAALcBAAC2AQAArgEAAK8BAAC5AQAArgEAALkBAAC4AQAArwEAALABAAC6AQAArwEAALoBAAC5AQAAsAEAALEBAAC7AQAAsAEAALsBAAC6AQAAsQEAALIBAAC8AQAAsQEAALwBAAC7AQAAsgEAALMBAAC9AQAAsgEAAL0BAAC8AQAAswEAALQBAAC+AQAAswEAAL4BAAC9AQAAtAEAALUBAAC/AQAAtAEAAL8BAAC+AQAAtQEAALYBAADAAQAAtQEAAMABAAC/AQAAtgEAALcBAADBAQAAtgEAAMEBAADAAQAAuAEAALkBAADDAQAAuAEAAMMBAADCAQAAuQEAALoBAADEAQAAuQEAAMQBAADDAQAAugEAALsBAADFAQAAugEAAMUBAADEAQAAuwEAALwBAADGAQAAuwEAAMYBAADFAQAAvAEAAL0BAADHAQAAvAEAAMcBAADGAQAAvQEAAL4BAADIAQAAvQEAAMgBAADHAQAAvgEAAL8BAADJAQAAvgEAAMkBAADIAQAAvwEAAMABAADKAQAAvwEAAMoBAADJAQAAwAEAAMEBAADLAQAAwAEAAMsBAADKAQAAwgEAAMMBAADNAQAAwgEAAM0BAADMAQAAwwEAAMQBAADOAQAAwwEAAM4BAADNAQAAxAEAAMUBAADPAQAAxAEAAM8BAADOAQAAxQEAAMYBAADQAQAAxQEAANABAADPAQAAxgEAAMcBAADRAQAAxgEAANEBAADQAQAAxwEAAMgBAADSAQAAxwEAANIBAADRAQAAyAEAAMkBAADTAQAAyAEAANMBAADSAQAAyQEAAMoBAADUAQAAyQEAANQBAADTAQAAygEAAMsBAADVAQAAygEAANUBAADUAQAAzAEAAM0BAADXAQAAzAEAANcBAADWAQAAzQEAAM4BAADYAQAAzQEAANgBAADXAQAAzgEAAM8BAADZAQAAzgEAANkBAADYAQAAzwEAANABAADaAQAAzwEAANoBAADZAQAA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";

function buildCar(carDef) {
  if (carMesh) { scene.remove(carMesh); carMesh = null; carWheels = []; }

  const col = carDef.color;

  // Decode base64 → ArrayBuffer
  const binStr  = atob(CAR_GLB_B64);
  const bytes   = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  const glbBuffer = bytes.buffer;

  if (!THREE.GLTFLoader) {
    console.warn('GLTFLoader not available, using fallback');
    buildFallbackCar(col);
    return;
  }
  const loader = new THREE.GLTFLoader();
  try {
  loader.parse(glbBuffer, '', (gltf) => {
    const model = gltf.scene;

    // ── Swap materials for this car's colour ──
    const paintCol    = new THREE.Color(col);
    const glowCol     = new THREE.Color(col);

    model.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow    = true;
      child.receiveShadow = false;

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => {
        if (!m) return;
        // Replace paint material with car's colour
        if (m.name === 'paint') {
          m.color.set(paintCol);
          m.roughness    = 0.12;
          m.metalness    = 0.88;
          m.envMapIntensity = 2.0;
          if (scene.environment) m.envMap = scene.environment;
          m.needsUpdate  = true;
        }
        // Chrome / rim — boost env map
        if (m.name === 'rim' || m.name === 'chrome') {
          if (scene.environment) m.envMap = scene.environment;
          m.envMapIntensity = 3.0;
          m.needsUpdate = true;
        }
        // Glass
        if (m.name === 'glass') {
          if (scene.environment) m.envMap = scene.environment;
          m.envMapIntensity = 2.0;
          m.needsUpdate = true;
        }
        // Emissive headlights / taillights get a brightness boost
        if (m.name === 'headlight' || m.name === 'taillight') {
          m.emissiveIntensity = 2.5;
          m.needsUpdate = true;
        }
      });
    });

    // ── Register wheel groups for animation ──
    // Wheel groups are the 4 cylinder assemblies near the ground
    carWheels = [];
    model.traverse(child => {
      if (!child.isMesh) return;
      // Wheels are tyres (rubber material) — their parent group is the wheel
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      if (mats.some(m => m && m.name === 'tyre')) {
        // Use the parent group if it exists, else the mesh itself
        const wNode = child.parent && child.parent.isGroup ? child.parent : child;
        if (!carWheels.includes(wNode)) carWheels.push(wNode);
      }
    });

    // If we couldn't find 4 wheels by material, find them by Y position
    if (carWheels.length < 4) {
      carWheels = [];
      const meshes = [];
      model.traverse(c => { if (c.isMesh) meshes.push(c); });
      // Wheels are at y≈0.345 — find meshes near that height
      const wheelMeshes = meshes.filter(m => {
        const wp = new THREE.Vector3();
        m.getWorldPosition(wp);
        return Math.abs(wp.y - 0.345) < 0.15;
      });
      // Group into 4 positions
      const wheelGroups = new Map();
      wheelMeshes.forEach(m => {
        const wp = new THREE.Vector3(); m.getWorldPosition(wp);
        const key = `${Math.round(wp.x*2)},${Math.round(wp.z*2)}`;
        if (!wheelGroups.has(key)) wheelGroups.set(key, []);
        wheelGroups.get(key).push(m);
      });
      wheelGroups.forEach((meshList, key) => {
        // Create a group for each wheel position
        const wg = new THREE.Group();
        const wp = new THREE.Vector3(); meshList[0].getWorldPosition(wp);
        wg.position.copy(wp);
        carWheels.push(wg);
      });
    }

    // ── Underglow ──
    const glowMat = new THREE.MeshPhongMaterial({color: glowCol, emissive: glowCol, emissiveIntensity: 4.0, transparent: true, opacity: 0.85});
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.68, 3.72), glowMat);
    glow.rotation.x = -Math.PI/2;
    glow.position.set(0, 0.025, 0);
    model.add(glow);

    // Underglow point light
    const uLight = new THREE.PointLight(col, 5, 15);
    uLight.position.set(0, 0.10, 0);
    model.add(uLight);

    // ── Headlight point lights ──
    const hlCol = 0xfff6e0;
    [[-0.58, 0.38,  2.22], [0.58, 0.38,  2.22]].forEach(([x,y,z]) => {
      const hl = new THREE.PointLight(hlCol, 2.0, 45);
      hl.position.set(x,y,z);
      model.add(hl);
    });

    model.position.copy(carPhysics.pos);
    carMesh = model;
    scene.add(carMesh);
  }, (err) => {
    console.error('GLTFLoader error:', err);
    buildFallbackCar(col);
  });
  } catch(parseErr) {
    console.error('GLTFLoader.parse threw:', parseErr);
    buildFallbackCar(col);
  }
}

// Fallback box car if GLTFLoader fails
function buildFallbackCar(col) {
  carMesh = new THREE.Group();
  const mat = new THREE.MeshPhongMaterial({color:col, shininess:250});
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.86,0.42,4.35),mat);
  body.position.y = 0.55; body.castShadow=true; carMesh.add(body);
  const cab  = new THREE.Mesh(new THREE.BoxGeometry(1.55,0.50,2.10),mat);
  cab.position.set(0,0.96,0.08); cab.castShadow=true; carMesh.add(cab);
  carWheels = [];
  [[-1,0.345,1.30],[1,0.345,1.30],[-1,0.345,-1.30],[1,0.345,-1.30]].forEach(([x,y,z])=>{
    const wg=new THREE.Group(); wg.position.set(x*0.98,y,z);
    const w=new THREE.Mesh(new THREE.CylinderGeometry(0.345,0.345,0.225,20),new THREE.MeshPhongMaterial({color:0x111111}));
    w.rotation.z=Math.PI/2; wg.add(w);
    carMesh.add(wg); carWheels.push(wg);
  });
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.7,3.9),new THREE.MeshPhongMaterial({color:col,emissive:col,emissiveIntensity:3,transparent:true,opacity:0.8}));
  glow.rotation.x=-Math.PI/2; glow.position.y=0.025; carMesh.add(glow);
  carMesh.position.copy(carPhysics.pos);
  scene.add(carMesh);
}

// ─── CAMERA ──────────────────────────────────────────────────────────────────
// _camPos, _camTgt, cinematicAngle declared at top

function updateCamera(dt) {
  // Always use physics pos directly — completely bypass carMesh which may be offset
  const px = carPhysics.pos.x;
  const py = 0; // always treat ground as y=0 for camera
  const pz = carPhysics.pos.z;
  const heading = carPhysics.heading;
  const speed = Math.hypot(carPhysics.vel.x, carPhysics.vel.z);

  if (STATE.cameraMode === 0) {
    // Chase cam: directly behind and above car, no lerp complexity
    const dist   = 10 + speed * 0.06;
    const height = 4.5;
    const camX = px - Math.sin(heading) * dist;
    const camY = height;
    const camZ = pz - Math.cos(heading) * dist;

    // Smooth lerp
    if (!_camPos) {
      _camPos = new THREE.Vector3(camX, camY, camZ);
      _camTgt  = new THREE.Vector3(px, 1.5, pz);
    }
    _camPos.x += (camX - _camPos.x) * Math.min(dt * 6, 1);
    _camPos.y += (camY - _camPos.y) * Math.min(dt * 6, 1);
    _camPos.z += (camZ - _camPos.z) * Math.min(dt * 6, 1);

    const tgtX = px + Math.sin(heading) * 6;
    const tgtY = 1.5;
    const tgtZ = pz + Math.cos(heading) * 6;
    _camTgt.x += (tgtX - _camTgt.x) * Math.min(dt * 8, 1);
    _camTgt.y += (tgtY - _camTgt.y) * Math.min(dt * 8, 1);
    _camTgt.z += (tgtZ - _camTgt.z) * Math.min(dt * 8, 1);

    camera.position.set(_camPos.x, _camPos.y, _camPos.z);
    camera.lookAt(_camTgt.x, _camTgt.y, _camTgt.z);

  } else if (STATE.cameraMode === 1) {
    // Hood cam
    camera.position.set(
      px + Math.sin(heading) * 2,
      2.2,
      pz + Math.cos(heading) * 2
    );
    camera.lookAt(
      px + Math.sin(heading) * 30,
      1.5,
      pz + Math.cos(heading) * 30
    );
  } else {
    // Cinematic orbit
    cinematicAngle += dt * 0.25;
    camera.position.set(
      px + Math.sin(cinematicAngle) * 18,
      8,
      pz + Math.cos(cinematicAngle) * 18
    );
    camera.lookAt(px, 1.5, pz);
  }
}

// ─── PHYSICS ─────────────────────────────────────────────────────────────────
function updatePhysics(dt) {
  const car = CARS[STATE.selectedCar];
  const fw=keys['KeyW']||keys['ArrowUp'];
  const bk=keys['KeyS']||keys['ArrowDown'];
  const lt=keys['KeyA']||keys['ArrowLeft'];
  const rt=keys['KeyD']||keys['ArrowRight'];
  const hb=keys['Space'];
  const nitroKey = keys['ShiftLeft'] || keys['ShiftRight'];

  // ── Nitro logic ──
  NITRO.active = false;
  if (nitroKey && NITRO.charge > 0 && !NITRO.cooldown && fw) {
    NITRO.active = true;
    NITRO.charge = Math.max(0, NITRO.charge - NITRO.DRAIN_RATE * dt);
    if (NITRO.charge <= 0) NITRO.cooldown = true;
  } else {
    // Refill (drift gives bonus fill)
    const fillBonus = STATE.driftActive ? 3.0 : 1.0;
    NITRO.charge = Math.min(1, NITRO.charge + NITRO.FILL_RATE * fillBonus * dt);
    if (NITRO.cooldown && NITRO.charge >= 0.25) NITRO.cooldown = false;
  }

  const fwdX=Math.sin(carPhysics.heading), fwdZ=Math.cos(carPhysics.heading);
  const speed=Math.hypot(carPhysics.vel.x,carPhysics.vel.z);
  const forwardSpeed=carPhysics.vel.x*fwdX+carPhysics.vel.z*fwdZ;
  const effectiveMaxSpeed = car.maxSpeed * (NITRO.active ? NITRO.BOOST_MULT : 1.0);

  if (fw) {
    const thrust=car.accel * (NITRO.active ? 2.2 : 1.0) * Math.max(0,1-speed/(effectiveMaxSpeed*1.05));
    carPhysics.vel.x+=fwdX*thrust*dt*60;
    carPhysics.vel.z+=fwdZ*thrust*dt*60;
  }
  if (bk) {
    if (forwardSpeed>1.0) { carPhysics.vel.x-=fwdX*car.brakeStr*0.3*dt*60; carPhysics.vel.z-=fwdZ*car.brakeStr*0.3*dt*60; }
    else { const r=car.accel*0.45*Math.max(0,1-speed/(car.maxSpeed*0.4)); carPhysics.vel.x-=fwdX*r*dt*60; carPhysics.vel.z-=fwdZ*r*dt*60; }
  }
  const spd2=Math.hypot(carPhysics.vel.x,carPhysics.vel.z);
  if (spd2>effectiveMaxSpeed) { const s=effectiveMaxSpeed/spd2; carPhysics.vel.x*=s; carPhysics.vel.z*=s; }

  if (speed>0.4) {
    const nSpeed=Math.min(speed/car.maxSpeed,1.0);
    const tr=car.turnSpeed*(1.0-nSpeed*0.6);
    const dir=forwardSpeed>=0?1:-1;
    if (lt) carPhysics.angularVel+=tr*dir*dt*60;
    if (rt) carPhysics.angularVel-=tr*dir*dt*60;
  }
  const angDamp=(lt||rt)?0.84:0.70;
  carPhysics.angularVel*=Math.pow(angDamp,dt*60);
  carPhysics.angularVel=Math.max(-3.5,Math.min(3.5,carPhysics.angularVel));
  carPhysics.heading+=carPhysics.angularVel*dt;

  const rightX=Math.cos(carPhysics.heading), rightZ=-Math.sin(carPhysics.heading);
  const lateralSpeed=carPhysics.vel.x*rightX+carPhysics.vel.z*rightZ;
  let gripStrength;
  if (hb&&speed>3) {
    gripStrength=0.8+car.driftFactor*6;
    carPhysics.angularVel*=1+car.driftFactor*0.18*dt*60;
    carPhysics.vel.x*=Math.pow(0.993,dt*60);
    carPhysics.vel.z*=Math.pow(0.993,dt*60);
  } else { gripStrength=car.grip*18; }
  const lb=Math.min(gripStrength*dt,1.0);
  carPhysics.vel.x-=rightX*lateralSpeed*lb;
  carPhysics.vel.z-=rightZ*lateralSpeed*lb;
  carPhysics.vel.x*=Math.pow(0.986,dt*60);
  carPhysics.vel.z*=Math.pow(0.986,dt*60);
  if (!fw&&!bk&&speed<0.5) { carPhysics.vel.x*=Math.pow(0.65,dt*60); carPhysics.vel.z*=Math.pow(0.65,dt*60); }

  let targetY=0;
  RAMPS.forEach(r => {
    const dx=carPhysics.pos.x-r.cx, dz=carPhysics.pos.z-r.cz;
    const dist=Math.sqrt(dx*dx+dz*dz), maxDist=Math.max(r.rx,r.rz)*1.5;
    if (dist<maxDist) targetY=Math.max(targetY,r.h*(1-dist/maxDist)*0.7);
  });
  if (carPhysics.pos.x>340&&carPhysics.pos.x<720&&Math.abs(carPhysics.pos.z)<14) {
    targetY=Math.max(targetY, carPhysics.pos.x>390?14:((carPhysics.pos.x-340)/50)*14);
  }
  carPhysics.groundY=targetY;

  if (carPhysics.pos.y>targetY+0.05) {
    carPhysics.verticalVel-=22*dt; carPhysics.onGround=false; STATE.airTimer+=dt;
  } else {
    if (!carPhysics.onGround&&STATE.airTimer>0.3) {
      STATE.airTime=Math.max(STATE.airTime,STATE.airTimer);
      checkChallenge('air',STATE.airTimer);
      if (STATE.airTimer>1.5) showNotif(`🚀 AIR TIME: ${STATE.airTimer.toFixed(1)}s`);
    }
    if (!carPhysics.onGround) STATE.airTimer=0;
    carPhysics.verticalVel=0; carPhysics.pos.y=targetY; carPhysics.onGround=true;
  }
  carPhysics.pos.y+=carPhysics.verticalVel*dt;
  carPhysics.pos.y=Math.max(targetY,carPhysics.pos.y);

  const newX=carPhysics.pos.x+carPhysics.vel.x*dt, newZ=carPhysics.pos.z+carPhysics.vel.z*dt;
  const {resolvedX,resolvedZ}=resolveCollisions(carPhysics.pos.x,carPhysics.pos.z,newX,newZ);
  carPhysics.pos.x=Math.max(-780,Math.min(780,resolvedX));
  carPhysics.pos.z=Math.max(-780,Math.min(780,resolvedZ));

  if (carMesh) {
    carMesh.position.copy(carPhysics.pos);
    carMesh.rotation.y=carPhysics.heading;
    carMesh.rotation.z=-carPhysics.angularVel*0.08;
    carMesh.rotation.x=forwardSpeed>0?-Math.min(speed/car.maxSpeed,1)*0.03:Math.min(speed/car.maxSpeed,1)*0.03;

    // Wheels spin around Z axis (cylinder axis = X in our GLB, so spin = rotation.z)
    const wheelSpin=(forwardSpeed/0.36)*dt;
    carWheels.forEach((w,i) => {
      w.rotation.z -= wheelSpin;  // Z spin for cylinders built with axis='x'
      if (i<2) w.rotation.y=Math.max(-0.55,Math.min(0.55,carPhysics.angularVel*0.48));
    });
  }

  const kmh=speed*3.6;
  STATE.topSpeed=Math.max(STATE.topSpeed,kmh);
  checkChallenge('speed',kmh);
  STATE.distanceTravelled+=speed*dt;
  checkChallenge('distance',STATE.distanceTravelled);

  // ── Wanted: speeding offence ──
  if (kmh > 120 && carPhysics.onGround) {
    wantedOffence(0.06 * dt * (kmh / 120));
  }

  return {kmh,lateralSpeed};
}

function resolveCollisions(oldX,oldZ,newX,newZ) {
  let rx=newX,rz=newZ; const R=2.4;
  for (const b of buildingAABBs) {
    if (rx<b.minX-R||rx>b.maxX+R||rz<b.minZ-R||rz>b.maxZ+R) continue;
    const wasX=oldX>=b.minX-R&&oldX<=b.maxX+R, wasZ=oldZ>=b.minZ-R&&oldZ<=b.maxZ+R;
    if (!wasX) { rx=oldX; carPhysics.vel.x*=-0.25; wantedOffence(0.15); }
    else if (!wasZ) { rz=oldZ; carPhysics.vel.z*=-0.25; wantedOffence(0.15); }
    else {
      const pX=rx<(b.minX+b.maxX)*0.5?b.minX-R:b.maxX+R;
      const pZ=rz<(b.minZ+b.maxZ)*0.5?b.minZ-R:b.maxZ+R;
      if (Math.abs(rx-pX)<Math.abs(rz-pZ)){rx=pX;carPhysics.vel.x*=-0.25;}
      else{rz=pZ;carPhysics.vel.z*=-0.25;}
    }
  }
  return {resolvedX:rx,resolvedZ:rz};
}

// ─── DRIFT SCORING ───────────────────────────────────────────────────────────
function updateDrift(dt,kmh,lateralSpeed) {
  const hb=keys['Space'];
  const isDrifting=hb&&Math.abs(lateralSpeed)>3.5&&kmh>20&&carPhysics.onGround;
  if (isDrifting) {
    STATE.driftActive=true; STATE.driftTimer+=dt;
    if (STATE.driftTimer>1.0) STATE.driftMult=Math.min(6,1+Math.floor(STATE.driftTimer-1.0));
    const pts=Math.abs(lateralSpeed)*STATE.driftMult*dt*4;
    STATE.driftScore+=pts; STATE.totalDrift+=pts;
    checkChallenge('drift',STATE.totalDrift); checkChallenge('multdrift',STATE.driftMult);
  } else {
    if (STATE.driftActive&&STATE.driftScore>100) {
      const payout=Math.floor(STATE.driftScore/40);
      if (payout>0){earnCoins(payout);showNotif(`DRIFT +${payout}¢`);}
    }
    STATE.driftActive=false;STATE.driftTimer=0;STATE.driftMult=1;STATE.driftScore=0;
  }
  const dui=document.getElementById('hud-drift-ui');
  if (isDrifting) {
    dui.classList.add('active');
    document.getElementById('drift-score').textContent=Math.floor(STATE.driftScore);
    document.getElementById('drift-mult').textContent=`x${STATE.driftMult}`;
  } else dui.classList.remove('active');
}

// ─── DAY/NIGHT ───────────────────────────────────────────────────────────────
// Pre-allocated to avoid per-frame garbage
const _nightSkyCol = new THREE.Color(0x334466);
const _daySkyCol   = new THREE.Color(0x6aa8d4);
const _skyScratch  = new THREE.Color();
function updateDayNight(dt) {
  STATE.dayTime=(STATE.dayTime+STATE.daySpeed*dt)%1;
  const t=STATE.dayTime;
  const sunAngle=(t-0.25)*Math.PI*2;
  const sunY=Math.sin(sunAngle)*400;
  sunLight.position.set(Math.cos(sunAngle)*600,Math.max(-150,sunY),-100);
  const dayFactor=Math.max(0,Math.sin(sunAngle));
  const isSunrise=t>0.20&&t<0.38, isSunset=t>0.62&&t<0.80;
  _skyScratch.copy(_nightSkyCol).lerp(_daySkyCol, Math.pow(dayFactor, 0.7));
  scene.background.copy(_skyScratch); scene.fog.color.copy(_skyScratch);
  scene.fog.near=180+dayFactor*80; scene.fog.far=450+dayFactor*200;
  if (isSunrise||isSunset){sunLight.color.set(0xff6622);sunLight.intensity=dayFactor*1.0;}
  else{sunLight.color.set(0xfff0d0);sunLight.intensity=dayFactor*1.5;}
  ambientLight.intensity=0.6+dayFactor*0.8;
  fillLight.intensity=dayFactor*0.6;
  if (starsPoints){starsPoints.material.opacity=Math.max(0,1-dayFactor*3);starsPoints.material.transparent=true;}
  renderer.toneMappingExposure=0.7+dayFactor*0.3;
  if (!dayNightLabel) {
    dayNightLabel=document.createElement('div');
    dayNightLabel.style.cssText=`position:absolute;bottom:1rem;right:2rem;font-size:0.55rem;letter-spacing:0.2em;color:#88aaccaa;font-family:var(--font-mono);text-align:right;pointer-events:none;`;
    document.getElementById('hud').appendChild(dayNightLabel);
  }
  const hour=Math.floor(t*24),min=Math.floor((t*24-hour)*60);
  const h12=((hour%12)||12).toString().padStart(2,'0'),mm=min.toString().padStart(2,'0'),ampm=hour>=12?'PM':'AM';
  const emoji=hour>=6&&hour<12?'🌅':hour>=12&&hour<18?'☀️':hour>=18&&hour<21?'🌆':'🌙';
  dayNightLabel.textContent=`${emoji} ${h12}:${mm} ${ampm}`;
}

// ─── ZONES ───────────────────────────────────────────────────────────────────
let lastZone='';
function updateZones() {
  const px=carPhysics.pos.x,pz=carPhysics.pos.z;
  let zone='OPEN ROAD';
  ZONES.forEach(z=>{ if(Math.hypot(px-z.cx,pz-z.cz)<z.r) zone=z.name; });
  if (zone!==lastZone) {
    lastZone=zone;
    document.getElementById('hud-location').textContent=zone;
    const zi=ZONES.findIndex(z=>z.name===zone);
    if (zi>=0&&!STATE.zonesVisited.has(zi)){STATE.zonesVisited.add(zi);showNotif(`📍 ${zone}`);checkChallenge('explore',STATE.zonesVisited.size);}
  }
}

// ─── MISSIONS ────────────────────────────────────────────────────────────────
function updateMission() {
  if (STATE.currentMission>=MISSIONS.length){document.getElementById('mission-title').textContent='ALL DONE!';document.getElementById('mission-desc').textContent='Missions complete';document.getElementById('mission-progress-fill').style.width='100%';return;}
  const m=MISSIONS[STATE.currentMission];
  let p=0;
  switch(m.type){case'explore':p=STATE.zonesVisited.size;break;case'speed':p=STATE.topSpeed;break;case'drift':p=STATE.totalDrift;break;case'distance':p=STATE.distanceTravelled;break;case'air':p=STATE.airTime;break;}
  const newProg = Math.min(1, p/m.target);
  if (Math.abs(newProg - STATE.missionProgress) > 0.005 || STATE.missionProgress === 0) {
    STATE.missionProgress = newProg;
    document.getElementById('mission-title').textContent=m.title;
    document.getElementById('mission-desc').textContent=m.desc;
    document.getElementById('mission-progress-fill').style.width=(newProg*100)+'%';
  }
  STATE.missionProgress = newProg;
  if (STATE.missionProgress>=1){earnCoins(m.reward);showChallengeFlash(`MISSION: ${m.title.toUpperCase()}`,`+${m.reward} ¢`);STATE.currentMission++;}
}

function checkChallenge(type,value) {
  CHALLENGES.forEach(ch=>{
    if(ch.type===type&&!STATE.completedChallenges.includes(ch.id)&&value>=ch.target){
      STATE.completedChallenges.push(ch.id);earnCoins(ch.reward);showChallengeFlash(ch.name,`+${ch.reward} ¢`);saveState();
    }
  });
}
function earnCoins(amount){STATE.coins+=amount;document.getElementById('hud-coins').textContent=STATE.coins;saveState();}

// ─── MINIMAP ─────────────────────────────────────────────────────────────────
const minimapCanvas=document.getElementById('minimap-canvas');
const minimapCtx=minimapCanvas.getContext('2d');
const MM_SIZE=160,MM_WORLD=1600,MM_SCALE=MM_SIZE/MM_WORLD,MM_OFF=MM_SIZE/2;
minimapCanvas.width=minimapCanvas.height=MM_SIZE;
minimapCanvas.style.width=minimapCanvas.style.height=MM_SIZE+'px';

function drawMinimap() {
  const ctx=minimapCtx;
  ctx.clearRect(0,0,MM_SIZE,MM_SIZE);
  ctx.fillStyle='#06090fcc';ctx.fillRect(0,0,MM_SIZE,MM_SIZE);
  ctx.strokeStyle='#00f5ff33';ctx.lineWidth=1.5;
  ROAD_SEGMENTS.forEach(([x1,z1,x2,z2])=>{
    ctx.beginPath();ctx.moveTo(x1*MM_SCALE+MM_OFF,z1*MM_SCALE+MM_OFF);ctx.lineTo(x2*MM_SCALE+MM_OFF,z2*MM_SCALE+MM_OFF);ctx.stroke();
  });
  ZONES.forEach((z,i)=>{
    ctx.strokeStyle=STATE.zonesVisited.has(i)?'#00ff8855':'#ffffff11';ctx.lineWidth=0.5;
    ctx.beginPath();ctx.arc(z.cx*MM_SCALE+MM_OFF,z.cz*MM_SCALE+MM_OFF,z.r*MM_SCALE,0,Math.PI*2);ctx.stroke();
  });
  const cx=carPhysics.pos.x*MM_SCALE+MM_OFF,cz=carPhysics.pos.z*MM_SCALE+MM_OFF;
  ctx.save();ctx.translate(cx,cz);ctx.rotate(-carPhysics.heading);
  ctx.fillStyle='#ffffff';ctx.fillRect(-2,-3.5,4,7);ctx.fillStyle='#00f5ff';ctx.fillRect(-1.5,-3.5,3,2.5);
  ctx.restore();

  // Traffic blips (small coloured dots)
  TRAFFIC.cars.forEach(tc => {
    const tx = tc.pos.x * MM_SCALE + MM_OFF;
    const tz = tc.pos.z * MM_SCALE + MM_OFF;
    if (tx < 0 || tx > MM_SIZE || tz < 0 || tz > MM_SIZE) return;
    ctx.fillStyle = '#' + tc.color.toString(16).padStart(6,'0') + 'cc';
    ctx.beginPath(); ctx.arc(tx, tz, 2, 0, Math.PI*2); ctx.fill();
  });

  // Cop blips (flashing blue/red)
  WANTED.cops.forEach(cop => {
    const tx = cop.pos.x * MM_SCALE + MM_OFF;
    const tz = cop.pos.z * MM_SCALE + MM_OFF;
    if (tx < 0 || tx > MM_SIZE || tz < 0 || tz > MM_SIZE) return;
    const flash = Math.sin(Date.now() / 80) > 0;
    ctx.fillStyle = flash ? '#ff3333' : '#3366ff';
    ctx.beginPath(); ctx.arc(tx, tz, 3, 0, Math.PI*2); ctx.fill();
  });

  ctx.strokeStyle='#00f5ff44';ctx.lineWidth=1;ctx.strokeRect(0,0,MM_SIZE,MM_SIZE);
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function updateHUD(kmh,gear) {
  document.getElementById('speed-val').textContent=Math.round(kmh);
  document.getElementById('gear-val').textContent=gear;
}
function computeGear(kmh) {
  if(kmh<18)return 1;if(kmh<38)return 2;if(kmh<62)return 3;if(kmh<90)return 4;if(kmh<128)return 5;return 6;
}

let notifTimeout=null;
function showNotif(text) {
  const el=document.getElementById('hud-notif');
  el.textContent=text;el.classList.remove('hidden');el.style.animation='none';void el.offsetWidth;el.style.animation='notifPop 2.5s forwards';
  clearTimeout(notifTimeout);notifTimeout=setTimeout(()=>el.classList.add('hidden'),2600);
}
function showChallengeFlash(label,score) {
  const el=document.getElementById('challenge-flash');
  document.getElementById('cf-label').textContent=label;document.getElementById('cf-score').textContent=score;
  el.classList.remove('hidden');el.style.animation='none';void el.offsetWidth;el.style.animation='cfAnim 3s forwards';
  setTimeout(()=>el.classList.add('hidden'),3100);
}


// ─── RACE MODE ────────────────────────────────────────────────────────────────
// Checkpoint markers in scene
let checkpointMarkers = [];

function startRace(raceId) {
  const race = RACES[raceId];
  RACE.active    = true;
  RACE.raceId    = raceId;
  RACE.checkpoint= 1; // 0 is start, so next target is 1
  RACE.startTime = performance.now() / 1000;
  RACE.elapsed   = 0;

  // Clear old markers
  checkpointMarkers.forEach(m => scene.remove(m));
  checkpointMarkers = [];

  // Create checkpoint rings in scene
  race.checkpoints.forEach(([cx,cz], i) => {
    if (i === 0) return; // skip start
    const isNext = i === 1;
    const mat = new THREE.MeshLambertMaterial({
      color: isNext ? 0x00ffff : 0xffffff,
      emissive: isNext ? 0x00ffff : 0x888888,
      emissiveIntensity: isNext ? 0.8 : 0.2,
      transparent: true, opacity: 0.7,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(5, 6.5, 32), mat);
    ring.rotation.x = -Math.PI/2;
    ring.position.set(cx, 0.08, cz);
    ring.userData.cpIndex = i;
    scene.add(ring);
    checkpointMarkers.push(ring);
  });

  showNotif(`🏁 ${race.name} — GO!`);
  document.getElementById('race-hud').classList.remove('hidden');
  updateRaceHUD();
}

function endRace(finished) {
  const race = RACES[RACE.raceId];
  checkpointMarkers.forEach(m => scene.remove(m));
  checkpointMarkers = [];
  document.getElementById('race-hud').classList.add('hidden');

  if (finished) {
    const t = RACE.elapsed;
    const prev = RACE.bestTimes[RACE.raceId];
    const isNew = !prev || t < prev;
    if (isNew) RACE.bestTimes[RACE.raceId] = t;
    const bonus = t <= race.par ? race.reward * 2 : race.reward;
    earnCoins(bonus);
    const timeStr = t.toFixed(1) + 's';
    const parStr  = race.par + 's';
    showChallengeFlash(
      `${race.name} ${isNew ? '★ NEW BEST' : 'FINISHED'}`,
      `${timeStr} / par ${parStr}  +${bonus}¢`
    );
  } else {
    showNotif('❌ RACE CANCELLED');
  }
  RACE.active = false;
  RACE.raceId = -1;
}

function updateRace(dt) {
  if (!RACE.active) return;
  RACE.elapsed = performance.now()/1000 - RACE.startTime;

  const race = RACES[RACE.raceId];
  const [tx, tz] = race.checkpoints[RACE.checkpoint];
  const dist = Math.hypot(carPhysics.pos.x - tx, carPhysics.pos.z - tz);

  if (dist < 12) {
    // Hit checkpoint
    checkpointMarkers.forEach(m => {
      if (m.userData.cpIndex === RACE.checkpoint) scene.remove(m);
    });
    checkpointMarkers = checkpointMarkers.filter(m => m.userData.cpIndex !== RACE.checkpoint);
    RACE.checkpoint++;

    if (RACE.checkpoint >= race.checkpoints.length) {
      endRace(true);
      return;
    }
    // Highlight next checkpoint
    const nextMarker = checkpointMarkers.find(m => m.userData.cpIndex === RACE.checkpoint);
    if (nextMarker) {
      nextMarker.material.color.set(0x00ffff);
      nextMarker.material.emissive.set(0x00ffff);
      nextMarker.material.emissiveIntensity = 0.8;
    }
    showNotif(`✓ ${RACE.checkpoint}/${race.checkpoints.length-1}`);
    updateRaceHUD();
  }

  updateRaceHUD();
}

function updateRaceHUD() {
  if (!RACE.active) return;
  const race = RACES[RACE.raceId];
  const t = RACE.elapsed;
  const cp = RACE.checkpoint;
  const total = race.checkpoints.length - 1;
  const timeStr = t.toFixed(1);
  const parDiff = t - race.par;
  document.getElementById('race-timer').textContent = timeStr + 's';
  document.getElementById('race-cp').textContent = `${Math.min(cp,total)}/${total}`;
  document.getElementById('race-name').textContent = race.name;
  document.getElementById('race-par').textContent =
    parDiff <= 0 ? `+${Math.abs(parDiff).toFixed(1)}s UNDER PAR` : `-${parDiff.toFixed(1)}s OVER PAR`;
  document.getElementById('race-par').style.color = parDiff <= 0 ? '#00ff88' : '#ff4444';
}

// Check if player is standing on a race start marker
function checkRaceStart() {
  if (RACE.active) return;
  RACES.forEach((race, ri) => {
    const [sx, sz] = race.checkpoints[0];
    const dist = Math.hypot(carPhysics.pos.x - sx, carPhysics.pos.z - sz);
    if (dist < 8 && !racePromptShown) {
      racePromptShown = true;
      showRacePrompt(ri);
    } else if (dist >= 8 && racePromptShown) {
      racePromptShown = false;
      document.getElementById('race-prompt').classList.add('hidden');
    }
  });
}
let racePromptShown = false;
let _lastRaceCheck = -1;

function showRacePrompt(raceId) {
  const race = RACES[raceId];
  const el = document.getElementById('race-prompt');
  document.getElementById('rp-name').textContent = race.name;
  document.getElementById('rp-reward').textContent = race.reward + '¢ (×2 under par ' + race.par + 's)';
  document.getElementById('rp-btn').onclick = () => {
    el.classList.add('hidden');
    racePromptShown = false;
    startRace(raceId);
  };
  el.classList.remove('hidden');
}

// ─── NITRO HUD ────────────────────────────────────────────────────────────────
let nitroVignetteEl = null;
function updateNitroHUD() {
  const el = document.getElementById('hud-nitro');
  const fill = document.getElementById('nitro-fill');
  if (!el || !fill) return;
  fill.style.width = (NITRO.charge * 100).toFixed(1) + '%';
  el.classList.toggle('active', NITRO.active);
  el.classList.toggle('empty', NITRO.cooldown);

  // Screen vignette while boosting
  if (NITRO.active) {
    if (!nitroVignetteEl) {
      nitroVignetteEl = document.createElement('div');
      nitroVignetteEl.className = 'nitro-vignette';
      document.body.appendChild(nitroVignetteEl);
    }
  } else if (nitroVignetteEl) {
    nitroVignetteEl.remove();
    nitroVignetteEl = null;
  }
}

// ─── HONK ────────────────────────────────────────────────────────────────────
let honkCooldown = 0;
function tryHonk(dt) {
  honkCooldown = Math.max(0, honkCooldown - dt);
}
function doHonk() {
  if (honkCooldown > 0 || !STATE.inGame || STATE.paused) return;
  honkCooldown = 1.0;
  showNotif('📯 BEEP BEEP!');

  // Scare nearby traffic — they brake/swerve
  const px = carPhysics.pos.x, pz = carPhysics.pos.z;
  TRAFFIC.cars.forEach(tc => {
    const d = Math.hypot(tc.pos.x - px, tc.pos.z - pz);
    if (d < 40) {
      tc.scared = true;
      tc.scaredTimer = 2.0;
      // Near-miss coin bonus if very close
      if (d < 12) {
        earnCoins(25);
        showNotif('💨 NEAR MISS +25¢');
      }
    }
  });
}

// ─── TRAFFIC AI ──────────────────────────────────────────────────────────────
// Each traffic car follows a road segment waypoint loop
// Colours cycle through neon palette for variety
const TRAFFIC_COLORS = [0xff2244, 0xffaa00, 0x00ddff, 0xcc44ff, 0x00ff88, 0xff6600];

function buildTrafficCar(color) {
  const mat = new THREE.MeshLambertMaterial({ color });
  const g = new THREE.Group();
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.0), mat);
  body.position.y = 0.55;
  g.add(body);
  // Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.0), mat);
  cab.position.set(0, 1.05, -0.2);
  g.add(cab);
  // Headlights
  const hlMat = new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 1.2 });
  [[-0.65, 1.9], [0.65, 1.9]].forEach(([x, z]) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), hlMat);
    hl.position.set(x, 0.65, z);
    g.add(hl);
  });
  // Tail lights
  const tlMat = new THREE.MeshLambertMaterial({ color: 0xff1100, emissive: 0xff1100, emissiveIntensity: 1.4 });
  [[-0.6, -1.9], [0.6, -1.9]].forEach(([x, z]) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), tlMat);
    tl.position.set(x, 0.65, z);
    g.add(tl);
  });
  // Wheels
  const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  [[-1.0,0.35,1.3],[1.0,0.35,1.3],[-1.0,0.35,-1.3],[1.0,0.35,-1.3]].forEach(([wx,wy,wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), wMat);
    w.rotation.z = Math.PI/2;
    w.position.set(wx, wy, wz);
    g.add(w);
  });
  return g;
}

function spawnTrafficCar() {
  if (TRAFFIC.cars.length >= TRAFFIC.MAX_CARS) return;

  // Pick a random road segment to spawn on
  const seg = ROAD_SEGMENTS[Math.floor(Math.random() * ROAD_SEGMENTS.length)];
  const [x1,z1,x2,z2] = seg;
  const t = Math.random();
  const sx = x1 + (x2-x1)*t;
  const sz = z1 + (z2-z1)*t;

  // Don't spawn too close to player
  if (Math.hypot(sx - carPhysics.pos.x, sz - carPhysics.pos.z) < 80) return;

  const color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
  const mesh = buildTrafficCar(color);
  mesh.position.set(sx, 0, sz);
  scene.add(mesh);

  // Heading along road segment direction
  const dx = x2-x1, dz = z2-z1;
  const heading = Math.atan2(dx, dz);

  // Build waypoint loop: just follow road segment endpoints cyclically
  const segIdx = ROAD_SEGMENTS.indexOf(seg);

  TRAFFIC.cars.push({
    mesh,
    pos: new THREE.Vector3(sx, 0, sz),
    vel: new THREE.Vector3(),
    heading,
    speed: 6 + Math.random() * 6,   // m/s
    segIdx,
    targetPoint: 0, // 0=end, 1=start of segment
    scared: false,
    scaredTimer: 0,
    color,
  });
}

function updateTraffic(dt) {
  TRAFFIC.spawnTimer -= dt;
  if (TRAFFIC.spawnTimer <= 0) {
    TRAFFIC.spawnTimer = TRAFFIC.SPAWN_INTERVAL;
    spawnTrafficCar();
  }

  const pPos = carPhysics.pos;

  TRAFFIC.cars.forEach((tc, i) => {
    // Scare cooldown
    if (tc.scared) {
      tc.scaredTimer -= dt;
      if (tc.scaredTimer <= 0) tc.scared = false;
    }

    const seg = ROAD_SEGMENTS[tc.segIdx];
    const [x1,z1,x2,z2] = seg;

    // Current waypoint
    const wpX = tc.targetPoint === 0 ? x2 : x1;
    const wpZ = tc.targetPoint === 0 ? z2 : z1;

    const dx = wpX - tc.pos.x;
    const dz = wpZ - tc.pos.z;
    const dist = Math.hypot(dx, dz);

    // Reached waypoint — switch target or pick next segment
    if (dist < 8) {
      tc.targetPoint = 1 - tc.targetPoint;
      if (Math.random() < 0.3) {
        // Pick a different segment that starts near current pos
        let best = tc.segIdx;
        let bestDist = Infinity;
        ROAD_SEGMENTS.forEach(([sx1,sz1,sx2,sz2], si) => {
          if (si === tc.segIdx) return;
          const d1 = Math.hypot(sx1-tc.pos.x, sz1-tc.pos.z);
          const d2 = Math.hypot(sx2-tc.pos.x, sz2-tc.pos.z);
          const d = Math.min(d1,d2);
          if (d < bestDist && d < 30) { bestDist=d; best=si; }
        });
        tc.segIdx = best;
      }
    }

    // Steer toward waypoint
    const targetHeading = Math.atan2(dx, dz);
    let hdiff = targetHeading - tc.heading;
    while (hdiff > Math.PI)  hdiff -= Math.PI*2;
    while (hdiff < -Math.PI) hdiff += Math.PI*2;
    tc.heading += Math.sign(hdiff) * Math.min(Math.abs(hdiff), 1.8 * dt);

    // Speed — slow if scared or player nearby ahead
    const dPlayer = Math.hypot(tc.pos.x - pPos.x, tc.pos.z - pPos.z);
    const targetSpeed = tc.scared ? tc.speed * 0.3 : (dPlayer < 20 ? tc.speed * 0.6 : tc.speed);
    const fwdX = Math.sin(tc.heading), fwdZ = Math.cos(tc.heading);

    // Collision with player — bump and add wanted
    if (dPlayer < 5) {
      const bump = 8;
      carPhysics.vel.x += (pPos.x - tc.pos.x) / dPlayer * bump;
      carPhysics.vel.z += (pPos.z - tc.pos.z) / dPlayer * bump;
      wantedOffence(0.4);
    }

    tc.vel.x += (fwdX * targetSpeed - tc.vel.x) * Math.min(dt * 3, 1);
    tc.vel.z += (fwdZ * targetSpeed - tc.vel.z) * Math.min(dt * 3, 1);

    tc.pos.x += tc.vel.x * dt;
    tc.pos.z += tc.vel.z * dt;
    tc.pos.x = Math.max(-750, Math.min(750, tc.pos.x));
    tc.pos.z = Math.max(-750, Math.min(750, tc.pos.z));

    tc.mesh.position.set(tc.pos.x, 0, tc.pos.z);
    tc.mesh.rotation.y = tc.heading;

    // Remove cars that drifted too far from any road (off-world)
    if (Math.abs(tc.pos.x) > 780 || Math.abs(tc.pos.z) > 780) {
      scene.remove(tc.mesh);
      TRAFFIC.cars.splice(i, 1);
    }
  });

  // Draw traffic blips on minimap
  // (handled in drawMinimap below)
}

// ─── WANTED / POLICE ─────────────────────────────────────────────────────────
// Police car is a modified traffic car with blue/red livery and chase AI
function buildPoliceCar() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x1a2a8a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 4.1), mat);
  body.position.y = 0.55;
  g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.52, 2.0), mat);
  cab.position.set(0, 1.08, -0.15);
  g.add(cab);

  // Light bar on roof
  const barMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.5), barMat);
  bar.position.set(0, 1.36, -0.15);
  g.add(bar);

  // Red/blue light pods
  const redMat = new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
  const bluMat = new THREE.MeshLambertMaterial({ color: 0x0044ff, emissive: 0x0044ff, emissiveIntensity: 2 });
  [-0.45, 0.45].forEach((x, i) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.35), i===0 ? redMat : bluMat);
    pod.position.set(x, 1.36, -0.15);
    g.add(pod);
  });

  // Dynamic point light (flashing) — stored as userData
  const flashLight = new THREE.PointLight(0xff0000, 5, 25);
  flashLight.position.set(0, 2.2, 0);
  g.add(flashLight);
  g.userData.flashLight = flashLight;
  g.userData.blueMat = bluMat;
  g.userData.redMat  = redMat;

  // Wheels
  const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  [[-1.0,0.35,1.3],[1.0,0.35,1.3],[-1.0,0.35,-1.3],[1.0,0.35,-1.3]].forEach(([wx,wy,wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12), wMat);
    w.rotation.z = Math.PI/2;
    w.position.set(wx, wy, wz);
    g.add(w);
  });
  return g;
}

function wantedOffence(amount) {
  if (!STATE.inGame) return;
  WANTED.coolTimer = 0;
  WANTED.cooling = false;
  WANTED.meter += amount;
  if (WANTED.meter >= 1.0) {
    WANTED.meter = 0;
    WANTED.level = Math.min(5, WANTED.level + 1);
    if (WANTED.level > 0 && WANTED.active === false) {
      WANTED.active = true;
      showNotif('🚨 WANTED!');
      // Spawn first cop
      spawnCop();
    } else if (WANTED.level > WANTED.cops.length) {
      spawnCop();
    }
  }
  WANTED.active = WANTED.level > 0;
  if (WANTED.active) updateWantedHUD();
}

function spawnCop() {
  const angle = Math.random() * Math.PI * 2;
  const dist  = 120 + Math.random() * 80;
  const sx = carPhysics.pos.x + Math.sin(angle) * dist;
  const sz = carPhysics.pos.z + Math.cos(angle) * dist;

  const mesh = buildPoliceCar();
  mesh.position.set(sx, 0, sz);
  scene.add(mesh);

  WANTED.cops.push({
    mesh,
    pos: new THREE.Vector3(sx, 0, sz),
    vel: new THREE.Vector3(),
    heading: 0,
    flashTimer: 0,
    siren: true,
  });

  // Police screen flash overlay
  if (!WANTED.policeFlashEl) {
    WANTED.policeFlashEl = document.createElement('div');
    WANTED.policeFlashEl.className = 'police-flash';
    document.body.appendChild(WANTED.policeFlashEl);
  }
}

function despawnAllCops() {
  WANTED.cops.forEach(c => scene.remove(c.mesh));
  WANTED.cops = [];
  if (WANTED.policeFlashEl) { WANTED.policeFlashEl.remove(); WANTED.policeFlashEl = null; }
}

function updateWanted(dt) {
  if (WANTED.level === 0) return;

  const px = carPhysics.pos.x, pz = carPhysics.pos.z;
  const speed = Math.hypot(carPhysics.vel.x, carPhysics.vel.z) * 3.6;

  // Cooling: player must be slow or in cover zones
  const inCover = (
    Math.hypot(px - ZONES[4].cx, pz - ZONES[4].cz) < ZONES[4].r ||   // TUNNEL
    Math.hypot(px - ZONES[6].cx, pz - ZONES[6].cz) < ZONES[6].r      // DRIFT PARK
  );
  const isCooling = inCover && speed < 30;

  if (isCooling) {
    WANTED.cooling = true;
    WANTED.coolTimer += dt;
    if (WANTED.coolTimer >= WANTED.COOL_NEEDED) {
      WANTED.coolTimer = 0;
      WANTED.level = Math.max(0, WANTED.level - 1);
      WANTED.meter = WANTED.level > 0 ? 0.8 : 0;
      if (WANTED.level === 0) {
        WANTED.active = false;
        WANTED.cooling = false;
        despawnAllCops();
        showNotif('✅ EVADED!');
        earnCoins(100 + WANTED.cops.length * 50);
      } else {
        // Drop a level — remove one cop
        if (WANTED.cops.length > WANTED.level) {
          const c = WANTED.cops.pop();
          scene.remove(c.mesh);
        }
        showNotif(`⭐ LEVEL ${WANTED.level} — KEEP HIDING`);
      }
    }
  } else {
    WANTED.cooling = false;
    WANTED.coolTimer = Math.max(0, WANTED.coolTimer - dt * 0.5);
  }

  // Update cops
  const copSpeed = 14 + WANTED.level * 3.5;
  WANTED.cops.forEach((cop, ci) => {
    cop.flashTimer += dt;

    // Flash lights
    const flashLight = cop.mesh.userData.flashLight;
    if (flashLight) {
      const flash = Math.sin(cop.flashTimer * 12) > 0;
      flashLight.color.set(flash ? 0xff0000 : 0x0044ff);
      flashLight.intensity = 5 + Math.sin(cop.flashTimer * 18) * 2;
    }

    // Chase player
    const dx = px - cop.pos.x;
    const dz = pz - cop.pos.z;
    const dist = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(dx, dz);
    let hdiff = targetHeading - cop.heading;
    while (hdiff >  Math.PI) hdiff -= Math.PI*2;
    while (hdiff < -Math.PI) hdiff += Math.PI*2;
    cop.heading += Math.sign(hdiff) * Math.min(Math.abs(hdiff), 2.5 * dt);

    const fwdX = Math.sin(cop.heading), fwdZ = Math.cos(cop.heading);
    const targetS = dist > 15 ? copSpeed : copSpeed * 0.5;
    cop.vel.x += (fwdX * targetS - cop.vel.x) * Math.min(dt * 4, 1);
    cop.vel.z += (fwdZ * targetS - cop.vel.z) * Math.min(dt * 4, 1);

    cop.pos.x += cop.vel.x * dt;
    cop.pos.z += cop.vel.z * dt;

    cop.mesh.position.set(cop.pos.x, 0, cop.pos.z);
    cop.mesh.rotation.y = cop.heading;

    // Catch player
    if (dist < 5) {
      // Caught — slow down player heavily
      carPhysics.vel.x *= 0.3;
      carPhysics.vel.z *= 0.3;
      // Fine — lose coins
      const fine = 100 * WANTED.level;
      STATE.coins = Math.max(0, STATE.coins - fine);
      showChallengeFlash('BUSTED!', `-${fine}¢`);
      WANTED.level = 0;
      WANTED.meter = 0;
      WANTED.active = false;
      WANTED.cooling = false;
      despawnAllCops();
    }
  });

  updateWantedHUD();
}

function updateWantedHUD() {
  const el = document.getElementById('hud-wanted');
  const fill = document.getElementById('wanted-fill');
  const stars = document.getElementById('wanted-stars');
  const status = document.getElementById('wanted-status');
  if (!el) return;

  if (WANTED.level === 0) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.classList.toggle('cooling', WANTED.cooling);

  // Stars
  const filled = '★'.repeat(WANTED.level);
  const empty  = '☆'.repeat(5 - WANTED.level);
  stars.textContent = filled + empty;

  // Bar — shows progress toward next level
  fill.style.width = (WANTED.meter * 100).toFixed(0) + '%';

  // Status
  if (WANTED.cooling) {
    const pct = ((WANTED.coolTimer / WANTED.COOL_NEEDED) * 100).toFixed(0);
    status.textContent = `HIDING ${pct}%`;
  } else {
    status.textContent = WANTED.cops.length > 0 ? `${WANTED.cops.length} COP${WANTED.cops.length>1?'S':''} ON YOU` : 'EVADE!';
  }
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────
function gameLoop() {
  if (!running) return;
  animId=requestAnimationFrame(gameLoop);
  const now=performance.now()/1000;
  const dt=Math.min(now-prevTime,0.05);
  prevTime=now;
  if (STATE.paused){renderer.render(scene, camera);return;}
  const{kmh,lateralSpeed}=updatePhysics(dt);
  updateDrift(dt,kmh,lateralSpeed);
  updateZones();updateCamera(dt);updateMission();
  updateHUD(kmh,computeGear(kmh));updateDayNight(dt);drawMinimap();
  updateRace(dt);
  if (Math.floor(performance.now()/250) !== _lastRaceCheck) { _lastRaceCheck=Math.floor(performance.now()/250); checkRaceStart(); }
  updateNitroHUD();
  updateTraffic(dt);
  updateWanted(dt);
  tryHonk(dt);
  renderer.render(scene, camera);
}

// ─── INPUT ───────────────────────────────────────────────────────────────────
function handleKeyDown(e) {
  if(e.code==='KeyM'&&STATE.inGame) togglePause();
  if(e.code==='KeyR'&&STATE.inGame&&!STATE.paused) resetCar();
  if(e.code==='KeyC'&&STATE.inGame&&!STATE.paused) cycleCamera();
  if(e.code==='KeyE'&&STATE.inGame&&!STATE.paused) doHonk();
  if(e.code==='Escape'&&STATE.inGame) togglePause();
}
function resetCar() {
  carPhysics.pos.set(0,0,0);carPhysics.vel.set(0,0,0);
  carPhysics.heading=0;carPhysics.angularVel=0;carPhysics.verticalVel=0;
  // Place camera immediately behind the spawn point
  // Reset camera vectors — updateCamera will handle it next frame
  _camPos = null; _camTgt = null;
  camera.position.set(0, 4.5, -10);
  camera.lookAt(0, 1.5, 6);
  showNotif('🔄 RESET');
}
function cycleCamera(){STATE.cameraMode=(STATE.cameraMode+1)%3;showNotif(`📷 ${['CHASE CAM','HOOD CAM','CINEMATIC'][STATE.cameraMode]}`);}
function togglePause(){STATE.paused=!STATE.paused;document.getElementById('pause-menu').classList.toggle('hidden',!STATE.paused);}

// ─── SCREENS ─────────────────────────────────────────────────────────────────
function showScreen(id) {
  ['main-menu','garage-screen','challenges-screen','pause-menu'].forEach(s=>document.getElementById(s).classList.add('hidden'));
  if(id) document.getElementById(id).classList.remove('hidden');
}
function startGame() {
  try {
    if (!renderer) { initThree(); buildWorld(); }
  } catch(e) {
    console.error('initThree/buildWorld error:', e);
    alert('Init error: ' + e.message);
    return;
  }
  // buildCar is async (GLTFLoader callback) — call it and game loop starts immediately
  buildCar(CARS[STATE.selectedCar]);
  carPhysics.pos.set(0,0,0);carPhysics.vel.set(0,0,0);carPhysics.heading=0;carPhysics.angularVel=0;carPhysics.verticalVel=0;
  // Place camera immediately behind the spawn point
  // Reset camera vectors — updateCamera will handle it next frame
  _camPos = null; _camTgt = null;
  camera.position.set(0, 4.5, -10);
  camera.lookAt(0, 1.5, 6);
  showScreen(null);
  document.getElementById('game-canvas').classList.remove('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('hud-coins').textContent=STATE.coins;
  if(animId){cancelAnimationFrame(animId);animId=null;}
  running=true;STATE.inGame=true;STATE.paused=false;
  prevTime=performance.now()/1000;gameLoop();
  setTimeout(()=>showNotif('🏁 DRIVE!'),500);
}
function returnToMenu() {
  running=false;STATE.inGame=false;STATE.paused=false;
  if(animId){cancelAnimationFrame(animId);animId=null;}
  // Clean up traffic and cops
  TRAFFIC.cars.forEach(tc => scene && scene.remove(tc.mesh));
  TRAFFIC.cars = [];
  despawnAllCops();
  WANTED.level = 0; WANTED.meter = 0; WANTED.active = false;
  if (nitroVignetteEl) { nitroVignetteEl.remove(); nitroVignetteEl = null; }
  document.getElementById('game-canvas').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('pause-menu').classList.add('hidden');
  showScreen('main-menu');
}

// ─── GARAGE UI ───────────────────────────────────────────────────────────────
function buildGarageUI() {
  const grid=document.getElementById('garage-grid');grid.innerHTML='';
  document.getElementById('garage-coins').textContent=STATE.coins;
  CARS.forEach(car=>{
    const owned=STATE.ownedCars.includes(car.id),selected=STATE.selectedCar===car.id;
    const card=document.createElement('div');
    card.className=`car-card ${selected?'selected':''} ${!owned?'locked':''}`;
    const statColor=v=>v>=80?'#00ff88':v>=55?'#ffe600':'#ff4444';
    // Draw a colour swatch of the car colour
    const swatchHex = '#'+car.color.toString(16).padStart(6,'0');
    card.innerHTML=`
      <div class="car-swatch" style="background:${swatchHex};box-shadow:0 0 12px ${swatchHex}88"></div>
      <div class="car-name">${car.name}</div><div class="car-class">${car.class}</div>
      <div class="car-stats">${Object.entries(car.stats).map(([k,v])=>`
        <div class="stat-row"><div class="stat-label">${k}</div>
        <div class="stat-bar"><div class="stat-fill" style="width:${v}%;background:${statColor(v)}"></div></div>
        <div style="font-size:0.6rem;color:#fff;min-width:24px">${v}</div></div>`).join('')}</div>
      ${owned?`<button class="car-equip-btn ${selected?'active':''}" data-id="${car.id}">${selected?'✓ EQUIPPED':'EQUIP'}</button>`
        :`<div class="car-price">${car.price}¢ ${STATE.coins>=car.price?'':'— LOCKED'}</div>
          <button class="car-equip-btn" data-id="${car.id}" ${STATE.coins<car.price?'disabled style="opacity:0.4"':''}>BUY ${car.price}¢</button>`}`;
    card.querySelector('.car-equip-btn')?.addEventListener('click',()=>carAction(car.id,owned));
    grid.appendChild(card);
  });
}
function carAction(id,owned){
  const car=CARS[id];
  if(owned){STATE.selectedCar=id;saveState();buildGarageUI();if(STATE.inGame){buildCar(CARS[id]);showNotif(`🚗 ${car.name}`);}}
  else if(STATE.coins>=car.price){STATE.coins-=car.price;STATE.ownedCars.push(id);STATE.selectedCar=id;saveState();buildGarageUI();showNotif(`🔓 ${car.name} UNLOCKED!`);}
}

// ─── CHALLENGES UI ───────────────────────────────────────────────────────────
function buildChallengesUI() {
  const list=document.getElementById('challenges-list');list.innerHTML='';
  CHALLENGES.forEach(ch=>{
    const done=STATE.completedChallenges.includes(ch.id);
    const item=document.createElement('div');item.className='challenge-item';
    item.innerHTML=`<div class="ch-icon">${ch.icon}</div><div class="ch-info"><div class="ch-name">${ch.name}</div><div class="ch-desc">${ch.desc}</div><div class="ch-reward">Reward: ${ch.reward}¢</div></div><div class="ch-status ${done?'done':'todo'}">${done?'✓ DONE':'ACTIVE'}</div>`;
    list.appendChild(item);
  });
}

// ─── LOADING ─────────────────────────────────────────────────────────────────
function runLoadingScreen(cb) {
  const bar=document.getElementById('loading-bar'),label=document.getElementById('loading-label');
  const steps=[[10,'INITIALIZING ENGINE...'],[30,'LOADING WORLD...'],[55,'BUILDING CITY...'],[72,'CALIBRATING PHYSICS...'],[88,'WARMING UP NEONS...'],[100,'READY']];
  let i=0;
  function next(){
    if(i>=steps.length){setTimeout(()=>{document.getElementById('loading-screen').classList.add('hidden');try{cb();}catch(e){}},400);return;}
    const[pct,msg]=steps[i++];bar.style.width=pct+'%';label.textContent=msg;setTimeout(next,300+Math.random()*200);
  }
  next();
}

// ─── BOOT ────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  loadState();
  // Add car-swatch style dynamically
  const style=document.createElement('style');
  style.textContent=`.car-swatch{width:100%;height:6px;border-radius:2px;margin-bottom:0.75rem;}`;
  document.head.appendChild(style);

  document.getElementById('btn-play').addEventListener('click',startGame);
  document.getElementById('btn-garage').addEventListener('click',()=>{showScreen('garage-screen');buildGarageUI();});
  document.getElementById('btn-challenges').addEventListener('click',()=>{showScreen('challenges-screen');buildChallengesUI();});
  document.getElementById('garage-back').addEventListener('click',()=>showScreen('main-menu'));
  document.getElementById('challenges-back').addEventListener('click',()=>showScreen('main-menu'));
  document.getElementById('cam-btn').addEventListener('click',cycleCamera);
  document.getElementById('pause-resume').addEventListener('click',togglePause);
  document.getElementById('pause-garage').addEventListener('click',()=>{togglePause();showScreen('garage-screen');buildGarageUI();STATE.inGame=true;});
  document.getElementById('pause-main').addEventListener('click',returnToMenu);
  runLoadingScreen(()=>showScreen('main-menu'));
});