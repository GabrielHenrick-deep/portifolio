import * as THREE from 'three';

/*
 * F1 procedural (era ground effect), em metros. Frente do carro em +Z.
 * Carroceria feita por "loft" de seções super-elípticas interpoladas.
 */

const MAT = {
    body: new THREE.MeshPhysicalMaterial({
        color: 0x15171c,
        metalness: 0.55,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
    }),
    carbon: new THREE.MeshPhysicalMaterial({
        color: 0x0e0f12,
        metalness: 0.35,
        roughness: 0.5,
        clearcoat: 0.6,
        clearcoatRoughness: 0.3,
    }),
    accent: new THREE.MeshPhysicalMaterial({
        color: 0xffc400,
        metalness: 0.2,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
    }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.88, metalness: 0 }),
    rim: new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.28, metalness: 0.9 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.6 }),
    helmet: new THREE.MeshPhysicalMaterial({ color: 0xffc400, roughness: 0.25, clearcoat: 1 }),
    helmetGreen: new THREE.MeshStandardMaterial({ color: 0x1f9d55, roughness: 0.35 }),
    helmetBlue: new THREE.MeshStandardMaterial({ color: 0x1f5fbf, roughness: 0.35 }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, metalness: 0.9, roughness: 0.08, clearcoat: 1 }),
    rainLight: new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }),
};

// Reflexo do ambiente mais contido (estúdio escuro)
for (const m of Object.values(MAT)) {
    if ('envMapIntensity' in m) m.envMapIntensity = 0.55;
}

/* ------------------------------ Geometrias -------------------------------- */

function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// sections: [{ z, w, cy, h }] ordenadas de trás para frente
function loft(sections, { ring = 32, sub = 6, n = 4 } = {}) {
    const dense = [];
    for (let i = 0; i < sections.length - 1; i++) {
        const s0 = sections[Math.max(i - 1, 0)];
        const s1 = sections[i];
        const s2 = sections[i + 1];
        const s3 = sections[Math.min(i + 2, sections.length - 1)];
        for (let k = 0; k < sub; k++) {
            const t = k / sub;
            dense.push({
                z: catmull(s0.z, s1.z, s2.z, s3.z, t),
                w: Math.max(0.005, catmull(s0.w, s1.w, s2.w, s3.w, t)),
                cy: catmull(s0.cy, s1.cy, s2.cy, s3.cy, t),
                h: Math.max(0.005, catmull(s0.h, s1.h, s2.h, s3.h, t)),
            });
        }
    }
    dense.push(sections[sections.length - 1]);

    const e = 2 / n;
    const pos = [];
    const idx = [];
    const ringPoint = (s, k) => {
        const a = (k / ring) * Math.PI * 2;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        return [s.w * Math.sign(c) * Math.abs(c) ** e, s.cy + s.h * Math.sign(sn) * Math.abs(sn) ** e, s.z];
    };

    for (const s of dense) {
        for (let k = 0; k < ring; k++) pos.push(...ringPoint(s, k));
    }
    for (let i = 0; i < dense.length - 1; i++) {
        for (let k = 0; k < ring; k++) {
            const a = i * ring + k;
            const b = i * ring + ((k + 1) % ring);
            const c = (i + 1) * ring + k;
            const d = (i + 1) * ring + ((k + 1) % ring);
            idx.push(a, b, c, b, d, c);
        }
    }

    // Tampas (vértices próprios para não estragar as normais suaves)
    const cap = (s, front) => {
        const base = pos.length / 3;
        pos.push(0, s.cy, s.z);
        for (let k = 0; k < ring; k++) pos.push(...ringPoint(s, k));
        for (let k = 0; k < ring; k++) {
            const a = base + 1 + k;
            const b = base + 1 + ((k + 1) % ring);
            if (front) idx.push(base, a, b);
            else idx.push(base, b, a);
        }
    };
    cap(dense[0], false);
    cap(dense[dense.length - 1], true);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

function box(w, h, d, mat, x, y, z, rx = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    return mesh;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function rod(a, b, r, mat) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 8), mat);
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize());
    return mesh;
}

