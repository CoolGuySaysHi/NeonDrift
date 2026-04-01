/* ========================================================
   NEON DRIFT — game.js  (v2 — overhauled)
   Open-world driving game using Three.js
   ======================================================== */

'use strict';

// ─── STATE ────────────────────────────────────────────────────────────────────
const STATE = {
  coins: 500,
  selectedCar: 0,
  ownedCars: [0],
  completedChallenges: [],
  inGame: false,
  paused: false,
  cameraMode: 0,
  driftScore: 0,
  driftMult: 1,
  driftActive: false,
  driftTimer: 0,
  totalDrift: 0,
  missionProgress: 0,
  currentMission: 0,
  zonesVisited: new Set(),
  distanceTravelled: 0,
  topSpeed: 0,
  airTime: 0,
  airTimer: 0,
  dayTime: 0.25,   // 0-1 full day
  daySpeed: 0.004, // cycle speed (4 real minutes per full day)
};

function saveState() {
  try { localStorage.setItem('nd_save', JSON.stringify({ coins: STATE.coins, selectedCar: STATE.selectedCar, ownedCars: STATE.ownedCars, completedChallenges: STATE.completedChallenges })); } catch(e) {}
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('nd_save') || '{}');
    if (s.coins !== undefined) STATE.coins = s.coins;
    if (s.selectedCar !== undefined) STATE.selectedCar = s.selectedCar;
    if (s.ownedCars) STATE.ownedCars = s.ownedCars;
    if (s.completedChallenges) STATE.completedChallenges = s.completedChallenges;
  } catch(e) {}
}

// ─── CAR DEFINITIONS ──────────────────────────────────────────────────────────
// maxSpeed in m/s, accel/brakeStr in m/s², turnSpeed in rad/s, grip 0-1, driftFactor 0-1
const CARS = [
  { id:  0, name: 'VIPER-X',     class: 'STREET',   shape: 'sedan',    color: 0x00c8ff, price: 0,    maxSpeed: 28,  accel: 18, brakeStr: 25, turnSpeed: 2.2,  grip: 0.88, driftFactor: 0.18, stats:{speed:60,accel:60,handling:70,drift:65} },
  { id:  1, name: 'PHANTOM GT',  class: 'SPORT',    shape: 'coupe',    color: 0xff00cc, price: 800,  maxSpeed: 38,  accel: 28, brakeStr: 32, turnSpeed: 2.4,  grip: 0.90, driftFactor: 0.20, stats:{speed:85,accel:80,handling:80,drift:70} },
  { id:  2, name: 'TERRA HAWK',  class: 'OFF-ROAD', shape: 'suv',      color: 0xffb300, price: 600,  maxSpeed: 24,  accel: 15, brakeStr: 22, turnSpeed: 2.0,  grip: 0.92, driftFactor: 0.12, stats:{speed:55,accel:55,handling:88,drift:50} },
  { id:  3, name: 'NOVA-7',      class: 'HYPERCAR', shape: 'hypercar', color: 0x00ff88, price: 2000, maxSpeed: 58,  accel: 48, brakeStr: 40, turnSpeed: 2.2,  grip: 0.86, driftFactor: 0.22, stats:{speed:100,accel:100,handling:78,drift:82} },
  { id:  4, name: 'STEEL WOLF',  class: 'MUSCLE',   shape: 'muscle',   color: 0xff4400, price: 1200, maxSpeed: 42,  accel: 30, brakeStr: 20, turnSpeed: 1.8,  grip: 0.80, driftFactor: 0.30, stats:{speed:95,accel:85,handling:62,drift:88} },
  { id:  5, name: 'WRAITH',      class: 'STEALTH',  shape: 'coupe',    color: 0x9900ff, price: 3500, maxSpeed: 50,  accel: 40, brakeStr: 38, turnSpeed: 2.3,  grip: 0.89, driftFactor: 0.24, stats:{speed:95,accel:95,handling:85,drift:78} },
  { id:  6, name: 'CITY RUNNER', class: 'STREET',   shape: 'hatchback',color: 0xff3355, price: 400,  maxSpeed: 22,  accel: 16, brakeStr: 28, turnSpeed: 2.5,  grip: 0.91, driftFactor: 0.16, stats:{speed:50,accel:58,handling:75,drift:60} },
  { id:  7, name: 'ECLIPSE-R',   class: 'SPORT',    shape: 'coupe',    color: 0x00ffee, price: 1500, maxSpeed: 44,  accel: 34, brakeStr: 35, turnSpeed: 2.3,  grip: 0.89, driftFactor: 0.21, stats:{speed:100,accel:88,handling:82,drift:74} },
  { id:  8, name: 'BRUTUS',      class: 'MUSCLE',   shape: 'muscle',   color: 0x222222, price: 900,  maxSpeed: 39,  accel: 26, brakeStr: 18, turnSpeed: 1.7,  grip: 0.78, driftFactor: 0.32, stats:{speed:88,accel:78,handling:58,drift:90} },
  { id:  9, name: 'SPECTRE',     class: 'HYPERCAR', shape: 'hypercar', color: 0xffffff, price: 4000, maxSpeed: 62,  accel: 52, brakeStr: 42, turnSpeed: 2.1,  grip: 0.87, driftFactor: 0.23, stats:{speed:100,accel:100,handling:80,drift:85} },
  { id: 10, name: 'DUNE KING',   class: 'OFF-ROAD', shape: 'suv',      color: 0x44bb44, price: 700,  maxSpeed: 26,  accel: 17, brakeStr: 23, turnSpeed: 2.1,  grip: 0.93, driftFactor: 0.11, stats:{speed:60,accel:57,handling:92,drift:55} },
  { id: 11, name: 'KATANA',      class: 'SPORT',    shape: 'coupe',    color: 0xff6600, price: 2500, maxSpeed: 48,  accel: 38, brakeStr: 37, turnSpeed: 2.4,  grip: 0.90, driftFactor: 0.22, stats:{speed:100,accel:92,handling:88,drift:80} },
];

const CHALLENGES = [
  { id: 0, icon: '🌀', name: 'DRIFT KING',       desc: 'Reach 5000 drift points in one session',   reward: 300,  type: 'drift',    target: 5000 },
  { id: 1, icon: '⚡', name: 'LIGHTNING RUN',    desc: 'Reach 100 km/h',                            reward: 200,  type: 'speed',    target: 100 },
  { id: 2, icon: '✈️', name: 'AIR TIME',         desc: 'Stay airborne for 3 seconds',               reward: 400,  type: 'air',      target: 3 },
  { id: 3, icon: '🗺️', name: 'EXPLORER',         desc: 'Visit 5 different zones on the map',        reward: 250,  type: 'explore',  target: 5 },
  { id: 4, icon: '🏁', name: 'DISTANCE DRIVER',  desc: 'Drive 5km total',                           reward: 500,  type: 'distance', target: 5000 },
  { id: 5, icon: '🔥', name: 'HYPER DRIFT',      desc: 'Reach x5 drift multiplier',                 reward: 600,  type: 'multdrift',target: 5 },
  { id: 6, icon: '🚀', name: 'TOP SPEED',        desc: 'Reach 200 km/h',                            reward: 1000, type: 'topspeed', target: 200 },
];

const MISSIONS = [
  { title: 'First Drive',    desc: 'Drive around and explore',     type: 'explore', target: 1, reward: 50 },
  { title: 'Zone Scout',     desc: 'Visit 3 different zones',      type: 'explore', target: 3, reward: 150 },
  { title: 'Speed Run',      desc: 'Hit 80 km/h',                  type: 'speed',   target: 80, reward: 100 },
  { title: 'Drift Session',  desc: 'Score 1000 drift points',      type: 'drift',   target: 1000, reward: 200 },
  { title: 'Long Haul',      desc: 'Drive 2km',                    type: 'distance',target: 2000, reward: 300 },
  { title: 'Sky High',       desc: 'Get 2s of airtime',            type: 'air',     target: 2, reward: 400 },
  { title: 'Drift Master',   desc: 'Score 3000 drift points',      type: 'drift',   target: 3000, reward: 500 },
];

// ─── ZONES ────────────────────────────────────────────────────────────────────
const ZONES = [
  { name: 'NEON CITY CENTRE', cx: 0,    cz: 0,    r: 100 },
  { name: 'HARBOUR DISTRICT', cx: 500,  cz: -350, r: 130 },
  { name: 'HIGHLAND PASS',    cx: -400, cz: 300,  r: 120 },
  { name: 'INDUSTRIAL ZONE',  cx: 350,  cz: 500,  r: 140 },
  { name: 'TUNNEL NETWORK',   cx: -500, cz: -200, r: 110 },
  { name: 'EAST HIGHWAY',     cx: 650,  cz: 0,    r: 150 },
  { name: 'DRIFT PARK',       cx: -150, cz: -500, r: 110 },
  { name: 'NORTH QUARTER',    cx: 0,    cz: -600, r: 130 },
  { name: 'WEST FLATS',       cx: -600, cz: 200,  r: 130 },
  { name: 'SOUTH MARINA',     cx: 200,  cz: 650,  r: 120 },
];

// ─── THREE.JS GLOBALS ─────────────────────────────────────────────────────────
let renderer, scene, camera;
let carMesh, carWheels = [];
let groundMesh;
let running = false;
let animId = null;
let prevTime = 0;
let sunLight, ambientLight, fillLight, starsPoints;
let dayNightLabel = null;

// ─── PHYSICS STATE ───────────────────────────────────────────────────────────
const carPhysics = {
  pos: new THREE.Vector3(0, 0, 0),
  vel: new THREE.Vector3(),   // world-space m/s
  heading: 0,                 // radians, Y-up
  angularVel: 0,
  onGround: true,
  verticalVel: 0,
  groundY: 0,
};

// ─── INPUT ────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; handleKeyDown(e); });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

// ─── WORLD DATA ───────────────────────────────────────────────────────────────
const neonColors = [0x00f5ff, 0xff00cc, 0x00ff88, 0xffe600, 0x8800ff];

