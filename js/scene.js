import * as THREE from 'three';

const container = document.getElementById('three-container');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (err) {
    // Sem suporte a WebGL: ativa fallback visual e interrompe a cena
    document.body.classList.add('no-webgl');
    throw err;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.035);

const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 5;

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
container.appendChild(renderer.domElement);

const clock = new THREE.Clock();

/* ---------------------------------- Luzes ---------------------------------- */

const ambientLight = new THREE.AmbientLight(0xff2e97, 0.25);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffd6f0, 1.2);
keyLight.position.set(3, 4, 5);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x00f5ff, 30, 20);
rimLight.position.set(-4, 2, 2);
scene.add(rimLight);

const pulseLight = new THREE.PointLight(0xff2e97, 20, 15);
pulseLight.position.set(0, -0.3, 0);
scene.add(pulseLight);

/* --------------------------------- Estrelas -------------------------------- */

function createStarfield() {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const radius = 30 + Math.random() * 70;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        const tint = Math.random();
        if (tint < 0.3) {
            colors[i * 3] = 0.6 + Math.random() * 0.4;
            colors[i * 3 + 1] = 0.5 + Math.random() * 0.4;
            colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
        } else if (tint < 0.6) {
            colors[i * 3] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
            colors[i * 3 + 2] = 0.6 + Math.random() * 0.4;
        } else {
            const v = 0.7 + Math.random() * 0.3;
            colors[i * 3] = v;
            colors[i * 3 + 1] = v;
            colors[i * 3 + 2] = v;
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
}

/* ------------------------------ Galáxia espiral ----------------------------- */

function createGalaxy() {
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const inner = new THREE.Color(0x00f5ff);
    const outer = new THREE.Color(0x1a0533);

    for (let i = 0; i < count; i++) {
        const radius = Math.random() * 9;
        const branchAngle = ((i % 3) / 3) * Math.PI * 2;
        const spin = radius * 0.35;
        const randX = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * 0.5 * radius * 0.3;
        const randY = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * 0.25;
        const randZ = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * 0.5 * radius * 0.3;

        positions[i * 3] = Math.cos(branchAngle + spin) * radius + randX;
        positions[i * 3 + 1] = randY;
        positions[i * 3 + 2] = Math.sin(branchAngle + spin) * radius + randZ;

        const color = inner.clone().lerp(outer, radius / 9);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    points.position.set(0, 4.5, -14);
    points.rotation.x = -0.35;
    return points;
}

/* ------------------------------ Onda wireframe ------------------------------ */

function createWavePlane() {
    const geometry = new THREE.PlaneGeometry(40, 24, 80, 48);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff2e97,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -2.6;
    const base = geometry.attributes.position.array.slice();
    return { mesh, base };
}

/* --------------------------- Virtual Boy (retrô) ---------------------------- */

function createVirtualBoy() {
    const group = new THREE.Group();

    const blackMat = new THREE.MeshPhysicalMaterial({
        color: 0x14141c,
        metalness: 0.4,
        roughness: 0.45,
    });

    const redGlowMat = new THREE.MeshPhysicalMaterial({
        color: 0xff0040,
        emissive: 0xff0040,
        emissiveIntensity: 0.9,
        metalness: 0.2,
        roughness: 0.3,
        transparent: true,
        opacity: 0.85,
    });

    const visor = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.2, 0.9),
        blackMat
    );
    const visorEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(visor.geometry),
        new THREE.LineBasicMaterial({ color: 0xff0040, transparent: true, opacity: 0.35 })
    );
    visor.add(visorEdges);
    group.add(visor);

    // Janela frontal vermelha (a "tela" icônica do Virtual Boy)
    const windowPanel = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.75, 0.08),
        redGlowMat
    );
    windowPanel.position.z = 0.45;
    group.add(windowPanel);

    const scanlines = new THREE.Group();
    for (let i = 0; i < 5; i++) {
        const line = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 0.03, 0.01),
            new THREE.MeshBasicMaterial({ color: 0x0a0a0f, transparent: true, opacity: 0.6 })
        );
        line.position.set(0, -0.3 + i * 0.15, 0.5);
        scanlines.add(line);
    }
    group.add(scanlines);

    // Oculares (parte de trás, quem usa vê)
    for (const x of [-0.48, 0.48]) {
        const eyepiece = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.32, 0.35, 24),
            blackMat
        );
        eyepiece.rotation.x = Math.PI / 2;
        eyepiece.position.set(x, 0.1, -0.55);
        group.add(eyepiece);

        const lens = new THREE.Mesh(
            new THREE.CircleGeometry(0.2, 32),
            new THREE.MeshBasicMaterial({ color: 0xff0040, transparent: true, opacity: 0.55 })
        );
        lens.rotation.y = Math.PI;
        lens.position.set(x, 0.1, -0.74);
        group.add(lens);
    }

    // Suporte: coluna + pernas em V com base (como o tripé original)
    const clamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.25, 0.35),
        blackMat
    );
    clamp.position.set(0, -0.7, 0);
    group.add(clamp);

    const column = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.9, 0.22),
        blackMat
    );
    column.position.set(0, -1.25, 0);
    group.add(column);

    for (const dir of [-1, 1]) {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.9, 0.16),
            blackMat
        );
        leg.rotation.z = dir * 0.55;
        leg.position.set(dir * 0.32, -1.95, 0.25);
        group.add(leg);

        const backLeg = leg.clone();
        backLeg.position.set(dir * 0.32, -1.95, -0.25);
        backLeg.rotation.x = -dir * 0.15;
        group.add(backLeg);

        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.08, 0.16),
            blackMat
        );
        foot.position.set(dir * 0.55, -2.35, 0.25);
        group.add(foot);

        const backFoot = foot.clone();
        backFoot.position.z = -0.25;
        group.add(backFoot);
    }

    return group;
}