// Perfil em (Z, Y) extrudado na espessura X
function profile(points, thickness, mat) {
    const shape = new THREE.Shape();
    points.forEach(([z, y], i) => (i ? shape.lineTo(-z, y) : shape.moveTo(-z, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
    geo.translate(0, 0, -thickness / 2);
    geo.rotateY(Math.PI / 2);
    return new THREE.Mesh(geo, mat);
}

// Contorno em planta (X, Z) espelhado, extrudado na altura
function plan(halfPoints, thickness, mat, y) {
    const shape = new THREE.Shape();
    const full = [...halfPoints, ...halfPoints.slice().reverse().map(([x, z]) => [-x, z])];
    full.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    return mesh;
}

function shadowTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

/* -------------------------------- Partes ---------------------------------- */

function buildWheel(radius, width, side) {
    const g = new THREE.Group();

    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 48, 1), MAT.tyre);
    tyre.rotation.z = Math.PI / 2;
    g.add(tyre);

    // Banda de rodagem levemente arredondada nas bordas
    for (const s of [-1, 1]) {
        const edge = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.02, 0.02, 8, 48), MAT.tyre);
        edge.rotation.y = Math.PI / 2;
        edge.position.x = s * (width / 2 - 0.005);
        g.add(edge);
    }

    const outer = side * (width / 2 + 0.003);

    const rim = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.68, 40), MAT.rim);
    rim.rotation.y = side * Math.PI / 2;
    rim.position.x = outer;
    g.add(rim);

    const cover = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.2, 24), MAT.dark);
    cover.rotation.y = side * Math.PI / 2;
    cover.position.x = outer + side * 0.002;
    g.add(cover);

    // Faixa de composto no flanco (amarelo = médio)
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.84, 0.012, 6, 64), MAT.stripe);
    stripe.rotation.y = Math.PI / 2;
    stripe.position.x = outer + side * 0.001;
    g.add(stripe);

    return g;
}

function buildHelmet() {
    const g = new THREE.Group();
    const r = 0.13;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), MAT.helmet));

    // phi = PI/2 aponta para +Z (frente)
    const band = (mat, thetaStart, thetaLen, phiLen = Math.PI * 2, scale = 1.01) => {
        const phiStart = phiLen < Math.PI * 2 ? Math.PI / 2 - phiLen / 2 : 0;
        const m = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 32, 6, phiStart, phiLen, thetaStart, thetaLen), mat);
        g.add(m);
    };
    band(MAT.visor, 1.12, 0.42, 2.1, 1.02);
    band(MAT.helmetGreen, 1.6, 0.08);
    band(MAT.helmetBlue, 1.7, 0.05);
    return g;
}

/* --------------------------------- Carro ---------------------------------- */

