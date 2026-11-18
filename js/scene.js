import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCarStage } from './car.js';

/*
 * Cena: Autódromo José Carlos Pace (Interlagos) à noite.
 * Traçado real (GeoJSON reamostrado), dois rastros de luz disputando posição:
 * SEN (amarelo capacete) e VER (laranja). Setores piscam roxo/verde/amarelo
 * como no timing da F1. Um F1 procedural fica em primeiro plano (js/car.js).
 */

const container = document.getElementById('three-container');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
    document.body.classList.add('no-webgl');
    throw err;
}

const BG = 0x0a0b0d;
const TRACK_LENGTH_M = 4309;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BG, 16, 42);

const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 200);

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.25 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.autoClear = false;
container.appendChild(renderer.domElement);

/* ------------------------------- Traçado ---------------------------------- */

// Interlagos, sentido anti-horário, índice 0 na reta dos boxes (x, z)
const TRACK = [
    -3.16, 5.13, -2.96, 5.89, -2.76, 6.66, -2.56, 7.42, -2.36, 8.19, -2.16, 8.96, -1.85, 9.68, -1.2, 10,
    -0.58, 9.53, 0.07, 9.18, 0.77, 9.55, 1.52, 9.77, 2.31, 9.74, 3.04, 9.46, 3.64, 8.94, 4.04, 8.27,
    4.29, 7.52, 4.52, 6.76, 4.73, 6, 4.92, 5.23, 5.12, 4.46, 5.31, 3.7, 5.5, 2.93, 5.7, 2.16,
    5.91, 1.4, 6.11, 0.63, 6.31, -0.13, 6.51, -0.9, 6.72, -1.66, 6.67, -2.42, 5.99, -2.76, 5.21, -2.92,
    4.43, -2.99, 3.67, -2.78, 3.05, -2.3, 2.55, -1.69, 2.08, -1.05, 1.61, -0.42, 1.15, 0.23, 0.7, 0.87,
    0.22, 1.5, -0.25, 2.14, -0.88, 2.59, -1.66, 2.6, -2.39, 2.31, -2.87, 1.71, -3.06, 0.94, -3.19, 0.16,
    -3.16, -0.62, -2.46, -0.75, -1.8, -0.33, -1.08, -0.53, -0.9, -1.27, -1.38, -1.89, -1.94, -2.45, -2.34, -3.12,
    -2.52, -3.89, -2.4, -4.63, -1.74, -4.36, -1.21, -3.77, -0.66, -3.2, 0.06, -2.91, 0.84, -2.96, 1.52, -3.36,
    1.98, -4, 2.4, -4.67, 2.81, -5.35, 3.23, -6.02, 3.01, -6.68, 2.27, -6.98, 1.53, -7.25, 0.75, -7.25,
    -0.03, -7.09, -0.78, -6.86, -1.5, -6.54, -2.19, -6.14, -2.76, -5.6, -3.13, -4.9, -3.35, -4.14, -3.53, -3.37,
    -3.67, -2.59, -3.86, -1.83, -4.04, -1.06, -4.21, -0.29, -4.21, 0.5, -4.09, 1.28, -3.9, 2.05, -3.72, 2.82,
    -3.53, 3.59, -3.35, 4.36,
];

const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
for (let i = 0; i < TRACK.length; i += 2) {
    box.minX = Math.min(box.minX, TRACK[i]);
    box.maxX = Math.max(box.maxX, TRACK[i]);
    box.minZ = Math.min(box.minZ, TRACK[i + 1]);
    box.maxZ = Math.max(box.maxZ, TRACK[i + 1]);
}
const cx = (box.minX + box.maxX) / 2;
const cz = (box.minZ + box.maxZ) / 2;

const trackPoints = [];
for (let i = 0; i < TRACK.length; i += 2) {
    trackPoints.push(new THREE.Vector3(TRACK[i] - cx, 0, TRACK[i + 1] - cz));
}
const curve = new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal');
const curveLength = curve.getLength();
const metersPerUnit = TRACK_LENGTH_M / curveLength;

const SECTORS = [0, 0.34, 0.68];

/* ---------------------------- Shaders comuns ------------------------------ */

const fogUniforms = {
    uFogNear: { value: 18 },
    uFogFar: { value: 44 },
};