/* --------------------------- Formas & anéis orbitais ------------------------ */

function createFloatingShapes() {
    const group = new THREE.Group();
    const shapes = [];

    const positions = [
        { x: -4, y: 1.5, z: -2 },
        { x: 4, y: -0.5, z: -2.5 },
        { x: -3.5, y: -1.5, z: -3 },
        { x: 3.5, y: 1.8, z: -1.5 },
        { x: 0, y: 2.5, z: -4 },
    ];

    for (const pos of positions) {
        const isIcosa = Math.random() > 0.5;
        const geo = isIcosa
            ? new THREE.IcosahedronGeometry(0.35, 0)
            : new THREE.OctahedronGeometry(0.35, 0);

        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xff2e97,
            metalness: 0.3,
            roughness: 0.4,
            transparent: true,
            opacity: 0.5,
            emissive: 0xff2e97,
            emissiveIntensity: 0.05,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, pos.y, pos.z);

        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00f5ff,
            wireframe: true,
            transparent: true,
            opacity: 0.15,
        });
        const wireframe = new THREE.Mesh(geo.clone(), wireMat);
        wireframe.position.copy(mesh.position);
        wireframe.scale.set(1.05, 1.05, 1.05);

        const data = {
            mesh,
            wireframe,
            rotSpeed: { x: 0.3 + Math.random() * 0.5, y: 0.2 + Math.random() * 0.4 },
            floatAmp: 0.15 + Math.random() * 0.15,
            floatSpeed: 0.4 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2,
            baseY: pos.y,
        };

        group.add(mesh);
        group.add(wireframe);
        shapes.push(data);
    }

    return { group, shapes };
}

function createOrbitingRings() {
    const group = new THREE.Group();
    const rings = [];

    for (let i = 0; i < 3; i++) {
        const radius = 1.8 + i * 0.5;
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.015, 16, 60),
            new THREE.MeshBasicMaterial({
                color: 0xff2e97,
                transparent: true,
                opacity: 0.2 - i * 0.05,
            })
        );

        const angle = (i / 3) * Math.PI * 2;
        ring.rotation.x = Math.PI / 3 + angle * 0.2;
        ring.rotation.y = angle;

        rings.push({
            mesh: ring,
            rotSpeed: { x: 0.1 + i * 0.05, y: 0.15 + i * 0.04 },
        });

        group.add(ring);
    }

    return { group, rings };
}