// [x1,z1, x2,z2, width]
const ROAD_SEGMENTS = [
  // Inner ring
  [-350,-350,  350,-350, 22],
  [ 350,-350,  350, 350, 22],
  [ 350, 350, -350, 350, 22],
  [-350, 350, -350,-350, 22],
  // Outer ring
  [-700,-700,  700,-700, 18],
  [ 700,-700,  700, 700, 18],
  [ 700, 700, -700, 700, 18],
  [-700, 700, -700,-700, 18],
  // Inner-to-outer spokes
  [0,-350,   0,-700, 18],
  [350,0,   700,0,  18],
  [0, 350,  0, 700, 18],
  [-350,0, -700,0,  18],
  // Diagonal inner cross
  [-350,-350, 0, 0, 16],
  [ 350,-350, 0, 0, 16],
  [ 350, 350, 0, 0, 16],
  [-350, 350, 0, 0, 16],
  // Harbour spur (NE)
  [350,-350, 550,-500, 14],
  [550,-500, 700,-350, 14],
  // Industrial south
  [350,350,  350,550, 14],
  [350,550,  200,700, 14],
  // Tunnel/West
  [-350,-200, -550,-200, 14],
  [-550,-200, -700,-350, 14],
  // Drift park loop
  [-100,-400, -300,-400, 14],
  [-300,-400, -300,-560, 14],
  [-300,-560, -100,-560, 14],
  [-100,-560, -100,-400, 14],
  // West flats bypass
  [-350,200, -700,200, 14],
  // South marina spur
  [100,700, 350,700, 14],
];

// [x, z, w, d, h, colorHex]
const BUILDINGS_DATA = [
  // City centre
  [-60,-60, 30,30,80, 0x001122],[-30,-70, 20,20,60, 0x001133],
  [ 50,-50, 25,35,100,0x000d1a],[ 70,-70, 20,20,50, 0x001122],
  [-70, 50, 35,25,90, 0x000d1a],[ 60, 60, 30,30,75, 0x001122],
  [-50,-90, 20,40,55, 0x001133],[ 90, 20, 25,20,65, 0x000d1a],
  [ 30, 30, 20,20,45, 0x001122],[-80,-30, 25,15,70, 0x001133],
  // Harbour NE
  [480,-380,40,30,40, 0x001122],[530,-360,25,25,30, 0x001133],
  [560,-420,30,40,50, 0x000d1a],[620,-380,35,35,35, 0x001122],
  // Industrial SE
  [320,420, 50,40,25, 0x0a0a0a],[400,480, 40,50,20, 0x0a0a0a],
  [260,500, 60,30,30, 0x0a0a0a],[450,430, 35,35,40, 0x0a0a0a],
  [370,560, 55,45,22, 0x0a0a0a],
  // Tunnel/West
  [-450,-250,30,25,45, 0x001122],[-500,-200,20,20,35, 0x000d1a],
  [-480,-300,35,30,55, 0x001133],[-560,-280,25,25,40, 0x001122],
  // Mid-map scattered
  [-200,100, 30,25,45, 0x001122],[-180,150, 20,20,35, 0x000d1a],
  [ 150,-100,25,30,55, 0x001122],[ 130,-140,20,25,40, 0x001133],
  [-100, 200,35,30,65, 0x000d1a],[-130, 220,20,20,50, 0x001122],
  [ 200, 200,30,30,50, 0x001133],[ 250,-200,25,25,60, 0x000d1a],
  [-200,-200,35,25,55, 0x001122],[ 180, 300,20,30,42, 0x001133],
  // North quarter
  [ 100,-500,30,30,50, 0x001122],[-100,-520,25,25,60, 0x001133],
  [ 200,-550,35,20,45, 0x000d1a],[-200,-480,20,30,35, 0x001122],
  // West flats
  [-500,150, 45,30,30, 0x0a1015],[-580,220, 30,30,25, 0x0a1015],
  [-530,300, 40,25,20, 0x0a1015],
  // South marina
  [ 150,560, 35,25,40, 0x001122],[ 280,580, 25,30,35, 0x001133],
  [ 350,520, 30,30,45, 0x000d1a],
];

const RAMPS = [
  { cx: 0,    cz: -300, rx: 20, rz: 45, h: 8,  angle: 0 },
  { cx: 300,  cz: -300, rx: 30, rz: 18, h: 6,  angle: Math.PI/4 },
  { cx: -250, cz: 150,  rx: 18, rz: 40, h: 10, angle: -0.3 },
  { cx: 150,  cz: 500,  rx: 25, rz: 22, h: 7,  angle: 0.5 },
  { cx: -150, cz: -480, rx: 30, rz: 18, h: 5,  angle: 0 },
  { cx: 500,  cz: 0,    rx: 20, rz: 30, h: 6,  angle: Math.PI/2 },
];

// Collision AABBs (populated when buildings are created)
let buildingAABBs = [];

// ─── THREE.JS INIT ───────────────────────────────────────────────────────────
function initThree() {
  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a1030, 260, 1100);
  scene.background = new THREE.Color(0x1a1030);

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2500);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ─── BUILD WORLD ─────────────────────────────────────────────────────────────
function buildWorld() {
  ambientLight = new THREE.AmbientLight(0x334466, 2.5);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xff8833, 0.8);
  sunLight.position.set(-200, 300, -100);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 1500;
  sunLight.shadow.camera.left = -800;
  sunLight.shadow.camera.right = 800;
  sunLight.shadow.camera.top = 800;
  sunLight.shadow.camera.bottom = -800;
  scene.add(sunLight);

  fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
  fillLight.position.set(200, 100, 200);
  scene.add(fillLight);

  // Scattered neon point lights
  for (let i = 0; i < 70; i++) {
    const pl = new THREE.PointLight(neonColors[i % neonColors.length], 3, 70);
    pl.position.set(
      (Math.random() - 0.5) * 1400,
      2 + Math.random() * 10,
      (Math.random() - 0.5) * 1400
    );
    scene.add(pl);
  }

  // Ground
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.9 });
  groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const grid = new THREE.GridHelper(2000, 120, 0x00f5ff, 0x00f5ff);
  grid.material.opacity = 0.06;
  grid.material.transparent = true;
  scene.add(grid);

  buildRoads();
  buildBuildings();
  buildRamps();
  buildStars();
  buildDecor();
}

function buildRoads() {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x252d3a, roughness: 0.95 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffff99, emissiveIntensity: 0.5 });

  ROAD_SEGMENTS.forEach(([x1, z1, x2, z2, w]) => {
    const dx = x2-x1, dz = z2-z1;
    const len = Math.sqrt(dx*dx + dz*dz);
    const angle = Math.atan2(dx, dz);
    const cx = (x1+x2)/2, cz = (z1+z2)/2;

    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, len), roadMat.clone());
    road.rotation.set(-Math.PI/2, 0, -angle);
    road.position.set(cx, 0.02, cz);
    scene.add(road);

    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.4, len), lineMat.clone());
    stripe.rotation.x = -Math.PI/2;
    stripe.rotation.z = -angle;
    stripe.position.set(cx, 0.04, cz);
    scene.add(stripe);

    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.3, len), lineMat.clone());
      edge.rotation.x = -Math.PI/2;
      edge.rotation.z = -angle;
      edge.position.set(cx + (-dz/len)*(w/2-1)*side, 0.04, cz + (dx/len)*(w/2-1)*side);
      scene.add(edge);
    }

    const lampCount = Math.floor(len / 50);
    for (let i = 0; i <= lampCount; i++) {
      const t = i / (lampCount || 1);
      buildLamp(
        x1 + dx*t + (-dz/len)*(w/2+2),
        z1 + dz*t + ( dx/len)*(w/2+2),
        neonColors[Math.floor(Math.random() * neonColors.length)]
      );
    }
  });
}

function buildLamp(x, z, color) {
  const postMat = new THREE.MeshLambertMaterial({ color: 0x223344 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 7, 4), postMat);
  post.position.set(x, 3.5, z);
  scene.add(post);

  const headMat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 1 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.7), headMat);
  head.position.set(x, 7.2, z);
  scene.add(head);
}

function buildBuildings() {
  buildingAABBs = [];
  const margin = 1.8;

  BUILDINGS_DATA.forEach(([x, z, w, d, h, col]) => {
    const mat = new THREE.MeshLambertMaterial({ color: col });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h/2, z);
    mesh.castShadow = true;
    scene.add(mesh);

    // Collision AABB
    buildingAABBs.push({
      minX: x - w/2 - margin, maxX: x + w/2 + margin,
      minZ: z - d/2 - margin, maxZ: z + d/2 + margin,
    });

    const accentColor = neonColors[Math.floor(Math.random() * neonColors.length)];
    const accentMat = new THREE.MeshLambertMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.8 });
    for (let band = 1; band <= 3; band++) {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(w+0.2, 0.3, d+0.2), accentMat);
      bm.position.set(x, (band/4)*h, z);
      scene.add(bm);
    }

    const winColor = Math.random() > 0.5 ? 0xfff8d0 : accentColor;
    const winMat = new THREE.MeshLambertMaterial({ color: winColor, emissive: winColor, emissiveIntensity: 0.6 });
    const cols = Math.floor(w/5), rows = Math.floor(h/8);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (Math.random() > 0.4) {
          const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2), winMat.clone());
          wm.position.set(x - w/2 + 2 + c*5, 4 + r*8, z + d/2 + 0.05);
          scene.add(wm);
        }
      }
    }
  });
}

