/**
 * NUBIE Particle Sphere Orb — a "made of light" comparison piece for the
 * liquid aura orb. Thousands of glowing points arranged on a sphere that
 * breathe, drift, and react to the cursor so it reads as alive rather
 * than as a static render.
 */
(function () {
    let renderer, scene, camera, group, points, clock;
    let container, canvas;

    const PARTICLE_COUNT = 2200;
    // Kept smaller than the frustum so the breathing/pulse scale-up (see
    // tick()) never pushes particles past the canvas edge and gets clipped.
    const RADIUS = 1.1;

    // Same mood palette as the liquid aura orb, so both pieces move together.
    const PAL = {
        neutral:    { c1: 0x4466ff, c2: 0x9944ee, c3: 0xdd66aa, c4: 0xeeeeff },
        siren:      { c1: 0x004d5a, c2: 0x00acc1, c3: 0x80deea, c4: 0xe0f7fa },
        sweetChaos: { c1: 0xbf360c, c2: 0xffa000, c3: 0xffe082, c4: 0xfff8e1 },
        afterSour:  { c1: 0x880e4f, c2: 0xe91e63, c3: 0xba68c8, c4: 0xf3e5f5 }
    };

    let colC1, colC2, colC3, colC4;
    let tgtC1, tgtC2, tgtC3, tgtC4;

    let basePositions; // sphere-distributed anchor points, never mutated after init
    let seeds;          // per-particle phase/speed so the drift isn't uniform

    let mouseX = 0, mouseY = 0;   // normalized -1..1, relative to container
    let hoverActive = false;
    let targetRotX = 0, targetRotY = 0;
    let currentRotX = 0, currentRotY = 0;
    let pulse = 0; // decaying burst strength, triggered on click/tap
    let prevT = 0; // for delta time, derived from clock.getElapsedTime()
    let spinOffset = 0; // accumulated idle-spin angle, so speed can change smoothly

    // Brand-red "hold to charge" effect: chargeAmount ramps up while the
    // pointer is held down and eases back down after release.
    const BRAND_RED = 0xD9291C;
    let brandRed;
    let holding = false;
    let chargeAmount = 0;

    // Release flash: a red additive sprite that blooms and fades out.
    let burstSprite, burstMaterial;
    let burstActive = false;
    let burstElapsed = 0;
    let burstStartOpacity = 0;
    const BURST_DURATION = 0.55;

    function fibonacciSphere(count, radius) {
        const pts = [];
        const offset = 2 / count;
        const increment = Math.PI * (3 - Math.sqrt(5)); // golden angle
        for (let i = 0; i < count; i++) {
            const y = (i * offset) - 1 + (offset / 2);
            const r = Math.sqrt(Math.max(0, 1 - y * y));
            const phi = i * increment;
            pts.push([Math.cos(phi) * r * radius, y * radius, Math.sin(phi) * r * radius]);
        }
        return pts;
    }

    function makeSprite() {
        const size = 64;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        return new THREE.CanvasTexture(c);
    }

    function colorForBand(band, out) {
        if (band < 0.33) out.copy(colC4).lerp(colC3, band / 0.33);
        else if (band < 0.66) out.copy(colC3).lerp(colC2, (band - 0.33) / 0.33);
        else out.copy(colC2).lerp(colC1, (band - 0.66) / 0.34);
    }

    function init() {
        container = document.getElementById('particle-orb-container');
        canvas = document.getElementById('particle-orb-canvas');
        if (!container || !canvas || typeof THREE === 'undefined') return;

        clock = new THREE.Clock();
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 3.8;

        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        group = new THREE.Group();
        scene.add(group);

        const n = PAL.neutral;
        colC1 = new THREE.Color(n.c1); colC2 = new THREE.Color(n.c2);
        colC3 = new THREE.Color(n.c3); colC4 = new THREE.Color(n.c4);
        tgtC1 = colC1.clone(); tgtC2 = colC2.clone();
        tgtC3 = colC3.clone(); tgtC4 = colC4.clone();

        const anchors = fibonacciSphere(PARTICLE_COUNT, RADIUS);
        basePositions = new Float32Array(PARTICLE_COUNT * 3);
        seeds = new Float32Array(PARTICLE_COUNT * 3);

        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);
        const tmpColor = new THREE.Color();

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const [x, y, z] = anchors[i];
            basePositions[i * 3] = x;
            basePositions[i * 3 + 1] = y;
            basePositions[i * 3 + 2] = z;
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            seeds[i * 3] = Math.random() * Math.PI * 2;
            seeds[i * 3 + 1] = Math.random() * Math.PI * 2;
            seeds[i * 3 + 2] = 0.6 + Math.random() * 0.9;

            const band = (y / RADIUS + 1) / 2;
            colorForBand(band, tmpColor);
            colors[i * 3] = tmpColor.r;
            colors[i * 3 + 1] = tmpColor.g;
            colors[i * 3 + 2] = tmpColor.b;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.055,
            vertexColors: true,
            map: makeSprite(),
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
            opacity: 1
        });

        points = new THREE.Points(geo, mat);
        group.add(points);

        // Soft inner glow so the sphere reads as a volume, not a hollow shell.
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 0.5, 24, 24), coreMat));

        brandRed = new THREE.Color(BRAND_RED);

        // Release flash sprite — lives in the scene (not the rotating group)
        // so it blooms outward evenly regardless of orb rotation.
        const burstTex = makeSprite();
        burstMaterial = new THREE.SpriteMaterial({
            map: burstTex,
            color: BRAND_RED,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0
        });
        burstSprite = new THREE.Sprite(burstMaterial);
        burstSprite.scale.set(0.001, 0.001, 1);
        scene.add(burstSprite);

        bindInteraction();
        resize();
        window.addEventListener('resize', resize);
        tick();
    }

    function resize() {
        const rect = container.getBoundingClientRect();
        const w = rect.width || 180;
        const h = rect.height || 180;
        renderer.setSize(w, h, true);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    function bindInteraction() {
        container.addEventListener('pointermove', (e) => {
            const r = container.getBoundingClientRect();
            mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
            mouseY = -(((e.clientY - r.top) / r.height) * 2 - 1);
            targetRotY = mouseX * 0.55;
            targetRotX = mouseY * 0.4;
            hoverActive = true;
        });
        container.addEventListener('pointerleave', () => {
            hoverActive = false;
            targetRotX = 0;
            targetRotY = 0;
            if (holding) releaseCharge();
        });
        container.addEventListener('pointerdown', () => {
            holding = true;
            pulse = Math.max(pulse, 0.4);
        });
        window.addEventListener('pointerup', () => {
            if (holding) releaseCharge();
        });
    }

    function releaseCharge() {
        const strength = chargeAmount; // how "charged up" it got before release
        holding = false;
        pulse = Math.min(1.3, pulse + 0.3 + strength * 0.9);

        burstActive = true;
        burstElapsed = 0;
        burstStartOpacity = 0.55 + strength * 0.4;
        burstMaterial.opacity = burstStartOpacity;
        burstSprite.scale.set(0.2, 0.2, 1);
    }

    function tick() {
        requestAnimationFrame(tick);
        if (!points) return;

        const t = clock.getElapsedTime();
        const dt = Math.min(0.1, Math.max(0, t - prevT));
        prevT = t;

        // Ramp the "hold to charge" amount up while held, ease back down after release.
        chargeAmount = holding
            ? Math.min(1, chargeAmount + dt / 0.7)
            : Math.max(0, chargeAmount - dt / 0.45);

        // Smooth mood color transition, sampled fresh each frame per particle.
        colC1.lerp(tgtC1, 0.02); colC2.lerp(tgtC2, 0.02);
        colC3.lerp(tgtC3, 0.02); colC4.lerp(tgtC4, 0.02);

        const posAttr = points.geometry.attributes.position;
        const colAttr = points.geometry.attributes.color;
        const tmpColor = new THREE.Color();

        const mx = mouseX * 1.6;
        const my = mouseY * 1.6;

        // Charging makes the orb more agitated: bigger jitter, brighter dots.
        const wob = 0.045 + chargeAmount * 0.05;
        points.material.size = 0.055 + chargeAmount * 0.02;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const bx = basePositions[i * 3];
            const by = basePositions[i * 3 + 1];
            const bz = basePositions[i * 3 + 2];
            const s1 = seeds[i * 3];
            const s2 = seeds[i * 3 + 1];
            const sp = seeds[i * 3 + 2];

            // Gentle organic wobble so no two particles move in lockstep.
            let x = bx + Math.sin(t * 0.6 * sp + s1) * wob;
            let y = by + Math.cos(t * 0.5 * sp + s2) * wob;
            let z = bz + Math.sin(t * 0.55 * sp + s1 + s2) * wob;

            if (hoverActive) {
                const dx = x - mx, dy = y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const influence = Math.max(0, 1 - dist / 1.0);
                if (influence > 0) {
                    const len = Math.sqrt(x * x + y * y + z * z) || 1;
                    const push = influence * 0.14;
                    x += (x / len) * push;
                    y += (y / len) * push;
                    z += (z / len) * push;
                }
            }

            posAttr.setXYZ(i, x, y, z);

            const band = (by / RADIUS + 1) / 2;
            colorForBand(band, tmpColor);
            if (chargeAmount > 0) tmpColor.lerp(brandRed, chargeAmount * 0.85);
            colAttr.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;

        // Breathing scale + decaying click pulse (kept within the headroom
        // built into RADIUS/camera distance so growth never clips the frame).
        pulse *= 0.92;
        const breathe = 1 + Math.sin(t * 0.9) * 0.035;
        group.scale.setScalar(breathe + pulse * 0.12 + chargeAmount * 0.04);

        // Idle spin plus a subtle "look toward the cursor" lean — charging spins it up.
        currentRotX += (targetRotX - currentRotX) * 0.06;
        currentRotY += (targetRotY - currentRotY) * 0.06;
        spinOffset += dt * (0.15 + chargeAmount * 0.9);
        group.rotation.x = currentRotX + Math.sin(t * 0.2) * 0.05;
        group.rotation.y = currentRotY + spinOffset;
        group.rotation.z = Math.sin(t * 9) * 0.012 * chargeAmount;

        // Release flash: a red bloom that expands and fades out.
        if (burstActive) {
            burstElapsed += dt;
            const p = Math.min(1, burstElapsed / BURST_DURATION);
            const grow = 1 - Math.pow(1 - p, 2); // ease-out
            burstSprite.scale.set(0.2 + grow * 2.4, 0.2 + grow * 2.4, 1);
            burstMaterial.opacity = burstStartOpacity * Math.pow(1 - p, 1.5);
            if (p >= 1) {
                burstActive = false;
                burstMaterial.opacity = 0;
            }
        }

        renderer.render(scene, camera);
    }

    window.setParticleOrbMood = function (mood) {
        const p = PAL[mood];
        if (!p) return;
        tgtC1 = new THREE.Color(p.c1);
        tgtC2 = new THREE.Color(p.c2);
        tgtC3 = new THREE.Color(p.c3);
        tgtC4 = new THREE.Color(p.c4);
    };

    document.addEventListener('DOMContentLoaded', init);
})();
