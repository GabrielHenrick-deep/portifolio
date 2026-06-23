import * as THREE from 'three';

const container = document.getElementById('three-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
container.appendChild(renderer.domElement);

const clock = new THREE.Clock();

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

function createVRHeadset() {
    const group = new THREE.Group();

    const darkMat = new THREE.MeshPhysicalMaterial({
        color: 0x16162a,
        metalness: 0.3,
        roughness: 0.5,
    });

    const accentMat = new THREE.MeshPhysicalMaterial({
        color: 0x6c5ce7,
        metalness: 0.4,
        roughness: 0.2,
        emissive: 0x6c5ce7,
        emissiveIntensity: 0.08,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a3e,
        metalness: 0.8,
        roughness: 0.05,
        transparent: true,
        opacity: 0.7,
    });

    const ringMat = new THREE.MeshPhysicalMaterial({
        color: 0x2a2a3e,
        metalness: 0.6,
        roughness: 0.3,
    });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.3, 0.9),
        darkMat
    );

    const edges = new THREE.EdgesGeometry(body.geometry);
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x6c5ce7,
        transparent: true,
        opacity: 0.15,
    });
    body.add(new THREE.LineSegments(edges, lineMat));
    group.add(body);

    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.9, 0.05),
        accentMat
    );
    panel.position.z = 0.48;
    group.add(panel);

    const lensPositions = [-0.45, 0.45];
    for (const x of lensPositions) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.05, 20, 40),
            ringMat
        );
        ring.position.set(x, 0.05, 0.5);
        group.add(ring);

        const innerRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.22, 0.03, 20, 40),
            new THREE.MeshPhysicalMaterial({
                color: 0x6c5ce7,
                metalness: 0.5,
                roughness: 0.2,
                emissive: 0x6c5ce7,
                emissiveIntensity: 0.15,
                transparent: true,
                opacity: 0.5,
            })
        );
        innerRing.position.set(x, 0.05, 0.51);
        group.add(innerRing);

        const glass = new THREE.Mesh(
            new THREE.CircleGeometry(0.2, 32),
            glassMat
        );
        glass.position.set(x, 0.05, 0.52);
        group.add(glass);

        const glow = new THREE.Mesh(
            new THREE.CircleGeometry(0.12, 32),
            new THREE.MeshBasicMaterial({
                color: 0x6c5ce7,
                transparent: true,
                opacity: 0.08,
            })
        );
        glow.position.set(x, 0.05, 0.53);
        group.add(glow);
    }

    const dotMat = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a2e,
        metalness: 0.8,
        roughness: 0.2,
    });
    for (let i = 0; i < 3; i++) {
        const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.025, 8, 8),
            dotMat
        );
        dot.position.set(-0.7 + i * 0.7, -0.35, 0.5);
        group.add(dot);
    }

    const strapMat = new THREE.MeshPhysicalMaterial({
        color: 0x0e0e1e,
        roughness: 0.9,
        metalness: 0.1,
    });

    const leftArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.8),
        strapMat
    );
    leftArm.position.set(-1.24, 0.1, -0.2);
    leftArm.rotation.z = 0.1;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.8),
        strapMat
    );
    rightArm.position.set(1.24, 0.1, -0.2);
    rightArm.rotation.z = -0.1;
    group.add(rightArm);

    const backStrap = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.04, 12, 24, Math.PI),
        strapMat
    );
    backStrap.position.set(0, 0.1, -1.2);
    backStrap.rotation.x = Math.PI / 2;
    group.add(backStrap);

    const topStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.25, 0.05),
        strapMat
    );
    topStrap.position.set(0, 0.78, -0.6);
    topStrap.rotation.x = 0.3;
    group.add(topStrap);

    return group;
}

function createVRGrid() {
    const gridHelper = new THREE.GridHelper(18, 24, 0x6c5ce7, 0x2a2a3a);
    gridHelper.position.y = -2;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.25;
    return gridHelper;
}

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
            color: 0x6c5ce7,
            metalness: 0.3,
            roughness: 0.4,
            transparent: true,
            opacity: 0.5,
            wireframe: false,
            emissive: 0x6c5ce7,
            emissiveIntensity: 0.05,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, pos.y, pos.z);

        const wireMat = new THREE.MeshBasicMaterial({
            color: 0xa29bfe,
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
                color: 0x6c5ce7,
                transparent: true,
                opacity: 0.2 - i * 0.05,
            })
        );

        const angle = (i / 3) * Math.PI * 2;
        ring.rotation.x = Math.PI / 3 + angle * 0.2;
        ring.rotation.y = angle;

        const data = {
            mesh: ring,
            rotSpeed: { x: 0.1 + i * 0.05, y: 0.15 + i * 0.04 },
            angle,
        };

        group.add(ring);
        rings.push(data);
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
        color: 0xa29bfe,
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
            color: 0x6c5ce7,
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
            color: 0x6c5ce7,
            transparent: true,
            opacity: 0.6,
        })
    );
    ring.position.set(0, -0.3, -1);
    ring.rotation.x = Math.PI / 2;
    return ring;
}

const stars = createStarfield();
scene.add(stars);

const headset = createVRHeadset();
headset.position.set(0, -0.3, -2);
scene.add(headset);

const grid = createVRGrid();
scene.add(grid);

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

const mouse = { x: 0, y: 0 };
const target = { x: 0, y: 0 };

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

function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    mouse.x += (target.x - mouse.x) * 0.08;
    mouse.y += (target.y - mouse.y) * 0.08;

    headset.rotation.y = mouse.x * 0.5;
    headset.rotation.x = -mouse.y * 0.3;
    headset.position.y = -0.3 + Math.sin(elapsed * 0.3) * 0.06;

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

    const pos = ambientParticles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] += ambSpeeds[i] * 0.005;
        pos[i * 3] += Math.sin(elapsed * 0.3 + ambOffsets[i]) * 0.001;
        if (pos[i * 3 + 1] > 8) {
            pos[i * 3 + 1] = -8;
            pos[i * 3] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
        }
    }
    ambientParticles.geometry.attributes.position.needsUpdate = true;

    distantShapes.rotation.y += 0.0003;

    const pulseScale = 1 + Math.sin(elapsed * 0.8) * 2;
    pulseRing.scale.set(pulseScale, pulseScale, 1);
    pulseRing.material.opacity = 0.6 - Math.abs(Math.sin(elapsed * 0.8)) * 0.4;
    pulseRing.position.y = headset.position.y;

    stars.rotation.y += 0.00015;
    stars.rotation.x += 0.00003;

    renderer.render(scene, camera);
}

animate();

function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

window.addEventListener('resize', handleResize);