function buildRamps() {
  const rampMat = new THREE.MeshLambertMaterial({ color: 0x0a1828 });
  RAMPS.forEach(r => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(r.rx*2, r.h, r.rz*2), rampMat);
    mesh.position.set(r.cx, r.h/2-0.5, r.cz);
    mesh.rotation.y = r.angle;
    mesh.rotation.x = 0.35;
    mesh.castShadow = true;
    scene.add(mesh);

    const accentMat = new THREE.MeshLambertMaterial({ color: 0xffe600, emissive: 0xffe600, emissiveIntensity: 0.5 });
    for (let i = 0; i < 3; i++) {
      const lm = new THREE.Mesh(new THREE.PlaneGeometry(r.rx*2, 0.3), accentMat);
      lm.rotation.x = -Math.PI/2;
      lm.position.set(r.cx, r.h*0.01+0.1, r.cz - r.rz + (i/2)*r.rz);
      scene.add(lm);
    }
  });
}

function buildStars() {
  const positions = [];
  for (let i = 0; i < 5000; i++) {
    positions.push(
      (Math.random()-0.5)*4000,
      120 + Math.random()*600,
      (Math.random()-0.5)*4000
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  starsPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true }));
  scene.add(starsPoints);
}

function buildDecor() {
  // Neon archways
  const archMat = new THREE.MeshLambertMaterial({ color: 0x00f5ff, emissive: 0x00f5ff, emissiveIntensity: 1 });
  [[0,-350],[350,0],[0,350],[-350,0],[0,-700],[700,0],[0,700],[-700,0]].forEach(([ax, az]) => {
    for (const side of [-1,1]) {
      const pill = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 18, 6), archMat);
      pill.position.set(ax + side*14, 9, az);
      scene.add(pill);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 29, 6), archMat);
    bar.rotation.z = Math.PI/2;
    bar.position.set(ax, 18, az);
    scene.add(bar);
  });

  // Elevated east highway
  const deckMat  = new THREE.MeshLambertMaterial({ color: 0x0d1828 });
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x0a1520 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(370, 1, 22), deckMat);
  deck.position.set(530, 14, 0);
  scene.add(deck);
  for (let px = 370; px <= 710; px += 50) {
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 14, 6), pillarMat);
    pm.position.set(px, 7, 0);
    scene.add(pm);
  }
  const rampUp = new THREE.Mesh(new THREE.BoxGeometry(80, 14, 22), deckMat);
  rampUp.position.set(358, 7, 0);
  rampUp.rotation.z = -0.30;
  scene.add(rampUp);

  // Neon signs
  const signColors = [0xff00cc, 0x00f5ff, 0xffe600];
  [[0,-60,40],[60,0,80],[-60,60,50],[-40,-40,70],[0,-90,60],[-80,80,55]].forEach(([sx,sz,sy], i) => {
    const sgMat = new THREE.MeshLambertMaterial({ color: signColors[i%3], emissive: signColors[i%3], emissiveIntensity: 2 });
    const sg = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 0.3), sgMat);
    sg.position.set(sx, sy+5, sz);
    scene.add(sg);
  });

  // Harbour cranes
  buildCrane(520, -400);
  buildCrane(590, -430);

  // Water
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x000d22, emissive: 0x000d22, transparent: true, opacity: 0.9 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(320, 220), waterMat);
  water.rotation.x = -Math.PI/2;
  water.position.set(680, -0.5, -430);
  scene.add(water);

  // Drift park barriers
  const barrierMat = new THREE.MeshLambertMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.4 });
  const barriers = [
    { x:-200, z:-400, w:200, d:1.5 }, // top
    { x:-200, z:-560, w:200, d:1.5 }, // bottom
    { x:-100, z:-480, w:1.5, d:160 }, // right
    { x:-300, z:-480, w:1.5, d:160 }, // left
  ];
  barriers.forEach(b => {
    const bm = new THREE.Mesh(new THREE.BoxGeometry(b.w, 2.5, b.d), barrierMat);
    bm.position.set(b.x, 1.25, b.z);
    scene.add(bm);
  });
}

function buildCrane(cx, cz) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x223344 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 60, 2), mat);
  tower.position.set(cx, 30, cz);
  scene.add(tower);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(50, 1.5, 1.5), mat);
  boom.position.set(cx+25, 60, cz);
  scene.add(boom);
  const alMat = new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });
  const al = new THREE.Mesh(new THREE.SphereGeometry(0.5, 4, 4), alMat);
  al.position.set(cx+50, 61, cz);
  scene.add(al);
}