const ribbonVertex = /* glsl */`
    attribute float aT;
    attribute float aSide;
    uniform float uFogNear;
    uniform float uFogFar;
    varying float vT;
    varying float vSide;
    varying float vFade;
    void main() {
        vT = aT;
        vSide = aSide;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFade = 1.0 - smoothstep(uFogNear, uFogFar, -mv.z);
        gl_Position = projectionMatrix * mv;
    }
`;

// Fita ao longo da curva: aT = progresso (0..1), aSide = -1..1 na largura
function buildRibbon(samples, width, y, lateral = 0) {
    const count = (samples + 1) * 2;
    const pos = new Float32Array(count * 3);
    const tAttr = new Float32Array(count);
    const side = new Float32Array(count);
    const index = [];
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3();

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const p = curve.getPointAt(t % 1);
        const tan = curve.getTangentAt(t % 1);
        normal.crossVectors(up, tan).normalize();

        for (let s = 0; s < 2; s++) {
            const dir = s === 0 ? -1 : 1;
            const k = i * 2 + s;
            const offset = lateral + (width / 2) * dir;
            pos[k * 3] = p.x + normal.x * offset;
            pos[k * 3 + 1] = y;
            pos[k * 3 + 2] = p.z + normal.z * offset;
            tAttr[k] = t;
            side[k] = dir;
        }
        if (i < samples) {
            const a = i * 2;
            index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aT', new THREE.BufferAttribute(tAttr, 1));
    geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    geo.setIndex(index);
    return geo;
}

/* -------------------------------- Pista ----------------------------------- */

const sectorUniforms = {
    uSec0: { value: new THREE.Color(0xffffff) },
    uSec1: { value: new THREE.Color(0xffffff) },
    uSec2: { value: new THREE.Color(0xffffff) },
    uGlow0: { value: 0 },
    uGlow1: { value: 0 },
    uGlow2: { value: 0 },
};

const trackMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
        ...fogUniforms,
        ...sectorUniforms,
        uAsphalt: { value: new THREE.Color(0x15171b) },
        uEdge: { value: new THREE.Color(0x8b9099) },
        uS1: { value: SECTORS[1] },
        uS2: { value: SECTORS[2] },
    },
    vertexShader: ribbonVertex,
    fragmentShader: /* glsl */`
        uniform vec3 uAsphalt;
        uniform vec3 uEdge;
        uniform vec3 uSec0;
        uniform vec3 uSec1;
        uniform vec3 uSec2;
        uniform float uGlow0;
        uniform float uGlow1;
        uniform float uGlow2;
        uniform float uS1;
        uniform float uS2;
        varying float vT;
        varying float vSide;
        varying float vFade;

        void main() {
            float s = abs(vSide);
            float edge = smoothstep(0.78, 0.9, s) * (1.0 - smoothstep(0.95, 1.0, s));

            float w1 = step(uS1, vT);
            float w2 = step(uS2, vT);
            vec3 secCol = mix(mix(uSec0, uSec1, w1), uSec2, w2);
            float glow = mix(mix(uGlow0, uGlow1, w1), uGlow2, w2);

            vec3 edgeCol = mix(uEdge * 0.45, secCol * 1.6, glow);
            vec3 col = mix(uAsphalt, edgeCol, edge);

            // Faixa quadriculada da largada/chegada
            float tt = fract(vT + 0.004);
            if (tt < 0.008) {
                float c = mod(floor((vSide + 1.0) * 3.0) + floor(tt / 0.00267), 2.0);
                col = mix(vec3(0.01), vec3(0.6), c);
            }

            gl_FragColor = vec4(col, 0.92 * vFade);
            #include <colorspace_fragment>
        }
    `,
});

const track = new THREE.Mesh(buildRibbon(900, 0.42, 0), trackMaterial);
track.renderOrder = 2;
scene.add(track);

// Halo suave em volta do traçado (dá volume sem iluminação real)
const haloMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { ...fogUniforms, uColor: { value: new THREE.Color(0x2a2f38) } },
    vertexShader: ribbonVertex,
    fragmentShader: /* glsl */`
        uniform vec3 uColor;
        varying float vSide;
        varying float vFade;
        void main() {
            float a = pow(1.0 - abs(vSide), 2.0) * 0.35 * vFade;
            gl_FragColor = vec4(uColor, a);
            #include <colorspace_fragment>
        }
    `,
});
const halo = new THREE.Mesh(buildRibbon(600, 1.6, -0.01), haloMaterial);
halo.renderOrder = 1;
scene.add(halo);

/* ------------------------------- Chão ------------------------------------- */