export function createF1Car() {
    const car = new THREE.Group();

    // Grupos separados para a vista explodida
    const chassis = new THREE.Group();
    const floorGroup = new THREE.Group();
    const frontWing = new THREE.Group();
    const rearWing = new THREE.Group();
    const cockpit = new THREE.Group();
    car.add(chassis, floorGroup, frontWing, rearWing, cockpit);

    // Monocoque + sidepods + nariz
    chassis.add(new THREE.Mesh(loft([
        { z: -2.55, w: 0.14, cy: 0.44, h: 0.1 },
        { z: -2.1, w: 0.24, cy: 0.46, h: 0.15 },
        { z: -1.5, w: 0.42, cy: 0.44, h: 0.22 },
        { z: -0.7, w: 0.72, cy: 0.42, h: 0.27 },
        { z: 0.05, w: 0.8, cy: 0.42, h: 0.27 },
        { z: 0.35, w: 0.66, cy: 0.43, h: 0.25 },
        { z: 0.65, w: 0.36, cy: 0.43, h: 0.24 },
        { z: 1.25, w: 0.27, cy: 0.4, h: 0.2 },
        { z: 1.95, w: 0.17, cy: 0.33, h: 0.13 },
        { z: 2.6, w: 0.1, cy: 0.23, h: 0.075 },
        { z: 3.0, w: 0.06, cy: 0.18, h: 0.04 },
    ]), MAT.body));

    // Cobertura do motor / airbox
    chassis.add(new THREE.Mesh(loft([
        { z: -2.0, w: 0.05, cy: 0.55, h: 0.08 },
        { z: -1.1, w: 0.13, cy: 0.64, h: 0.2 },
        { z: -0.25, w: 0.16, cy: 0.74, h: 0.25 },
        { z: 0.25, w: 0.13, cy: 0.79, h: 0.2 },
    ], { ring: 28, sub: 8 }), MAT.body));

    const intake = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), MAT.dark);
    intake.scale.y = 1.3;
    intake.position.set(0, 0.88, 0.255);
    chassis.add(intake);

    // Barbatana
    chassis.add(profile([[-0.7, 0.96], [-2.3, 1.02], [-2.3, 0.6], [-1.0, 0.76]], 0.014, MAT.carbon));

    // Entradas dos sidepods
    for (const s of [-1, 1]) chassis.add(box(0.26, 0.13, 0.08, MAT.dark, s * 0.55, 0.5, 0.3));

    // Faixa de livery amarela ao longo do nariz
    chassis.add(new THREE.Mesh(loft([
        { z: 1.3, w: 0.05, cy: 0.598, h: 0.014 },
        { z: 1.95, w: 0.04, cy: 0.462, h: 0.014 },
        { z: 2.6, w: 0.03, cy: 0.305, h: 0.012 },
    ], { ring: 16 }), MAT.accent));

    // Luz de chuva traseira
    const rainLight = box(0.09, 0.05, 0.03, MAT.rainLight, 0, 0.42, -2.57);
    chassis.add(rainLight);

    // Assoalho + difusor
    floorGroup.add(plan([
        [0.3, 1.2], [0.72, 0.95], [0.82, 0.2], [0.8, -0.95], [0.62, -1.35], [0.52, -2.05], [0.3, -2.4],
    ], 0.035, MAT.carbon, 0.06));
    floorGroup.add(box(0.95, 0.02, 0.5, MAT.carbon, 0, 0.2, -2.38, 0.38));

    // Asa dianteira
    frontWing.add(box(1.92, 0.025, 0.34, MAT.carbon, 0, 0.1, 3.1, 0.05));
    frontWing.add(box(1.7, 0.018, 0.2, MAT.carbon, 0, 0.16, 2.94, -0.35));
    frontWing.add(box(1.5, 0.016, 0.14, MAT.accent, 0, 0.22, 2.84, -0.6));
    for (const s of [-1, 1]) frontWing.add(box(0.02, 0.24, 0.58, MAT.carbon, s * 0.97, 0.17, 3.0));

    // Asa traseira (flap superior = DRS)
    for (const s of [-1, 1]) rearWing.add(box(0.025, 0.52, 0.64, MAT.carbon, s * 0.52, 0.8, -2.5));
    rearWing.add(box(1.02, 0.03, 0.32, MAT.carbon, 0, 0.9, -2.56, 0.15));
    const drsFlap = box(1.02, 0.02, 0.2, MAT.accent, 0, 1.02, -2.42, -0.45);
    rearWing.add(drsFlap);
    rearWing.add(box(0.92, 0.02, 0.16, MAT.carbon, 0, 0.42, -2.62));
    for (const s of [-1, 1]) rearWing.add(box(0.025, 0.4, 0.08, MAT.carbon, s * 0.08, 0.72, -2.45));

    // Halo
    const haloCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.21, 0.6, 0.22),
        new THREE.Vector3(-0.24, 0.82, 0.42),
        new THREE.Vector3(-0.17, 0.87, 0.85),
        new THREE.Vector3(0, 0.87, 1.0),
        new THREE.Vector3(0.17, 0.87, 0.85),
        new THREE.Vector3(0.24, 0.82, 0.42),
        new THREE.Vector3(0.21, 0.6, 0.22),
    ]);
    cockpit.add(new THREE.Mesh(new THREE.TubeGeometry(haloCurve, 48, 0.022, 10), MAT.carbon));
    cockpit.add(rod(new THREE.Vector3(0, 0.87, 1.0), new THREE.Vector3(0, 0.58, 1.28), 0.022, MAT.carbon));

    // Piloto (capacete amarelo, faixas verde e azul)
    const helmet = buildHelmet();
    helmet.position.set(0, 0.7, 0.62);
    cockpit.add(helmet);

    // Retrovisores
    for (const s of [-1, 1]) {
        cockpit.add(rod(new THREE.Vector3(s * 0.3, 0.6, 0.9), new THREE.Vector3(s * 0.44, 0.68, 0.88), 0.01, MAT.carbon));
        cockpit.add(box(0.15, 0.06, 0.035, MAT.carbon, s * 0.47, 0.69, 0.88));
    }

    // Rodas e suspensão
    const wheels = [];
    const parts = [
        { obj: frontWing, offset: new THREE.Vector3(0, 0.2, 1.0) },
        { obj: rearWing, offset: new THREE.Vector3(0, 0.65, -0.9) },
        { obj: floorGroup, offset: new THREE.Vector3(0, -0.45, 0) },
        { obj: cockpit, offset: new THREE.Vector3(0, 0.75, 0.2) },
    ];
    const axles = [
        { z: 1.8, x: 0.8, r: 0.36, w: 0.36 },
        { z: -1.75, x: 0.8, r: 0.36, w: 0.42 },
    ];
    for (const a of axles) {
        for (const s of [-1, 1]) {
            const wheel = buildWheel(a.r, a.w, s);
            wheel.position.set(s * a.x, a.r, a.z);
            car.add(wheel);
            wheels.push(wheel);
            parts.push({ obj: wheel, offset: new THREE.Vector3(s * 0.75, 0.1, a.z > 0 ? 0.3 : -0.3) });

            const hub = s * (a.x - a.w / 2 - 0.02);
            const inner = a.z > 0 ? 0.14 : 0.24;
            const V = (x, y, z) => new THREE.Vector3(x, y, z);
            chassis.add(rod(V(s * inner, 0.46, a.z + 0.15), V(hub, 0.46, a.z), 0.012, MAT.carbon));
            chassis.add(rod(V(s * inner, 0.46, a.z - 0.2), V(hub, 0.46, a.z), 0.012, MAT.carbon));
            chassis.add(rod(V(s * inner, 0.26, a.z + 0.25), V(hub, 0.28, a.z), 0.012, MAT.carbon));
            chassis.add(rod(V(s * inner, 0.26, a.z - 0.15), V(hub, 0.28, a.z), 0.012, MAT.carbon));
            chassis.add(rod(V(s * inner, 0.4, a.z), V(hub, 0.34, a.z), 0.014, MAT.carbon));
        }
    }
    for (const part of parts) part.base = part.obj.position.clone();

    // Sombra de contato (fica fora das trocas de material)
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 6.6),
        new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    shadow.userData.keep = true;
    car.add(shadow);

    return { car, wheels, rainLight, drsFlap, parts };
}