// ─── DAY / NIGHT CYCLE ───────────────────────────────────────────────────────
function updateDayNight(dt) {
  STATE.dayTime = (STATE.dayTime + STATE.daySpeed * dt) % 1.0;
  const t = STATE.dayTime;

  // Sun: rises t=0.25, noon t=0.5, sets t=0.75
  const sunAngle = (t - 0.25) * Math.PI * 2;
  const sunY = Math.sin(sunAngle) * 400;
  sunLight.position.set(Math.cos(sunAngle) * 600, Math.max(-150, sunY), -100);

  const dayFactor = Math.max(0, Math.sin(sunAngle));
  const isSunrise = t > 0.20 && t < 0.38;
  const isSunset  = t > 0.62 && t < 0.80;

  // Sky colour
  const nightSky = new THREE.Color(0x04060f);
  const daySky   = new THREE.Color(0x3366aa);
  const duskSky  = new THREE.Color(0x2a0d18);
  let sky = nightSky.clone().lerp(daySky, dayFactor * 0.75);
  if (isSunrise || isSunset) sky.lerp(duskSky, (1 - Math.abs(dayFactor - 0.15)/0.15) * 0.5);
  scene.background = sky;
  scene.fog.color  = sky;
  scene.fog.near   = 260 + dayFactor * 200;
  scene.fog.far    = 1100 + dayFactor * 400;

  // Sun colour & intensity
  if (isSunrise || isSunset) {
    sunLight.color.set(0xff6622);
    sunLight.intensity = dayFactor * 1.0;
  } else {
    sunLight.color.set(0xfff0d0);
    sunLight.intensity = dayFactor * 1.5;
  }

  ambientLight.intensity = 0.5 + dayFactor * 2.5;
  ambientLight.color.set(dayFactor > 0.1 ? 0x334466 : 0x111133);
  fillLight.intensity = dayFactor * 0.6;

  // Stars fade with daylight
  if (starsPoints) {
    starsPoints.material.opacity = Math.max(0, 1 - dayFactor * 3.0);
    starsPoints.material.transparent = true;
  }

  renderer.toneMappingExposure = 0.5 + dayFactor * 0.5;

  // HUD clock
  if (!dayNightLabel) {
    dayNightLabel = document.createElement('div');
    dayNightLabel.style.cssText = `position:absolute;bottom:1rem;right:2rem;font-size:0.55rem;
      letter-spacing:0.2em;color:#88aaccaa;font-family:var(--font-mono);text-align:right;pointer-events:none;`;
    document.getElementById('hud').appendChild(dayNightLabel);
  }
  const hour = Math.floor(t * 24);
  const min  = Math.floor((t * 24 - hour) * 60);
  const h12  = ((hour % 12) || 12).toString().padStart(2,'0');
  const mm   = min.toString().padStart(2,'0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const emoji = hour >= 6 && hour < 12 ? '🌅' : hour >= 12 && hour < 18 ? '☀️' : hour >= 18 && hour < 21 ? '🌆' : '🌙';
  dayNightLabel.textContent = `${emoji} ${h12}:${mm} ${ampm}`;
}

// ─── CAR BUILDER ─────────────────────────────────────────────────────────────
// Builds smooth, polished car meshes using cross-section extrusion.
// Each car body is defined by a series of cross-sectional profiles along its
// length. We connect adjacent profiles with quads to form a smooth mesh.
// This gives us genuine curved surfaces — not just boxes.

function buildCar(carDef) {
  if (carMesh) { scene.remove(carMesh); carMesh = null; carWheels = []; }

  const col   = carDef.color;
  const shape = carDef.shape || 'sedan';

  // ── Materials ──────────────────────────────────────────────────────────────
  const matBody  = new THREE.MeshStandardMaterial({
    color: col, roughness: 0.15, metalness: 0.85
  });
  const matBodySide = new THREE.MeshStandardMaterial({
    color: col, roughness: 0.20, metalness: 0.80
  });
  const matDark  = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.5, metalness: 0.4 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x0d1f2d, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.42 });
  const matGlassTop = new THREE.MeshStandardMaterial({ color: 0x080f14, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55 });
  const matLight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0cc, emissiveIntensity: 2.2, roughness: 0.05 });
  const matDRL   = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.0, roughness: 0.05 });
  const matBrake = new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0xff1100, emissiveIntensity: 2.5, roughness: 0.1 });
  const matBrakeOff = new THREE.MeshStandardMaterial({ color: 0x330000, roughness: 0.3 });
  const matTyre  = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.98 });
  const matRim   = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.06, metalness: 1.0 });
  const matRimDk = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.9 });
  const matChrome= new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.04, metalness: 1.0 });
  const matPlate = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.6 });
  const matGlow  = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 3.5, roughness: 1.0, transparent: true, opacity: 0.9 });

  carMesh = new THREE.Group();

  // ── Helper ─────────────────────────────────────────────────────────────────
  function mesh(geo, mat, x=0,y=0,z=0, rx=0,ry=0,rz=0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
    m.castShadow = true; m.receiveShadow = false;
    carMesh.add(m); return m;
  }

  // Build a smooth body panel from a list of cross-section rings.
  // Each ring: { z, pts: [[x,y], ...] }  — pts define the profile in X-Y plane
  // Connects consecutive rings with quads → smooth body surface.
  function extrudeBody(rings, mat) {
    const positions = [];
    const normals   = [];
    const indices   = [];
    const n = rings[0].pts.length;

    rings.forEach(r => {
      r.pts.forEach(([x, y]) => {
        positions.push(x, y, r.z);
        normals.push(0, 1, 0); // placeholder — recomputed
      });
    });

    for (let ri = 0; ri < rings.length - 1; ri++) {
      for (let pi = 0; pi < n; pi++) {
        const a = ri * n + pi;
        const b = ri * n + (pi + 1) % n;
        const c = (ri + 1) * n + (pi + 1) % n;
        const d = (ri + 1) * n + pi;
        indices.push(a, b, c,  a, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    carMesh.add(m);
    return m;
  }

  // ── Shape-specific parameters ───────────────────────────────────────────────
  const S = {
    sedan:    { len:4.30, wide:1.88, floorH:0.30, beltH:0.72, roofH:1.18, roofW:1.30, cabStart:-0.60, cabEnd: 0.90, rearDrop:0.10, wR:0.35, wW:0.22, wBase:1.28, spoiler:false, flatRoof:false },
    coupe:    { len:4.50, wide:1.90, floorH:0.28, beltH:0.68, roofH:1.10, roofW:1.25, cabStart:-0.40, cabEnd: 1.10, rearDrop:0.18, wR:0.34, wW:0.23, wBase:1.35, spoiler:true,  flatRoof:false },
    suv:      { len:4.55, wide:2.00, floorH:0.42, beltH:0.88, roofH:1.52, roofW:1.50, cabStart:-0.70, cabEnd: 0.80, rearDrop:0.04, wR:0.42, wW:0.26, wBase:1.35, spoiler:false, flatRoof:true  },
    muscle:   { len:4.65, wide:2.02, floorH:0.30, beltH:0.70, roofH:1.12, roofW:1.28, cabStart:-0.50, cabEnd: 1.00, rearDrop:0.08, wR:0.37, wW:0.28, wBase:1.38, spoiler:false, flatRoof:false },
    hypercar: { len:4.70, wide:2.08, floorH:0.20, beltH:0.52, roofH:0.90, roofW:1.20, cabStart:-0.20, cabEnd: 1.30, rearDrop:0.20, wR:0.33, wW:0.24, wBase:1.42, spoiler:true,  flatRoof:false },
    hatchback:{ len:3.95, wide:1.82, floorH:0.30, beltH:0.72, roofH:1.20, roofW:1.28, cabStart:-0.80, cabEnd: 0.60, rearDrop:0.30, wR:0.34, wW:0.21, wBase:1.22, spoiler:false, flatRoof:false },
  }[shape];

  const { len, wide, floorH, beltH, roofH, roofW, cabStart, cabEnd, rearDrop, wR, wW, wBase, spoiler, flatRoof } = S;

  // Derived geometry
  const hL = len / 2; // half-length
  const hW = wide / 2;

  // ══════════════════════════════════════════════════════════════════════════
  //  BODY — built as 5 longitudinal cross-section profiles extruded
  //  We build a single mesh for the entire body shell using the extrusion approach
  // ══════════════════════════════════════════════════════════════════════════

  // Cross-section profile at a given Z position along the car (Z = +front, -rear)
  // Returns 8 points going clockwise around the body cross-section.
  // The profile changes smoothly depending on where we are along the car.
  function bodyProfile(z) {
    const t = (z + hL) / len; // 0=rear, 1=front
    // Body width narrows at nose and tail
    const noseT  = Math.max(0, (t - 0.80) / 0.20);   // 0→1 over last 20% (front)
    const tailT  = Math.max(0, (0.15 - t) / 0.15);   // 0→1 over first 15% (rear)
    const w = hW * (1 - noseT * 0.28) * (1 - tailT * 0.18);

    // Roof height fades at nose/tail
    const inCabin = z > cabStart - 0.4 && z < cabEnd + 0.3;
    const cabinFadeF = Math.max(0, Math.min(1, (cabEnd + 0.3 - z) / 0.5));
    const cabinFadeR = Math.max(0, Math.min(1, (z - (cabStart - 0.4)) / 0.5));
    const cabinFade = Math.min(cabinFadeF, cabinFadeR);

    const rh = roofH * cabinFade;
    const rw = roofW * 0.5 * Math.min(cabinFade + 0.1, 1.0);

    // Belt line height (top of main body, before glass)
    const bh = floorH + (beltH - floorH) * Math.min(1.0, 1 - noseT * 0.35);

    // Profile corners — 10-point profile for smooth body:
    // bottom-left, side-left-low, side-left-high (shoulder), roof-left, roof-centre-left, roof-centre-right, roof-right, side-right-high, side-right-low, bottom-right
    const shoulder = bh - 0.06;
    const pts = [
      [-w * 0.88,  floorH * 0.30],   // bottom left
      [-w,         floorH],           // sill left
      [-w,         shoulder],         // door top left
      [-w * 0.94,  bh],               // shoulder left
      [-rw,        rh > 0.01 ? rh : bh + 0.01],   // roof left
      [ rw,        rh > 0.01 ? rh : bh + 0.01],   // roof right
      [ w * 0.94,  bh],               // shoulder right
      [ w,         shoulder],         // door top right
      [ w,         floorH],           // sill right
      [ w * 0.88,  floorH * 0.30],    // bottom right
    ];
    return { z, pts };
  }

  // Generate enough slices for a smooth body
  const bodySlices = [];
  for (let i = 0; i <= 32; i++) {
    const z = -hL + (i / 32) * len;
    bodySlices.push(bodyProfile(z));
  }
  extrudeBody(bodySlices, matBody);

  // ── Front cap (nose panel) ──
  // Close off the front face with a simple dark grille area
  const nosePts = bodyProfile(hL).pts;
  const nosePosArr = [];
  nosePts.forEach(([x,y]) => nosePosArr.push(x, y, hL));
  nosePosArr.push(0, floorH + (beltH - floorH)*0.5, hL); // centre
  const noseGeo = new THREE.BufferGeometry();
  noseGeo.setAttribute('position', new THREE.Float32BufferAttribute(nosePosArr, 3));
  const noseIdx = [];
  const nc = nosePts.length;
  for (let i = 0; i < nc - 1; i++) noseIdx.push(i, i+1, nc);
  noseIdx.push(nc-1, 0, nc);
  noseGeo.setIndex(noseIdx);
  noseGeo.computeVertexNormals();
  carMesh.add(new THREE.Mesh(noseGeo, matDark));

  // ── Rear cap ──
  const rearPts = bodyProfile(-hL).pts;
  const rearPosArr = [];
  rearPts.forEach(([x,y]) => rearPosArr.push(x, y, -hL));
  rearPosArr.push(0, floorH + (beltH - floorH)*0.5, -hL);
  const rearGeo = new THREE.BufferGeometry();
  rearGeo.setAttribute('position', new THREE.Float32BufferAttribute(rearPosArr, 3));
  const rearIdx = [];
  for (let i = 0; i < rearPts.length - 1; i++) rearIdx.push(i+1, i, rearPts.length);
  rearIdx.push(0, rearPts.length-1, rearPts.length);
  rearGeo.setIndex(rearIdx);
  rearGeo.computeVertexNormals();
  carMesh.add(new THREE.Mesh(rearGeo, matDark));

  // ══════════════════════════════════════════════════════════════════════════
  //  GLASS — roof + windows as a single smooth shell slightly inside body
  // ══════════════════════════════════════════════════════════════════════════

  // Glass profile slightly inset from body
  function glassProfile(z) {
    const t = (z - cabStart) / (cabEnd - cabStart);
    const fade = Math.max(0, Math.min(1, Math.min(t / 0.15, (1-t) / 0.15)));
    const rw2 = roofW * 0.48 * (1 - Math.pow(1 - fade, 2) * 0.3);
    const rh  = (roofH - 0.04) * Math.max(0, fade);
    const bh  = floorH + (beltH - floorH) * 0.98;
    const gw  = hW * 0.92;

    return { z, pts: [
      [-gw,  bh + 0.01],
      [-rw2, rh > bh + 0.02 ? rh : bh + 0.02],
      [ rw2, rh > bh + 0.02 ? rh : bh + 0.02],
      [ gw,  bh + 0.01],
    ]};
  }

  const glassSlices = [];
  for (let i = 0; i <= 20; i++) {
    const z = cabStart + (i / 20) * (cabEnd - cabStart);
    glassSlices.push(glassProfile(z));
  }

  // Glass top (roof)
  const glassTopPositions = [];
  const glassTopIdx = [];
  glassSlices.forEach(r => {
    r.pts.forEach(([x,y]) => glassTopPositions.push(x, y, r.z));
  });
  const gs = glassSlices[0].pts.length;
  for (let ri = 0; ri < glassSlices.length - 1; ri++) {
    for (let pi = 0; pi < gs - 1; pi++) {
      const a = ri*gs+pi, b = ri*gs+pi+1, c = (ri+1)*gs+pi+1, d = (ri+1)*gs+pi;
      glassTopIdx.push(a,b,c, a,c,d);
    }
  }
  const gTopGeo = new THREE.BufferGeometry();
  gTopGeo.setAttribute('position', new THREE.Float32BufferAttribute(glassTopPositions, 3));
  gTopGeo.setIndex(glassTopIdx);
  gTopGeo.computeVertexNormals();
  carMesh.add(new THREE.Mesh(gTopGeo, matGlassTop));

  // Windshield (front glass face)
  const wsProf = glassProfile(cabEnd);
  const wsBody = bodyProfile(cabEnd);
  const wsPos = [
    wsProf.pts[0][0], wsProf.pts[0][1], cabEnd,
    wsProf.pts[1][0], wsProf.pts[1][1], cabEnd,
    wsProf.pts[2][0], wsProf.pts[2][1], cabEnd,
    wsProf.pts[3][0], wsProf.pts[3][1], cabEnd,
    wsBody.pts[3][0], wsBody.pts[3][1], cabEnd,
    wsBody.pts[6][0], wsBody.pts[6][1], cabEnd,
  ];
  const wsGeo = new THREE.BufferGeometry();
  wsGeo.setAttribute('position', new THREE.Float32BufferAttribute(wsPos, 3));
  wsGeo.setIndex([0,1,2, 0,2,3, 4,0,3, 3,5,4]);
  wsGeo.computeVertexNormals();
  carMesh.add(new THREE.Mesh(wsGeo, matGlass));

  // Rear glass face
  const rgProf = glassProfile(cabStart);
  const rgBody = bodyProfile(cabStart);
  const rgPos = [
    rgBody.pts[3][0], rgBody.pts[3][1], cabStart,
    rgProf.pts[0][0], rgProf.pts[0][1], cabStart,
    rgProf.pts[1][0], rgProf.pts[1][1], cabStart,
    rgProf.pts[2][0], rgProf.pts[2][1], cabStart,
    rgProf.pts[3][0], rgProf.pts[3][1], cabStart,
    rgBody.pts[6][0], rgBody.pts[6][1], cabStart,
  ];
  const rgGeo = new THREE.BufferGeometry();
  rgGeo.setAttribute('position', new THREE.Float32BufferAttribute(rgPos, 3));
  rgGeo.setIndex([0,2,1, 0,3,2, 0,4,3, 0,5,4]);
  rgGeo.computeVertexNormals();
  carMesh.add(new THREE.Mesh(rgGeo, matGlass));

  // ══════════════════════════════════════════════════════════════════════════
  //  FRONT DETAILS
  // ══════════════════════════════════════════════════════════════════════════
  const fZ = hL + 0.01;
  const nw = bodyProfile(hL).pts;
  // Grille frame (dark surround)
  mesh(new THREE.BoxGeometry(wide * 0.72, (beltH - floorH) * 0.48, 0.08),
    matDark, 0, floorH + (beltH-floorH)*0.28, fZ + 0.04);
  // Grille mesh (inner darker)
  mesh(new THREE.BoxGeometry(wide * 0.62, (beltH - floorH) * 0.36, 0.06),
    matDark, 0, floorH + (beltH-floorH)*0.24, fZ + 0.07);

  // Headlight clusters — left and right
  for (const s of [-1, 1]) {
    const hlX = s * wide * 0.33;
    const hlY = floorH + (beltH - floorH) * 0.75;
    // Housing (wider than lens, wraps around)
    mesh(new THREE.BoxGeometry(wide * 0.26, (beltH-floorH)*0.26, 0.10), matDark,
      hlX, hlY, fZ + 0.05);
    // Main projector lens (round-ish box)
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), matLight,
      hlX, hlY + 0.02, fZ + 0.07, 0,0,0);
    mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), matLight,
      hlX + s*0.11, hlY - 0.01, fZ + 0.07, 0,0,0);
    // DRL strip (bright horizontal)
    mesh(new THREE.BoxGeometry(wide*0.23, 0.03, 0.04), matDRL,
      hlX, hlY - 0.10, fZ + 0.08);
    // Point light
    const hl = new THREE.PointLight(0xfff6e0, 2.0, 45);
    hl.position.set(hlX * 0.6, hlY, fZ + 3.0);
    carMesh.add(hl);
  }

  // Front bumper lower lip / chin spoiler
  mesh(new THREE.BoxGeometry(wide * 0.88, 0.08, 0.30), matDark,
    0, floorH + 0.04, fZ + 0.12);
  // Splitter
  mesh(new THREE.BoxGeometry(wide * 0.70, 0.04, 0.18), matDark,
    0, floorH * 0.85, fZ + 0.09);

  // ══════════════════════════════════════════════════════════════════════════
  //  REAR DETAILS
  // ══════════════════════════════════════════════════════════════════════════
  const rZ = -hL - 0.01;
  // Full-width light bar
  mesh(new THREE.BoxGeometry(wide * 0.86, 0.04, 0.06), matBrake,
    0, floorH + (beltH-floorH)*0.78, rZ - 0.03);

  // Tail light clusters
  for (const s of [-1, 1]) {
    const tlX = s * wide * 0.32;
    const tlY = floorH + (beltH-floorH)*0.72;
    mesh(new THREE.BoxGeometry(wide*0.28, (beltH-floorH)*0.30, 0.08), matDark,
      tlX, tlY, rZ - 0.04);
    mesh(new THREE.BoxGeometry(wide*0.22, (beltH-floorH)*0.20, 0.06), matBrake,
      tlX, tlY + 0.01, rZ - 0.06);
    // Lower strip
    mesh(new THREE.BoxGeometry(wide*0.22, 0.04, 0.05), matBrake,
      tlX, tlY - (beltH-floorH)*0.14, rZ - 0.06);
  }

  // Diffuser
  mesh(new THREE.BoxGeometry(wide * 0.74, 0.10, 0.26), matDark,
    0, floorH + 0.05, rZ - 0.13);
  // Diffuser fins
  for (let f = -3; f <= 3; f++) {
    mesh(new THREE.BoxGeometry(0.03, 0.08, 0.24), matDark,
      f * wide * 0.09, floorH + 0.05, rZ - 0.13);
  }

  // Licence plate
  mesh(new THREE.BoxGeometry(0.48, 0.22, 0.03), matPlate, 0, floorH + (beltH-floorH)*0.42, rZ - 0.02);

  // ── Exhaust pipes ──
  const exSpacing = shape === 'muscle' ? 0.44 : shape === 'hypercar' ? 0.52 : 0.26;
  const pipes = (shape === 'muscle' || shape === 'hypercar') ? [-exSpacing, exSpacing] : [-exSpacing, exSpacing];
  pipes.forEach(ex => {
    mesh(new THREE.CylinderGeometry(0.072, 0.064, 0.30, 12), matChrome,
      ex, floorH + 0.10, rZ - 0.15, Math.PI/2);
    mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.08, 12), matDark,
      ex, floorH + 0.10, rZ - 0.32, Math.PI/2);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  SPOILER / WING
  // ══════════════════════════════════════════════════════════════════════════
  if (spoiler) {
    const spY = shape === 'hypercar' ? floorH + beltH * 0.85 : roofH + 0.06;
    const spZ = -(hL - 0.25);
    const spW = wide * (shape === 'hypercar' ? 0.80 : 0.72);
    // Blade with aerofoil cross-section (approximate with tapered box)
    mesh(new THREE.BoxGeometry(spW, 0.07, 0.36), matDark, 0, spY, spZ, -0.12);
    // End plates
    for (const s of [-1,1]) {
      mesh(new THREE.BoxGeometry(0.06, 0.26, 0.38), matDark, s * spW * 0.5, spY - 0.08, spZ);
    }
    // Stands
    for (const s of [-0.30, 0.30]) {
      mesh(new THREE.BoxGeometry(0.08, spY - (beltH + 0.05), 0.08), matDark,
        s * wide, (beltH + spY) * 0.5, spZ);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  HOOD DETAILS
  // ══════════════════════════════════════════════════════════════════════════
  // Hood vents / scoop (muscle / hypercar)
  if (shape === 'muscle') {
    mesh(new THREE.BoxGeometry(wide * 0.22, 0.06, hL * 0.40), matDark,
      0, beltH - 0.02, hL * 0.30);
  }
  if (shape === 'hypercar') {
    for (const s of [-0.28, 0.28]) {
      mesh(new THREE.BoxGeometry(0.18, 0.05, hL * 0.35), matDark,
        s * wide, beltH - 0.01, hL * 0.28);
    }
  }

  // A-pillar chrome trim (at windshield edges)
  for (const s of [-1,1]) {
    mesh(new THREE.BoxGeometry(0.06, beltH*0.28, 0.06), matChrome,
      s * roofW * 0.52, beltH + beltH*0.14, cabEnd - 0.05, -0.42);
  }

  // Roof / B-pillar (dark strip between front and rear glass)
  mesh(new THREE.BoxGeometry(roofW * 0.14, roofH - beltH + 0.04, (cabEnd-cabStart)*0.22), matDark,
    -roofW*0.5, beltH + (roofH-beltH)*0.5, (cabEnd+cabStart)*0.5 - (cabEnd-cabStart)*0.12);
  mesh(new THREE.BoxGeometry(roofW * 0.14, roofH - beltH + 0.04, (cabEnd-cabStart)*0.22), matDark,
     roofW*0.5, beltH + (roofH-beltH)*0.5, (cabEnd+cabStart)*0.5 - (cabEnd-cabStart)*0.12);

  // Side mirrors
  for (const s of [-1,1]) {
    const mX = s * (hW + 0.14);
    const mY = beltH + 0.02;
    const mZ = cabEnd - 0.15;
    // Arm
    mesh(new THREE.BoxGeometry(0.14, 0.06, 0.10), matBody, mX, mY, mZ);
    // Head (tapered)
    mesh(new THREE.BoxGeometry(0.10, 0.18, 0.28), matDark, mX, mY + 0.02, mZ + 0.14);
    // Mirror glass
    mesh(new THREE.BoxGeometry(0.04, 0.14, 0.22), matGlass, mX, mY + 0.02, mZ + 0.14);
  }

  // Door handles
  for (const s of [-1,1]) {
    mesh(new THREE.BoxGeometry(0.03, 0.05, 0.22), matChrome,
      s * (hW + 0.05), beltH * 0.80, 0.10);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  WHEELS — detailed with proper tyre profile + rim
  // ══════════════════════════════════════════════════════════════════════════
  const wbw = hW + 0.06 + (shape === 'muscle' || shape === 'hypercar' ? 0.12 : 0.0);
  [
    [-wbw, wR, wBase],    // FL
    [ wbw, wR, wBase],    // FR
    [-wbw, wR,-wBase],    // RL
    [ wbw, wR,-wBase],    // RR
  ].forEach(([wx,wy,wz], idx) => {
    const wg = new THREE.Group();
    wg.position.set(wx, wy, wz);

    // ── Tyre ──
    // Tyre sidewall (full width cylinder)
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(wR, wR, wW, 28), matTyre);
    tyre.rotation.z = Math.PI/2;
    wg.add(tyre);

    // Tyre profile rounded edge (thin torus-like rings at edges)
    for (const side of [-1,1]) {
      const edge = new THREE.Mesh(
        new THREE.TorusGeometry(wR - 0.018, 0.022, 6, 28), matTyre);
      edge.rotation.y = Math.PI/2;
      edge.position.set(side * wW * 0.5, 0, 0);
      wg.add(edge);
    }

    // ── Rim ──
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(wR*0.74, wR*0.74, wW*0.96, 28), matRim);
    rim.rotation.z = Math.PI/2;
    wg.add(rim);

    // Rim inner recess
    const rimInner = new THREE.Mesh(
      new THREE.CylinderGeometry(wR*0.58, wR*0.58, wW*0.70, 28), matRimDk);
    rimInner.rotation.z = Math.PI/2;
    wg.add(rimInner);

    // ── 5-spoke design ──
    // Each spoke: box tapered from hub to rim
    for (let s = 0; s < 5; s++) {
      const ang = (s / 5) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(wR * 0.58, wW * 0.80, 0.055);
      const spoke = new THREE.Mesh(spokeGeo, matRim);
      spoke.position.set(
        Math.sin(ang) * wR * 0.32,
        Math.cos(ang) * wR * 0.32,
        0
      );
      spoke.rotation.z = -ang;
      spoke.rotation.x = Math.PI/2;
      const sg = new THREE.Group();
      sg.rotation.x = Math.PI/2;
      sg.add(spoke);
      wg.add(sg);
    }

    // Centre cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(wR*0.14, wR*0.14, wW*1.01, 16), matRimDk);
    cap.rotation.z = Math.PI/2;
    wg.add(cap);

    // ── Brake calliper (red, peeking through) ──
    const calliper = new THREE.Mesh(
      new THREE.BoxGeometry(wR*0.32, wR*0.26, wW*0.60), matBrake);
    calliper.position.set(0, wR*0.50, 0);
    calliper.rotation.x = Math.PI/2;
    wg.add(calliper);

    // Brake disc (dark slotted)
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(wR*0.52, wR*0.52, wW*0.28, 20), matRimDk);
    disc.rotation.z = Math.PI/2;
    wg.add(disc);

    carMesh.add(wg);
    carWheels.push(wg);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  UNDERGLOW
  // ══════════════════════════════════════════════════════════════════════════
  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(wide*0.90, len*0.84), matGlow);
  glowPlane.rotation.x = -Math.PI/2;
  glowPlane.position.set(0, 0.025, 0);
  carMesh.add(glowPlane);

  const uLight = new THREE.PointLight(col, 5, 14);
  uLight.position.set(0, 0.10, 0);
  carMesh.add(uLight);

  carMesh.position.copy(carPhysics.pos);
  scene.add(carMesh);
}