const grid = new THREE.GridHelper(90, 90, 0x22252b, 0x16181c);
grid.position.y = -0.02;
grid.material.transparent = true;
grid.material.opacity = 0.55;
scene.add(grid);

/* -------------------------------- Carros ---------------------------------- */

function makeGlowTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const glowTexture = makeGlowTexture();

function createCar({ code, color, lateral }) {
    const trailMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            ...fogUniforms,
            uHead: { value: 0 },
            uLen: { value: 0.0001 },
            uColor: { value: new THREE.Color(color) },
            uIntensity: { value: 1.2 },
        },
        vertexShader: ribbonVertex,
        fragmentShader: /* glsl */`
            uniform float uHead;
            uniform float uLen;
            uniform vec3 uColor;
            uniform float uIntensity;
            varying float vT;
            varying float vSide;
            varying float vFade;
            void main() {
                float d = fract(uHead - vT);
                if (d > uLen) discard;
                float f = 1.0 - d / uLen;
                float core = 1.0 - smoothstep(0.0, 1.0, abs(vSide));
                float a = pow(f, 1.8) * core * uIntensity * vFade;
                vec3 col = mix(uColor, vec3(1.0), pow(f, 10.0) * core * 0.5);
                gl_FragColor = vec4(col, a);
                #include <colorspace_fragment>
            }
        `,
    });

    const trail = new THREE.Mesh(buildRibbon(1200, 0.16, 0.02, lateral), trailMaterial);
    trail.renderOrder = 3;
    scene.add(trail);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    }));
    glow.scale.setScalar(1.1);

    const core = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.6),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    }));
    core.scale.setScalar(0.28);

    const head = new THREE.Group();
    head.add(glow, core);
    head.renderOrder = 4;
    glow.renderOrder = core.renderOrder = 4;
    scene.add(head);

    return {
        code,
        lateral,
        trail,
        head,
        progress: 0,
        pace: 1,
        phase: Math.random() * Math.PI * 2,
        sectorStart: null,
        bestSectors: [Infinity, Infinity, Infinity],
    };
}

const cars = [
    createCar({ code: 'SEN', color: 0xffc400, lateral: -0.07 }),
    createCar({ code: 'VER', color: 0xff6a1a, lateral: 0.07 }),
];

// Grid: pole aleatória
const pole = Math.random() < 0.5 ? 0 : 1;
cars[pole].progress = -0.004;
cars[1 - pole].progress = -0.011;
cars[0].pace = 1;
cars[1].pace = 0.9992;

/* ---------------------- Perfil de velocidade (física) --------------------- */

const SAMPLES = 1000;
const speed = new Float32Array(SAMPLES);
let simLapTime = 0;

(function buildSpeedProfile() {
    const ds = TRACK_LENGTH_M / SAMPLES;
    const tangents = [];
    for (let i = 0; i < SAMPLES; i++) tangents.push(curve.getTangentAt(i / SAMPLES));

    const curvature = new Float32Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) {
        const a = tangents[(i - 1 + SAMPLES) % SAMPLES];
        const b = tangents[(i + 1) % SAMPLES];
        curvature[i] = a.angleTo(b) / (2 * ds);
    }

    // Suaviza ruído da interpolação
    const smooth = new Float32Array(SAMPLES);
    const W = 6;
    for (let i = 0; i < SAMPLES; i++) {
        let sum = 0;
        for (let k = -W; k <= W; k++) sum += curvature[(i + k + SAMPLES) % SAMPLES];
        smooth[i] = sum / (W * 2 + 1);
    }

    // Valores aproximados de um F1: 4g lateral, frenagem forte, tração limitada
    const vMax = 92;
    const aLat = 38;
    const aBrake = 42;
    const aAccel = 11;

    for (let i = 0; i < SAMPLES; i++) {
        speed[i] = Math.min(vMax, Math.sqrt(aLat / Math.max(smooth[i], 1e-5)));
    }
    for (let pass = 0; pass < 2; pass++) {
        for (let i = SAMPLES - 1; i >= 0; i--) {
            const next = speed[(i + 1) % SAMPLES];
            speed[i] = Math.min(speed[i], Math.sqrt(next * next + 2 * aBrake * ds));
        }
        for (let i = 0; i < SAMPLES; i++) {
            const prev = speed[(i - 1 + SAMPLES) % SAMPLES];
            speed[i] = Math.min(speed[i], Math.sqrt(prev * prev + 2 * aAccel * ds));
        }
    }

    let modelLap = 0;
    for (let i = 0; i < SAMPLES; i++) modelLap += ds / speed[i];

    // Volta na tela: ~19 s
    const SIM_LAP = 19;
    const k = modelLap / SIM_LAP;
    for (let i = 0; i < SAMPLES; i++) speed[i] *= k;
    simLapTime = SIM_LAP;
})();