function createAmbientParticles() {
    const count = 400;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
        speeds[i] = 0.1 + Math.random() * 0.3;
        offsets[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        size: 0.03,
        color: 0x00f5ff,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);

    return { points, speeds, offsets };
}

function createDistantFloatingShapes() {
    const group = new THREE.Group();

    const positions = [
        { x: -7, y: 4, z: -8 },
        { x: 6, y: -3, z: -7 },
        { x: -5, y: -4, z: -6 },
        { x: 8, y: 3, z: -9 },
        { x: -8, y: -2, z: -5 },
        { x: 5, y: -5, z: -10 },
    ];

    for (const pos of positions) {
        const geo = new THREE.IcosahedronGeometry(0.2, 0);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff2e97,
            wireframe: true,
            transparent: true,
            opacity: 0.08,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, pos.y, pos.z);
        group.add(mesh);
    }

    return group;
}

function createPulseRing() {
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.02, 16, 40),
        new THREE.MeshBasicMaterial({
            color: 0xff2e97,
            transparent: true,
            opacity: 0.6,
        })
    );
    ring.rotation.x = Math.PI / 2;
    return ring;
}

/* --------------------------- Sol synthwave (retrô) -------------------------- */

function createRetroSun() {
    // Sol com degradê e listras horizontais, clássico anos 80
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            varying vec2 vUv;
            uniform float uTime;

            void main() {
                float y = vUv.y;
                // Degradê rosa -> laranja do sol retrô
                vec3 topColor = vec3(1.0, 0.18, 0.55);
                vec3 bottomColor = vec3(1.0, 0.75, 0.2);
                vec3 color = mix(bottomColor, topColor, y);

                // Listras na metade inferior (que sobem lentamente)
                float stripesGap = 0.0;
                if (y < 0.5) {
                    float shift = fract(uTime * 0.05 + y * 14.0);
                    float thickness = mix(0.08, 0.3, y * 2.0);
                    if (shift > thickness) stripesGap = 1.0;
                }

                float alpha = 1.0 - stripesGap;
                gl_FragColor = vec4(color, alpha * 0.9);
            }
        `,
    });

    const sun = new THREE.Mesh(new THREE.CircleGeometry(3.5, 64), material);
    sun.position.set(-7, -4, -20);

    // Halo em volta do sol
    const halo = new THREE.Mesh(
        new THREE.CircleGeometry(4.4, 64),
        new THREE.MeshBasicMaterial({
            color: 0xff2e97,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    halo.position.z = -0.1;
    sun.add(halo);

    return sun;
}

/* ------------------------------ Montagem da cena ---------------------------- */

const stars = createStarfield();
scene.add(stars);

const galaxy = createGalaxy();
scene.add(galaxy);

const { mesh: waveMesh, base: waveBase } = createWavePlane();
scene.add(waveMesh);

const headset = createVirtualBoy();
headset.position.set(0, 0.6, -2);
scene.add(headset);

const { group: shapeGroup, shapes } = createFloatingShapes();
scene.add(shapeGroup);

const { group: ringGroup, rings } = createOrbitingRings();
ringGroup.position.copy(headset.position);
scene.add(ringGroup);

const { points: ambientParticles, speeds: ambSpeeds, offsets: ambOffsets } = createAmbientParticles();
scene.add(ambientParticles);

const distantShapes = createDistantFloatingShapes();
scene.add(distantShapes);

const pulseRing = createPulseRing();
scene.add(pulseRing);

const retroSun = createRetroSun();
scene.add(retroSun);

/* ------------------------------ Interatividade ------------------------------ */

const mouse = { x: 0, y: 0 };
const target = { x: 0, y: 0 };

const particlePos = ambientParticles.geometry.attributes.position.array;
const wavePos = waveMesh.geometry.attributes.position.array;

let scrollProgress = 0;

document.addEventListener('mousemove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (touch) {
        target.x = (touch.clientX / window.innerWidth - 0.5) * 2;
        target.y = (touch.clientY / window.innerHeight - 0.5) * 2;
    }
}, { passive: true });

function updateScrollProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? window.scrollY / max : 0;
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

/* --------------------------------- Loop ------------------------------------- */

let rafId = null;
let frameCount = 0;

function animate() {
    rafId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    mouse.x += (target.x - mouse.x) * 0.08;
    mouse.y += (target.y - mouse.y) * 0.08;

    // Headset reage ao mouse
    headset.rotation.y = mouse.x * 0.5;
    headset.rotation.x = -mouse.y * 0.3;
    headset.position.y = 0.6 + Math.sin(elapsed * 0.3) * 0.06;

    ringGroup.position.copy(headset.position);
    ringGroup.rotation.x = mouse.y * 0.2;
    ringGroup.rotation.z = mouse.x * 0.1;

    for (const r of rings) {
        r.mesh.rotation.x += r.rotSpeed.x * 0.01;
        r.mesh.rotation.y += r.rotSpeed.y * 0.01;
    }

    for (const s of shapes) {
        s.mesh.rotation.x += s.rotSpeed.x * 0.01;
        s.mesh.rotation.y += s.rotSpeed.y * 0.01;
        s.mesh.position.y = s.baseY + Math.sin(elapsed * s.floatSpeed + s.phase) * s.floatAmp;
        s.wireframe.rotation.copy(s.mesh.rotation);
        s.wireframe.position.y = s.mesh.position.y;
    }

    // Partículas ambiente sobem e reaparecem
    for (let i = 0; i < particlePos.length / 3; i++) {
        particlePos[i * 3 + 1] += ambSpeeds[i] * 0.005;
        particlePos[i * 3] += Math.sin(elapsed * 0.3 + ambOffsets[i]) * 0.001;
        if (particlePos[i * 3 + 1] > 8) {
            particlePos[i * 3 + 1] = -8;
            particlePos[i * 3] = (Math.random() - 0.5) * 20;
            particlePos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
        }
    }
    ambientParticles.geometry.attributes.position.needsUpdate = true;

    // Onda senoidal no plano (a cada 2 frames, para economia)
    frameCount++;
    if (frameCount % 2 === 0) {
        for (let i = 0; i < wavePos.length / 3; i++) {
            const x = waveBase[i * 3];
            const y = waveBase[i * 3 + 1];
            wavePos[i * 3 + 2] =
                Math.sin(x * 0.5 + elapsed * 0.8) * 0.35 +
                Math.sin(y * 0.4 + elapsed * 0.6) * 0.25;
        }
        waveMesh.geometry.attributes.position.needsUpdate = true;
    }

    // Sol retrô: listras animadas
    retroSun.material.uniforms.uTime.value = elapsed;

    // Galáxia girando lentamente
    galaxy.rotation.y += 0.0008;

    // Luz de pulso acompanha o headset
    pulseLight.position.y = headset.position.y;
    pulseLight.intensity = 15 + Math.sin(elapsed * 2) * 8;
    rimLight.intensity = 25 + Math.sin(elapsed * 1.3) * 10;

    const pulseScale = 1 + Math.sin(elapsed * 0.8) * 2;
    pulseRing.scale.set(pulseScale, pulseScale, 1);
    pulseRing.material.opacity = 0.6 - Math.abs(Math.sin(elapsed * 0.8)) * 0.4;
    pulseRing.position.set(0, headset.position.y, -1);

    stars.rotation.y += 0.00015;
    stars.rotation.x += 0.00003;
    distantShapes.rotation.y += 0.0003;

    // Parallax de scroll: câmera desce e a cena ganha profundidade
    camera.position.y = -scrollProgress * 2.5;
    camera.position.x = mouse.x * 0.4;
    camera.lookAt(0, camera.position.y * 0.8, -2);
    camera.rotation.z += mouse.x * -0.02;

    renderer.render(scene, camera);
}

function startLoop() {
    if (rafId === null) {
        clock.start();
        animate();
    }
}

function stopLoop() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        clock.stop();
    }
}

if (reducedMotion) {
    // Movimento reduzido: renderiza um único frame estático
    renderer.render(scene, camera);
} else {
    startLoop();

    // Pausa a renderização quando a aba está oculta (economia de bateria/GPU)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopLoop();
        } else {
            startLoop();
        }
    });
}

// Debounce no resize
let resizeTimer = null;
function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        if (reducedMotion) {
            renderer.render(scene, camera);
        }
    }, 150);
}

window.addEventListener('resize', handleResize);