// ─── CAMERA ───────────────────────────────────────────────────────────────────
const _camPos = new THREE.Vector3();
const _camTgt = new THREE.Vector3();
let cinematicAngle = 0;
let _camInitialized = false;

function updateCamera(dt) {
  if (!carMesh) return;
  const pos = carMesh.position;
  const heading = carPhysics.heading;
  const speed = Math.hypot(carPhysics.vel.x, carPhysics.vel.z);

  if (STATE.cameraMode === 0) {
    // Distance grows gently with speed
    const dist   = 9.5 + speed * 0.07;
    const height = 3.8 + speed * 0.03;

    // Slight heading lag so camera doesn't snap on sharp turns
    const lag = Math.min(speed / 25, 0.8) * 0.12;
    const effectiveHeading = heading + carPhysics.angularVel * lag;

    const desiredX = pos.x - Math.sin(effectiveHeading) * dist;
    const desiredY = pos.y + height;
    const desiredZ = pos.z - Math.cos(effectiveHeading) * dist;

    // Lerp speed scaled by speed — faster car = quicker catch-up
    const lerpT = Math.min(dt * (2.5 + speed * 0.05), 0.22);
    _camPos.x += (desiredX - _camPos.x) * lerpT;
    _camPos.y += (desiredY - _camPos.y) * lerpT;
    _camPos.z += (desiredZ - _camPos.z) * lerpT;
    camera.position.copy(_camPos);

    const lookAhead = 5 + speed * 0.08;
    const tgtX = pos.x + Math.sin(heading) * lookAhead;
    const tgtY = pos.y + 1.2;
    const tgtZ = pos.z + Math.cos(heading) * lookAhead;
    _camTgt.x += (tgtX - _camTgt.x) * Math.min(dt*8, 0.4);
    _camTgt.y += (tgtY - _camTgt.y) * Math.min(dt*8, 0.4);
    _camTgt.z += (tgtZ - _camTgt.z) * Math.min(dt*8, 0.4);
    camera.lookAt(_camTgt);

  } else if (STATE.cameraMode === 1) {
    camera.position.set(
      pos.x + Math.sin(heading)*2.0,
      pos.y + 1.0,
      pos.z + Math.cos(heading)*2.0
    );
    camera.lookAt(pos.x + Math.sin(heading)*30, pos.y+1.0, pos.z + Math.cos(heading)*30);
  } else {
    cinematicAngle += dt * 0.25;
    camera.position.set(pos.x + Math.sin(cinematicAngle)*18, pos.y+7, pos.z + Math.cos(cinematicAngle)*18);
    camera.lookAt(pos.x, pos.y+1, pos.z);
  }
}