function speedAt(p) {
    return speed[Math.floor(p * SAMPLES) % SAMPLES];
}

const vTop = Math.max(...speed);

const SECTOR_COLORS = {
    purple: new THREE.Color(0xb05cff),
    green: new THREE.Color(0x2bd46a),
    yellow: new THREE.Color(0xffd23f),
};
const overallBestSectors = [Infinity, Infinity, Infinity];

function flashSector(index, status) {
    sectorUniforms[`uSec${index}`].value.copy(SECTOR_COLORS[status]);
    sectorUniforms[`uGlow${index}`].value = 1;
}

/* ------------------------------- Corrida ---------------------------------- */

let raceStarted = reducedMotion || window.__lightsOut === true;
let raceStartTime = 0;
let simTime = 0;

window.addEventListener('lightsout', () => {
    if (!raceStarted) {
        raceStarted = true;
        raceStartTime = simTime;
    }
});

// prev/now: voltas + progresso remapeado (cada setor = 1/3)
function onCrossing(car, prev, now) {
    const prevSector = Math.floor(prev * 3);
    const nowSector = Math.floor(now * 3);
    if (nowSector === prevSector) return;

    const finished = ((prevSector % 3) + 3) % 3;
    if (car.sectorStart !== null) {
        const t = simTime - car.sectorStart;
        let status = 'yellow';
        if (t < overallBestSectors[finished]) {
            overallBestSectors[finished] = t;
            status = 'purple';
        } else if (t < car.bestSectors[finished]) {
            status = 'green';
        }
        car.bestSectors[finished] = Math.min(car.bestSectors[finished], t);
        flashSector(finished, status);
    }
    car.sectorStart = simTime;

}

// Converte progresso da volta em posição; setores usam terços do progresso
function sectorProgress(p) {
    // remapeia as fronteiras SECTORS para terços exatos
    if (p < SECTORS[1]) return (p / SECTORS[1]) / 3;
    if (p < SECTORS[2]) return 1 / 3 + ((p - SECTORS[1]) / (SECTORS[2] - SECTORS[1])) / 3;
    return 2 / 3 + ((p - SECTORS[2]) / (1 - SECTORS[2])) / 3;
}

function stepRace(dt) {
    if (!raceStarted) return;

    const sinceStart = simTime - raceStartTime;
    const launch = Math.min(1, 0.12 + sinceStart / 3.2);
    const ordered = [...cars].sort((a, b) => b.progress - a.progress);

    for (const car of cars) {
        const p = ((car.progress % 1) + 1) % 1;
        let v = speedAt(p) * car.pace * launch;

        // Variação de ritmo ao longo da corrida (gera aproximações e ultrapassagens)
        v *= 1 + 0.014 * Math.sin(simTime * 0.11 + car.phase) + 0.008 * Math.sin(simTime * 0.29 + car.phase * 1.7);

        if (car === ordered[1]) {
            const gap = (ordered[0].progress - car.progress) * simLapTime;
            // DRS: perseguidor a menos de ~0.8s ganha em reta
            if (gap < 0.22 && speedAt(p) > vTop * 0.9) v *= 1.035;
            // Mantém a disputa viva: não deixa o gap crescer demais
            v *= 1 + Math.min(Math.max(gap - 0.35, 0), 1) * 0.02;
        }

        const prev = Math.floor(car.progress) + sectorProgress(p);
        car.progress += (v * dt) / TRACK_LENGTH_M;
        const np = ((car.progress % 1) + 1) % 1;
        onCrossing(car, prev, Math.floor(car.progress) + sectorProgress(np));
    }
}

/* ---------------------------- Sincroniza visual --------------------------- */

const tmp = new THREE.Vector3();
const tmpTan = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

function syncCars() {
    for (const car of cars) {
        const p = ((car.progress % 1) + 1) % 1;
        curve.getPointAt(p, tmp);
        curve.getTangentAt(p, tmpTan);
        const n = tmpTan.cross(up).multiplyScalar(-car.lateral);
        car.head.position.set(tmp.x + n.x, 0.08, tmp.z + n.z);

        const u = car.trail.material.uniforms;
        u.uHead.value = p;
        const target = raceStarted ? 0.075 : 0.0001;
        u.uLen.value += (target - u.uLen.value) * 0.03;
    }

    for (let i = 0; i < 3; i++) {
        sectorUniforms[`uGlow${i}`].value *= 0.985;
    }
}

