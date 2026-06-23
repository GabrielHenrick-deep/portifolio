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

function createStarfield() {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

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

        sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.25,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
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
        envMapIntensity: 1.0,
    });

    const ringMat = new THREE.MeshPhysicalMaterial({
        color: 0x2a2a3e,
        metalness: 0.6,
        roughness: 0.3,
    });

    // Main visor body
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
    const wireframe = new THREE.LineSegments(edges, lineMat);
    body.add(wireframe);
    group.add(body);

    // Front panel accent
    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.9, 0.05),
        accentMat
    );
    panel.position.z = 0.48;
    group.add(panel);

    // Lenses
    const lensPositions = [-0.45, 0.45];
    for (const x of lensPositions) {
        // Outer ring
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.05, 20, 40),
            ringMat
        );
        ring.position.set(x, 0.05, 0.5);
        group.add(ring);

        // Inner ring
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

        // Glass
        const glass = new THREE.Mesh(
            new THREE.CircleGeometry(0.2, 32),
            glassMat
        );
        glass.position.set(x, 0.05, 0.52);
        group.add(glass);

        // Lens glow
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

    // Sensor dots on front
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

    // Strap
    const strapMat = new THREE.MeshPhysicalMaterial({
        color: 0x0e0e1e,
        roughness: 0.9,
        metalness: 0.1,
    });

    // Left arm
    const leftArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.8),
        strapMat
    );
    leftArm.position.set(-1.24, 0.1, -0.2);
    leftArm.rotation.z = 0.1;
    group.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.8),
        strapMat
    );
    rightArm.position.set(1.24, 0.1, -0.2);
    rightArm.rotation.z = -0.1;
    group.add(rightArm);

    // Back strap
    const backStrap = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.04, 12, 24, Math.PI),
        strapMat
    );
    backStrap.position.set(0, 0.1, -1.2);
    backStrap.rotation.x = Math.PI / 2;
    group.add(backStrap);

    // Top strap
    const topStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.25, 0.05),
        strapMat
    );
    topStrap.position.set(0, 0.78, -0.6);
    topStrap.rotation.x = 0.3;
    group.add(topStrap);

    return group;
}

const stars = createStarfield();
scene.add(stars);

const headset = createVRHeadset();
headset.position.set(0, -0.3, -2);
scene.add(headset);

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

    mouse.x += (target.x - mouse.x) * 0.08;
    mouse.y += (target.y - mouse.y) * 0.08;

    headset.rotation.y = mouse.x * 0.5;
    headset.rotation.x = -mouse.y * 0.3;
    headset.position.y = -0.3 + Math.sin(Date.now() * 0.0003) * 0.06;

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