// ─── PHYSICS ──────────────────────────────────────────────────────────────────
function updatePhysics(dt) {
  const car = CARS[STATE.selectedCar];

  const fw = keys['KeyW'] || keys['ArrowUp'];
  const bk = keys['KeyS'] || keys['ArrowDown'];
  const lt = keys['KeyA'] || keys['ArrowLeft'];
  const rt = keys['KeyD'] || keys['ArrowRight'];
  const hb = keys['Space'];

  const fwdX = Math.sin(carPhysics.heading);
  const fwdZ = Math.cos(carPhysics.heading);
  const speed = Math.hypot(carPhysics.vel.x, carPhysics.vel.z);
  const forwardSpeed = carPhysics.vel.x * fwdX + carPhysics.vel.z * fwdZ;

  // ── Acceleration / Braking ──
  if (fw) {
    const thrust = car.accel * Math.max(0, 1 - speed / (car.maxSpeed * 1.05));
    carPhysics.vel.x += fwdX * thrust * dt * 60;
    carPhysics.vel.z += fwdZ * thrust * dt * 60;
  }
  if (bk) {
    if (forwardSpeed > 1.0) {
      // Braking
      carPhysics.vel.x -= fwdX * car.brakeStr * 0.3 * dt * 60;
      carPhysics.vel.z -= fwdZ * car.brakeStr * 0.3 * dt * 60;
    } else {
      // Reversing
      const revThrust = car.accel * 0.45 * Math.max(0, 1 - speed / (car.maxSpeed * 0.4));
      carPhysics.vel.x -= fwdX * revThrust * dt * 60;
      carPhysics.vel.z -= fwdZ * revThrust * dt * 60;
    }
  }

  // Speed cap
  const spd2 = Math.hypot(carPhysics.vel.x, carPhysics.vel.z);
  if (spd2 > car.maxSpeed) {
    const s = car.maxSpeed / spd2;
    carPhysics.vel.x *= s;
    carPhysics.vel.z *= s;
  }

  // ── Steering ──
  // Turn rate tapers off at high speed (prevent spin)
  if (speed > 0.4) {
    const normalSpeed = Math.min(speed / car.maxSpeed, 1.0);
    const speedFactor = 1.0 - normalSpeed * 0.6;
    const turnRate = car.turnSpeed * speedFactor;

    const dir = forwardSpeed >= 0 ? 1 : -1;
    if (lt) carPhysics.angularVel += turnRate * dir * dt * 60;
    if (rt) carPhysics.angularVel -= turnRate * dir * dt * 60;
  }

  // Angular damping — stronger damping when no keys held
  const angDamp = (lt || rt) ? 0.84 : 0.70;
  carPhysics.angularVel *= Math.pow(angDamp, dt * 60);
  carPhysics.angularVel = Math.max(-3.5, Math.min(3.5, carPhysics.angularVel));
  carPhysics.heading += carPhysics.angularVel * dt;

  // ── Grip / slip ──
  const rightX = Math.cos(carPhysics.heading);
  const rightZ = -Math.sin(carPhysics.heading);
  const lateralSpeed = carPhysics.vel.x * rightX + carPhysics.vel.z * rightZ;

  let gripStrength;
  if (hb && speed > 3) {
    gripStrength = 0.8 + car.driftFactor * 6;
    carPhysics.angularVel *= 1 + car.driftFactor * 0.18 * dt * 60;
    carPhysics.vel.x *= Math.pow(0.993, dt * 60);
    carPhysics.vel.z *= Math.pow(0.993, dt * 60);
  } else {
    gripStrength = car.grip * 18;
  }

  const lateralBleed = Math.min(gripStrength * dt, 1.0);
  carPhysics.vel.x -= rightX * lateralSpeed * lateralBleed;
  carPhysics.vel.z -= rightZ * lateralSpeed * lateralBleed;

  // Air drag
  carPhysics.vel.x *= Math.pow(0.986, dt * 60);
  carPhysics.vel.z *= Math.pow(0.986, dt * 60);

  // Idle stop
  if (!fw && !bk && speed < 0.5) {
    carPhysics.vel.x *= Math.pow(0.65, dt * 60);
    carPhysics.vel.z *= Math.pow(0.65, dt * 60);
  }

  // ── Ground height (ramps + elevated highway) ──
  let targetY = 0;
  RAMPS.forEach(r => {
    const dx = carPhysics.pos.x - r.cx;
    const dz = carPhysics.pos.z - r.cz;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const maxDist = Math.max(r.rx, r.rz) * 1.5;
    if (dist < maxDist) targetY = Math.max(targetY, r.h * (1 - dist/maxDist) * 0.7);
  });

  if (carPhysics.pos.x > 340 && carPhysics.pos.x < 720 && Math.abs(carPhysics.pos.z) < 14) {
    const elev = carPhysics.pos.x > 390 ? 14 : ((carPhysics.pos.x - 340) / 50) * 14;
    targetY = Math.max(targetY, elev);
  }

  carPhysics.groundY = targetY;

  // Vertical
  if (carPhysics.pos.y > targetY + 0.05) {
    carPhysics.verticalVel -= 22 * dt;
    carPhysics.onGround = false;
    STATE.airTimer += dt;
  } else {
    if (!carPhysics.onGround && STATE.airTimer > 0.3) {
      STATE.airTime = Math.max(STATE.airTime, STATE.airTimer);
      checkChallenge('air', STATE.airTimer);
      if (STATE.airTimer > 1.5) showNotif(`🚀 AIR TIME: ${STATE.airTimer.toFixed(1)}s`);
    }
    if (!carPhysics.onGround) STATE.airTimer = 0;
    carPhysics.verticalVel = 0;
    carPhysics.pos.y = targetY;
    carPhysics.onGround = true;
  }
  carPhysics.pos.y += carPhysics.verticalVel * dt;
  carPhysics.pos.y = Math.max(targetY, carPhysics.pos.y);

  // ── Move + collision ──
  const newX = carPhysics.pos.x + carPhysics.vel.x * dt;
  const newZ = carPhysics.pos.z + carPhysics.vel.z * dt;
  const { resolvedX, resolvedZ } = resolveCollisions(carPhysics.pos.x, carPhysics.pos.z, newX, newZ);
  carPhysics.pos.x = resolvedX;
  carPhysics.pos.z = resolvedZ;

  carPhysics.pos.x = Math.max(-780, Math.min(780, carPhysics.pos.x));
  carPhysics.pos.z = Math.max(-780, Math.min(780, carPhysics.pos.z));

  // ── Mesh ──
  if (carMesh) {
    carMesh.position.copy(carPhysics.pos);
    carMesh.rotation.y = carPhysics.heading;
    carMesh.rotation.z = -carPhysics.angularVel * 0.08;
    carMesh.rotation.x = forwardSpeed > 0 ? -Math.min(speed/car.maxSpeed,1)*0.03 : Math.min(speed/car.maxSpeed,1)*0.03;

    const wheelSpin = (forwardSpeed / 0.36) * dt;
    carWheels.forEach((w, i) => {
      // Tyre cylinder has rotation.z=PI/2 so wheel axis is X — spin around X
      w.rotation.x += wheelSpin;
      // Steer front wheels
      if (i < 2) w.rotation.y = Math.max(-0.55, Math.min(0.55, carPhysics.angularVel * 0.48));
    });
  }

  const kmh = speed * 3.6;
  STATE.topSpeed = Math.max(STATE.topSpeed, kmh);
  checkChallenge('speed', kmh);
  STATE.distanceTravelled += speed * dt;
  checkChallenge('distance', STATE.distanceTravelled);

  return { kmh, lateralSpeed };
}