/* ----------------------- Materiais de inspeção ---------------------------- */

const WIRE = {
    main: new THREE.MeshBasicMaterial({ color: 0xffc400, wireframe: true, transparent: true, opacity: 0.42, toneMapped: false }),
    accent: new THREE.MeshBasicMaterial({ color: 0xff6a1a, wireframe: true, transparent: true, opacity: 0.85, toneMapped: false }),
    dim: new THREE.MeshBasicMaterial({ color: 0x7a808a, wireframe: true, transparent: true, opacity: 0.35, toneMapped: false }),
};

// Heatmap dos pneus: azul (frio) → verde → amarelo → vermelho (quente)
const HEAT = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`
        varying vec3 vPos;
        void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */`
        uniform float uTime;
        varying vec3 vPos;
        vec3 heat(float t) {
            t = clamp(t, 0.0, 1.0);
            vec3 c1 = vec3(0.05, 0.25, 1.0);
            vec3 c2 = vec3(0.1, 0.85, 0.4);
            vec3 c3 = vec3(1.0, 0.8, 0.1);
            vec3 c4 = vec3(1.0, 0.12, 0.04);
            if (t < 0.33) return mix(c1, c2, t / 0.33);
            if (t < 0.66) return mix(c2, c3, (t - 0.33) / 0.33);
            return mix(c3, c4, (t - 0.66) / 0.34);
        }
        void main() {
            float r = clamp(length(vPos) / 0.38, 0.0, 1.0);
            float t = r * 0.75 + 0.18 * sin(atan(vPos.x, vPos.z) * 4.0 + uTime * 2.0);
            gl_FragColor = vec4(heat(t), 1.0);
            #include <colorspace_fragment>
        }
    `,
});
const BRAKE = new THREE.MeshBasicMaterial({ color: 0xff3a10, toneMapped: false });

/* --------------------------- Túnel de vento -------------------------------- */

function createWindTunnel() {
    const LANES = 72;
    const PER_LANE = 26;
    const count = LANES * PER_LANE;
    const seeds = new Float32Array(count * 3);
    let k = 0;
    for (let l = 0; l < LANES; l++) {
        const x = (Math.random() * 2 - 1) * 1.1;
        const y = 0.06 + Math.random() * 1.25;
        const phase = Math.random();
        for (let p = 0; p < PER_LANE; p++) {
            seeds[k++] = x;
            seeds[k++] = y;
            seeds[k++] = phase + p / PER_LANE;
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));

    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uSpeed: { value: 0.3 },
            uDrift: { value: 0 },
            uOpacity: { value: 0 },
            uSize: { value: 2.4 * Math.min(window.devicePixelRatio, 2) },
        },
        vertexShader: /* glsl */`
            attribute vec3 aSeed;
            uniform float uTime;
            uniform float uSpeed;
            uniform float uDrift;
            uniform float uSize;
            varying float vHeat;
            varying float vAlpha;

            float band(float z, float a, float b, float f) {
                return smoothstep(a - f, a, z) * (1.0 - smoothstep(b, b + f, z));
            }

            // Altura aproximada da superfície do carro ao longo do comprimento
            float surface(float z) {
                float h = 0.26 * band(z, 2.75, 3.3, 0.1);
                h = max(h, mix(0.62, 0.22, clamp((z - 1.3) / 1.7, 0.0, 1.0)) * band(z, -2.55, 3.0, 0.08));
                h = max(h, 0.9 * band(z, 0.2, 1.0, 0.25));
                h = max(h, mix(0.62, 1.0, clamp((z + 2.0) / 1.8, 0.0, 1.0)) * band(z, -2.0, 0.2, 0.15));
                h = max(h, 1.07 * band(z, -2.75, -2.25, 0.08));
                return h;
            }

            void main() {
                float f = fract(aSeed.z + uTime * uSpeed);
                float z = 3.9 - f * 7.8;
                float x = aSeed.x + uDrift * (3.9 - z) * 0.12;
                float mask = 1.0 - smoothstep(0.85, 1.05, abs(x));
                float target = surface(z) * mask + 0.06;
                float push = max(0.0, target - aSeed.y);
                float y = aSeed.y + push;

                vHeat = clamp(push * 2.2 + (uSpeed - 0.3) * 1.2, 0.0, 1.0);
                vAlpha = smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.88, 1.0, f));

                vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
                gl_PointSize = uSize * (11.0 / -mv.z) * (1.0 + vHeat * 0.6);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uOpacity;
            varying float vHeat;
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                if (d > 0.5) discard;
                vec3 cool = vec3(1.0, 0.77, 0.0);
                vec3 mid = vec3(1.0, 0.42, 0.1);
                vec3 hot = vec3(1.0, 0.12, 0.1);
                vec3 col = vHeat < 0.5 ? mix(cool, mid, vHeat * 2.0) : mix(mid, hot, (vHeat - 0.5) * 2.0);
                float a = (1.0 - d * 2.0) * vAlpha * uOpacity * (0.35 + vHeat * 0.65);
                gl_FragColor = vec4(col, a);
                #include <colorspace_fragment>
            }
        `,
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return points;
}

/* ----------------------- Cena do carro (overlay 3D) ----------------------- */

const VIEWS = {
    top: { yaw: -0.5, pitch: 0.95 },
    side: { yaw: -Math.PI / 2, pitch: 0.05 },
    front: { yaw: 0, pitch: 0.12 },
};

const ease = (t) => t * t * (3 - 2 * t);

export function createCarStage(renderer, RoomEnvironment) {
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-4, 6, 5);
    scene.add(key);

    const rimA = new THREE.PointLight(0xffc400, 40, 0, 2);
    const rimB = new THREE.PointLight(0xff6a1a, 40, 0, 2);
    scene.add(rimA, rimB);

    const root = new THREE.Group();
    const turntable = new THREE.Group();
    const { car, wheels, rainLight, drsFlap, parts } = createF1Car();
    const wind = createWindTunnel();
    turntable.add(car, wind);
    root.add(turntable);
    scene.add(root);

    // Guarda materiais originais para alternar wireframe / heatmap
    const meshes = [];
    car.traverse((o) => {
        if (!o.isMesh || o.userData.keep) return;
        o.userData.mat = o.material;
        if (o.material === MAT.tyre || o.material === MAT.rim) o.userData.heat = 'tyre';
        else if (o.material === MAT.dark && wheels.includes(o.parent)) o.userData.heat = 'brake';
        meshes.push(o);
    });

    const state = { wire: false, explode: false, drs: false, wind: false, heat: false, view: 'default' };
    const anim = { explode: 0, drs: 0, wind: 0 };
    const drag = { yaw: 0, pitch: 0, active: false };

    function applyMaterials() {
        for (const m of meshes) {
            const orig = m.userData.mat;
            if (state.wire) {
                m.material = orig === MAT.accent || orig === MAT.helmet ? WIRE.accent
                    : orig === MAT.tyre || orig === MAT.rim ? WIRE.dim : WIRE.main;
            } else if (state.heat && m.userData.heat) {
                m.material = m.userData.heat === 'brake' ? BRAKE : HEAT;
            } else {
                m.material = orig;
            }
        }
    }

    // Comandos vindos do HUD e do terminal
    function command(cmd, value) {
        const flag = (cur) => (value === undefined ? !cur : Boolean(value));
        switch (cmd) {
            case 'wire': state.wire = flag(state.wire); break;
            case 'explode': state.explode = flag(state.explode); break;
            case 'drs': state.drs = flag(state.drs); break;
            case 'wind': state.wind = flag(state.wind); break;
            case 'heat': state.heat = flag(state.heat); break;
            case 'view': state.view = VIEWS[value] ? value : 'default'; break;
            default: return null;
        }
        applyMaterials();
        return { ...state };
    }

    return {
        scene,
        camera,
        root,
        turntable,
        state,
        drag,
        command,
        // drive: { x, y, yaw, wobble, spin } calculado pelo scroll em scene.js
        update(t, mouse, drive, dt = 1 / 60, instant = false) {
            const step = (cur, target, rate) => (instant ? target : cur + (target - cur) * (1 - Math.pow(1 - rate, dt * 60)));

            const a = t * 0.35;
            rimA.position.set(Math.cos(a) * 5, 2.2, Math.sin(a) * 5 - 1);
            rimB.position.set(Math.cos(a + Math.PI) * 5, 1.6, Math.sin(a + Math.PI) * 5 - 1);
            root.position.x = drive.x;
            root.position.y = drive.y;

            // Orientação: pose do scroll ou vista escolhida, mais o arraste do usuário
            if (!drag.active) {
                drag.yaw = step(drag.yaw, 0, 0.06);
                drag.pitch = step(drag.pitch, 0, 0.06);
            }
            const view = VIEWS[state.view];
            const yaw = (view ? view.yaw : drive.yaw + Math.sin(t * 0.12) * 0.22 * drive.wobble + mouse.x * 0.2) + drag.yaw;
            const pitch = (view ? view.pitch : mouse.y * 0.04) + drag.pitch;
            turntable.rotation.y = step(turntable.rotation.y, yaw, 0.12);
            turntable.rotation.x = step(turntable.rotation.x, pitch, 0.12);

            for (const w of wheels) w.rotation.x = drive.spin;

            // Vista explodida
            anim.explode = step(anim.explode, state.explode ? 1 : 0, 0.07);
            const e = ease(anim.explode);
            for (const p of parts) p.obj.position.copy(p.base).addScaledVector(p.offset, e);

            // DRS: flap superior abre (fica mais plano e sobe)
            anim.drs = step(anim.drs, state.drs ? 1 : 0, 0.12);
            drsFlap.rotation.x = -0.45 + 0.42 * anim.drs;
            drsFlap.position.y = 1.02 + 0.035 * anim.drs;

            // Túnel de vento: o mouse muda velocidade e direção do fluxo
            anim.wind = step(anim.wind, state.wind ? 1 : 0, 0.08);
            wind.visible = anim.wind > 0.01;
            const wu = wind.material.uniforms;
            wu.uOpacity.value = anim.wind;
            wu.uTime.value = t;
            wu.uSpeed.value = step(wu.uSpeed.value, 0.28 + Math.min(Math.abs(mouse.x) + Math.abs(mouse.y), 1) * 0.35, 0.05);
            wu.uDrift.value = step(wu.uDrift.value, mouse.x * 0.6, 0.05);

            HEAT.uniforms.uTime.value = t;

            // Luz de chuva pisca como no carro real
            rainLight.visible = Math.floor(t * 4) % 2 === 0;
        },
    };
}