/* ----------------------------- Interatividade ----------------------------- */

const mouse = { x: 0, y: 0 };
const pointer = { x: 0, y: 0 };
let scrollProgress = 0;

document.addEventListener('mousemove', (e) => {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

function updateScrollProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? window.scrollY / max : 0;
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

// Sem loop (movimento reduzido): re-renderiza só quando o scroll muda
let staticFramePending = false;
function requestStaticFrame() {
    if (!reducedMotion || staticFramePending) return;
    staticFramePending = true;
    requestAnimationFrame(() => {
        staticFramePending = false;
        updateCamera(0);
        updateStage(0, true);
        render();
    });
}
window.addEventListener('scroll', requestStaticFrame, { passive: true });

function updateCamera(t) {
    mouse.x += (pointer.x - mouse.x) * 0.05;
    mouse.y += (pointer.y - mouse.y) * 0.05;

    const aspect = camera.aspect;
    const fit = aspect < 0.8 ? 1.75 : aspect < 1.3 ? 1.3 : 1;
    const sp = scrollProgress;

    const angle = 0.55 + t * 0.02 + sp * 1.8 + mouse.x * 0.1;
    const radius = (18.5 - sp * 5) * fit;
    const height = (10.5 - sp * 4.5) * fit - mouse.y * 0.6;

    camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
    camera.lookAt(0, 1.6 - sp * 1.2, 0);
}

/* ------------------------------ Carro de F1 ------------------------------- */

const stage = createCarStage(renderer, RoomEnvironment);
const WHEEL_RADIUS = 0.36;
const drive = { x: 0, y: 0, yaw: -0.62, wobble: 1, spin: 0 };
let driveReady = false;

function layoutStage() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const cam = stage.camera;
    cam.aspect = w / h;
    if (w >= 960) {
        cam.position.set(0, 1.9, 11.5);
        cam.lookAt(0, 0.5, 0);
    } else {
        // Mobile: carro menor, na parte de baixo da tela
        cam.position.set(0, 2.6, cam.aspect < 0.8 ? 22 : 15);
        cam.lookAt(0, cam.aspect < 0.8 ? 2.6 : 1.8, 0);
    }
    cam.updateProjectionMatrix();
}
layoutStage();

// O carro atravessa a tela da direita para a esquerda ao longo da página
function updateStage(t, instant = false) {
    const cam = stage.camera;
    const halfW = cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;
    const wide = container.clientWidth >= 960;
    const hero = Math.min(window.scrollY / window.innerHeight, 1);

    const startX = halfW * (wide ? 0.44 : 0.3);
    const targetX = startX - 2 * startX * scrollProgress;
    const targetY = wide ? -hero * 0.8 : 0;

    const k = instant || !driveReady ? 1 : 0.08;
    drive.x += (targetX - drive.x) * k;
    drive.y += (targetY - drive.y) * k;
    driveReady = true;

    // De 3/4 de frente no hero para perfil (bico para a esquerda) ao rolar
    drive.yaw = -0.62 - hero * 0.55;
    drive.wobble = 1 - hero;
    // Rodas giram conforme a distância percorrida (rolamento sem deslizar)
    drive.spin = (startX - drive.x) / WHEEL_RADIUS;

    stage.update(t, mouse, drive);
}

function render() {
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(stage.scene, stage.camera);
}

/* ---------------------------------- Loop ---------------------------------- */

const clock = new THREE.Clock(false);
let rafId = null;

function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    simTime += dt;

    stepRace(dt);
    syncCars();
    updateCamera(simTime);
    updateStage(simTime);

    render();
}

function start() {
    if (rafId === null) {
        clock.start();
        frame();
    }
}

function stop() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        clock.stop();
    }
}

if (reducedMotion) {
    // Frame estático com os carros já na pista
    cars[0].progress = 0.18;
    cars[1].progress = 0.165;
    syncCars();
    for (const car of cars) car.trail.material.uniforms.uLen.value = 0.075;
    updateCamera(0);
    updateStage(0, true);
    render();
} else {
    start();
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}

let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        layoutStage();
        updateScrollProgress();
        if (reducedMotion) {
            updateCamera(0);
            updateStage(0, true);
            render();
        }
    }, 150);
});