// ─── BUILDING COLLISION ───────────────────────────────────────────────────────
function resolveCollisions(oldX, oldZ, newX, newZ) {
  let rx = newX, rz = newZ;
  const R = 2.4;

  for (const b of buildingAABBs) {
    if (rx < b.minX-R || rx > b.maxX+R || rz < b.minZ-R || rz > b.maxZ+R) continue;

    const wasInsideX = oldX >= b.minX-R && oldX <= b.maxX+R;
    const wasInsideZ = oldZ >= b.minZ-R && oldZ <= b.maxZ+R;

    if (!wasInsideX) {
      rx = oldX;
      carPhysics.vel.x *= -0.25;
    } else if (!wasInsideZ) {
      rz = oldZ;
      carPhysics.vel.z *= -0.25;
    } else {
      // Push out on shortest axis
      const pushX = rx < (b.minX+b.maxX)*0.5 ? b.minX-R : b.maxX+R;
      const pushZ = rz < (b.minZ+b.maxZ)*0.5 ? b.minZ-R : b.maxZ+R;
      if (Math.abs(rx-pushX) < Math.abs(rz-pushZ)) { rx = pushX; carPhysics.vel.x *= -0.25; }
      else                                           { rz = pushZ; carPhysics.vel.z *= -0.25; }
    }
  }
  return { resolvedX: rx, resolvedZ: rz };
}

// ─── DRIFT SCORING ────────────────────────────────────────────────────────────
function updateDrift(dt, kmh, lateralSpeed) {
  const hb = keys['Space'];
  // Drift REQUIRES handbrake + speed + actual sideways slip
  const isDrifting = hb && Math.abs(lateralSpeed) > 3.5 && kmh > 20 && carPhysics.onGround;

  if (isDrifting) {
    STATE.driftActive = true;
    STATE.driftTimer += dt;
    // Multiplier only builds after 1s of sustained drifting
    if (STATE.driftTimer > 1.0) STATE.driftMult = Math.min(6, 1 + Math.floor(STATE.driftTimer - 1.0));
    // Points scale with slip but are intentionally modest
    const pts = Math.abs(lateralSpeed) * STATE.driftMult * dt * 4;
    STATE.driftScore += pts;
    STATE.totalDrift += pts;
    checkChallenge('drift', STATE.totalDrift);
    checkChallenge('multdrift', STATE.driftMult);
  } else {
    if (STATE.driftActive && STATE.driftScore > 100) {
      // Nerfed: divide by 40 instead of 10, and minimum score to cash out is higher
      const payout = Math.floor(STATE.driftScore / 40);
      if (payout > 0) {
        earnCoins(payout);
        showNotif(`DRIFT +${payout}¢`);
      }
    }
    STATE.driftActive = false;
    STATE.driftTimer = 0;
    STATE.driftMult = 1;
    STATE.driftScore = 0;
  }

  const driftUI = document.getElementById('hud-drift-ui');
  if (isDrifting) {
    driftUI.classList.add('active');
    document.getElementById('drift-score').textContent = Math.floor(STATE.driftScore);
    document.getElementById('drift-mult').textContent = `x${STATE.driftMult}`;
  } else {
    driftUI.classList.remove('active');
  }
}

// ─── ZONES ────────────────────────────────────────────────────────────────────
let lastZone = '';
function updateZones() {
  const px = carPhysics.pos.x, pz = carPhysics.pos.z;
  let zone = 'OPEN ROAD';
  ZONES.forEach(z => {
    if (Math.hypot(px-z.cx, pz-z.cz) < z.r) zone = z.name;
  });
  if (zone !== lastZone) {
    lastZone = zone;
    document.getElementById('hud-location').textContent = zone;
    const zoneIdx = ZONES.findIndex(z => z.name === zone);
    if (zoneIdx >= 0 && !STATE.zonesVisited.has(zoneIdx)) {
      STATE.zonesVisited.add(zoneIdx);
      showNotif(`📍 ${zone}`);
      checkChallenge('explore', STATE.zonesVisited.size);
    }
  }
}

// ─── MISSIONS ────────────────────────────────────────────────────────────────
function updateMission() {
  if (STATE.currentMission >= MISSIONS.length) {
    document.getElementById('mission-title').textContent = 'ALL DONE!';
    document.getElementById('mission-desc').textContent = 'You completed all missions';
    document.getElementById('mission-progress-fill').style.width = '100%';
    return;
  }
  const m = MISSIONS[STATE.currentMission];
  let progress = 0;
  switch (m.type) {
    case 'explore':  progress = STATE.zonesVisited.size; break;
    case 'speed':    progress = STATE.topSpeed; break;
    case 'drift':    progress = STATE.totalDrift; break;
    case 'distance': progress = STATE.distanceTravelled; break;
    case 'air':      progress = STATE.airTime; break;
  }
  STATE.missionProgress = Math.min(1, progress / m.target);
  document.getElementById('mission-title').textContent = m.title;
  document.getElementById('mission-desc').textContent = m.desc;
  document.getElementById('mission-progress-fill').style.width = (STATE.missionProgress*100) + '%';

  if (STATE.missionProgress >= 1) {
    earnCoins(m.reward);
    showChallengeFlash(`MISSION: ${m.title.toUpperCase()}`, `+${m.reward} ¢`);
    STATE.currentMission++;
  }
}

// ─── CHALLENGES ──────────────────────────────────────────────────────────────
function checkChallenge(type, value) {
  CHALLENGES.forEach(ch => {
    if (ch.type===type && !STATE.completedChallenges.includes(ch.id) && value >= ch.target) {
      STATE.completedChallenges.push(ch.id);
      earnCoins(ch.reward);
      showChallengeFlash(ch.name, `+${ch.reward} ¢`);
      saveState();
    }
  });
}

function earnCoins(amount) {
  STATE.coins += amount;
  document.getElementById('hud-coins').textContent = STATE.coins;
  saveState();
}

// ─── MINIMAP ─────────────────────────────────────────────────────────────────
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');
const MM_SIZE = 160, MM_WORLD = 1600;
const MM_SCALE = MM_SIZE / MM_WORLD, MM_OFF = MM_SIZE / 2;

// Resize minimap canvas
minimapCanvas.width = MM_SIZE;
minimapCanvas.height = MM_SIZE;
minimapCanvas.style.width  = MM_SIZE + 'px';
minimapCanvas.style.height = MM_SIZE + 'px';

function drawMinimap() {
  const ctx = minimapCtx;
  ctx.clearRect(0, 0, MM_SIZE, MM_SIZE);
  ctx.fillStyle = '#030810dd';
  ctx.fillRect(0, 0, MM_SIZE, MM_SIZE);

  // Roads
  ctx.strokeStyle = '#00f5ff55';
  ctx.lineWidth = 1.5;
  ROAD_SEGMENTS.forEach(([x1,z1,x2,z2]) => {
    ctx.beginPath();
    ctx.moveTo(x1*MM_SCALE+MM_OFF, z1*MM_SCALE+MM_OFF);
    ctx.lineTo(x2*MM_SCALE+MM_OFF, z2*MM_SCALE+MM_OFF);
    ctx.stroke();
  });

  // Zones
  ZONES.forEach((z, i) => {
    ctx.strokeStyle = STATE.zonesVisited.has(i) ? '#00ff8866' : '#ffffff18';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(z.cx*MM_SCALE+MM_OFF, z.cz*MM_SCALE+MM_OFF, z.r*MM_SCALE, 0, Math.PI*2);
    ctx.stroke();
  });

  // Buildings
  ctx.fillStyle = '#00f5ff22';
  BUILDINGS_DATA.forEach(([bx,bz,bw,bd]) => {
    ctx.fillRect(bx*MM_SCALE+MM_OFF-bw*MM_SCALE/2, bz*MM_SCALE+MM_OFF-bd*MM_SCALE/2, bw*MM_SCALE, bd*MM_SCALE);
  });

  // Car
  const cx = carPhysics.pos.x * MM_SCALE + MM_OFF;
  const cz = carPhysics.pos.z * MM_SCALE + MM_OFF;
  ctx.save();
  ctx.translate(cx, cz);
  ctx.rotate(-carPhysics.heading);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2, -3, 4, 6);
  ctx.fillStyle = '#00f5ff';
  ctx.fillRect(-1.5, -3, 3, 2);
  ctx.restore();

  ctx.strokeStyle = '#00f5ff44';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, MM_SIZE, MM_SIZE);
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function updateHUD(kmh, gear) {
  document.getElementById('speed-val').textContent = Math.round(kmh);
  document.getElementById('gear-val').textContent = gear;
}

function computeGear(kmh) {
  if (kmh < 20) return 1;
  if (kmh < 45) return 2;
  if (kmh < 75) return 3;
  if (kmh < 110) return 4;
  if (kmh < 155) return 5;
  return 6;
}

let notifTimeout = null;
function showNotif(text) {
  const el = document.getElementById('hud-notif');
  el.textContent = text;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'notifPop 2.5s forwards';
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => el.classList.add('hidden'), 2600);
}

function showChallengeFlash(label, score) {
  const el = document.getElementById('challenge-flash');
  document.getElementById('cf-label').textContent = label;
  document.getElementById('cf-score').textContent = score;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'cfAnim 3s forwards';
  setTimeout(() => el.classList.add('hidden'), 3100);
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────
function gameLoop() {
  if (!running) return;
  animId = requestAnimationFrame(gameLoop);

  const now = performance.now() / 1000;
  const dt = Math.min(now - prevTime, 0.05);
  prevTime = now;

  if (STATE.paused) { renderer.render(scene, camera); return; }

  const { kmh, lateralSpeed } = updatePhysics(dt);
  updateDrift(dt, kmh, lateralSpeed);
  updateZones();
  updateCamera(dt);
  updateMission();
  updateHUD(kmh, computeGear(kmh));
  updateDayNight(dt);
  drawMinimap();

  renderer.render(scene, camera);
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
function handleKeyDown(e) {
  if (e.code === 'KeyM'   && STATE.inGame) togglePause();
  if (e.code === 'KeyR'   && STATE.inGame && !STATE.paused) resetCar();
  if (e.code === 'KeyC'   && STATE.inGame && !STATE.paused) cycleCamera();
  if (e.code === 'Escape' && STATE.inGame) togglePause();
}

function resetCar() {
  carPhysics.pos.set(0, 0, 0);
  carPhysics.vel.set(0, 0, 0);
  carPhysics.heading = 0;
  carPhysics.angularVel = 0;
  carPhysics.verticalVel = 0;
  // Snap camera to behind car
  _camPos.set(0, 5.5, -11);
  _camTgt.set(0, 1.2, 6);
  showNotif('🔄 RESET');
}

function cycleCamera() {
  STATE.cameraMode = (STATE.cameraMode + 1) % 3;
  showNotif(`📷 ${['CHASE CAM','HOOD CAM','CINEMATIC'][STATE.cameraMode]}`);
}

function togglePause() {
  STATE.paused = !STATE.paused;
  document.getElementById('pause-menu').classList.toggle('hidden', !STATE.paused);
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────
function showScreen(id) {
  ['main-menu','garage-screen','challenges-screen','pause-menu'].forEach(s =>
    document.getElementById(s).classList.add('hidden'));
  if (id) document.getElementById(id).classList.remove('hidden');
}

function startGame() {
  try {
    if (!renderer) { initThree(); buildWorld(); }
    buildCar(CARS[STATE.selectedCar]);
  } catch(e) { console.error('startGame error:', e); return; }

  carPhysics.pos.set(0, 0, 0);
  carPhysics.vel.set(0, 0, 0);
  carPhysics.heading = 0;
  carPhysics.angularVel = 0;
  carPhysics.verticalVel = 0;

  // Init camera behind car
  _camPos.set(0, 5.5, -11);
  _camTgt.set(0, 1.2, 6);

  showScreen(null);
  document.getElementById('game-canvas').classList.remove('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('hud-coins').textContent = STATE.coins;

  if (animId) { cancelAnimationFrame(animId); animId = null; }
  running = true;
  STATE.inGame = true;
  STATE.paused = false;
  prevTime = performance.now() / 1000;
  gameLoop();

  setTimeout(() => showNotif('🏁 DRIVE!'), 500);
}

function returnToMenu() {
  running = false;
  STATE.inGame = false;
  STATE.paused = false;
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  document.getElementById('game-canvas').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('pause-menu').classList.add('hidden');
  showScreen('main-menu');
}

// ─── GARAGE UI ────────────────────────────────────────────────────────────────
function buildGarageUI() {
  const grid = document.getElementById('garage-grid');
  grid.innerHTML = '';
  document.getElementById('garage-coins').textContent = STATE.coins;
  CARS.forEach(car => {
    const owned = STATE.ownedCars.includes(car.id);
    const selected = STATE.selectedCar === car.id;
    const card = document.createElement('div');
    card.className = `car-card ${selected?'selected':''} ${!owned?'locked':''}`;
    const statColor = v => v>=80?'#00ff88':v>=55?'#ffe600':'#ff4444';
    card.innerHTML = `
      <div class="car-name">${car.name}</div>
      <div class="car-class">${car.class}</div>
      <div class="car-stats">
        ${Object.entries(car.stats).map(([k,v]) => `
          <div class="stat-row">
            <div class="stat-label">${k}</div>
            <div class="stat-bar"><div class="stat-fill" style="width:${v}%;background:${statColor(v)}"></div></div>
            <div style="font-size:0.6rem;color:#fff;min-width:24px">${v}</div>
          </div>`).join('')}
      </div>
      ${owned
        ? `<button class="car-equip-btn ${selected?'active':''}" data-id="${car.id}">${selected?'✓ EQUIPPED':'EQUIP'}</button>`
        : `<div class="car-price">${car.price} ¢ ${STATE.coins>=car.price?'— BUY':'— LOCKED'}</div>
           <button class="car-equip-btn" data-id="${car.id}" ${STATE.coins<car.price?'disabled style="opacity:0.4"':''}>BUY ${car.price}¢</button>`
      }`;
    card.querySelector('.car-equip-btn')?.addEventListener('click', () => carAction(car.id, owned));
    grid.appendChild(card);
  });
}

function carAction(id, owned) {
  const car = CARS[id];
  if (owned) {
    STATE.selectedCar = id; saveState(); buildGarageUI();
    if (STATE.inGame) { buildCar(CARS[STATE.selectedCar]); showNotif(`🚗 ${car.name}`); }
  } else if (STATE.coins >= car.price) {
    STATE.coins -= car.price;
    STATE.ownedCars.push(id);
    STATE.selectedCar = id;
    saveState(); buildGarageUI();
    showNotif(`🔓 ${car.name} UNLOCKED!`);
  }
}

// ─── CHALLENGES UI ────────────────────────────────────────────────────────────
function buildChallengesUI() {
  const list = document.getElementById('challenges-list');
  list.innerHTML = '';
  CHALLENGES.forEach(ch => {
    const done = STATE.completedChallenges.includes(ch.id);
    const item = document.createElement('div');
    item.className = 'challenge-item';
    item.innerHTML = `
      <div class="ch-icon">${ch.icon}</div>
      <div class="ch-info">
        <div class="ch-name">${ch.name}</div>
        <div class="ch-desc">${ch.desc}</div>
        <div class="ch-reward">Reward: ${ch.reward} ¢</div>
      </div>
      <div class="ch-status ${done?'done':'todo'}">${done?'✓ DONE':'ACTIVE'}</div>`;
    list.appendChild(item);
  });
}

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
function runLoadingScreen(cb) {
  const bar = document.getElementById('loading-bar');
  const label = document.getElementById('loading-label');
  const steps = [[10,'INITIALIZING ENGINE...'],[30,'LOADING WORLD...'],[55,'BUILDING CITY...'],[72,'CALIBRATING PHYSICS...'],[88,'WARMING UP NEONS...'],[100,'READY']];
  let i = 0;
  function next() {
    if (i >= steps.length) { setTimeout(() => { document.getElementById('loading-screen').classList.add('hidden'); try{cb();}catch(e){} }, 400); return; }
    const [pct,msg] = steps[i++];
    bar.style.width = pct + '%';
    label.textContent = msg;
    setTimeout(next, 300 + Math.random()*200);
  }
  next();
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  loadState();
  document.getElementById('btn-play').addEventListener('click', startGame);
  document.getElementById('btn-garage').addEventListener('click', () => { showScreen('garage-screen'); buildGarageUI(); });
  document.getElementById('btn-challenges').addEventListener('click', () => { showScreen('challenges-screen'); buildChallengesUI(); });
  document.getElementById('garage-back').addEventListener('click', () => showScreen('main-menu'));
  document.getElementById('challenges-back').addEventListener('click', () => showScreen('main-menu'));
  document.getElementById('cam-btn').addEventListener('click', cycleCamera);
  document.getElementById('pause-resume').addEventListener('click', togglePause);
  document.getElementById('pause-garage').addEventListener('click', () => { togglePause(); showScreen('garage-screen'); buildGarageUI(); STATE.inGame = true; });
  document.getElementById('pause-main').addEventListener('click', returnToMenu);
  runLoadingScreen(() => showScreen('main-menu'));
});