// Three.js Molecular Visualizer - Legacy Compatibility Mode
// This script assumes THREE is already loaded on the window object via script tag.

class MolecularVisualizer {
    constructor() {
        this.container = document.getElementById('particle-visual-container');
        this.canvas = document.getElementById('molecular-canvas');
        if (!this.container || !this.canvas || typeof THREE === 'undefined') return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.offsetWidth / this.container.offsetHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Ultra-HD Molecular Registry: 4800 spheres
        this.particleCount = 4800;
        this.positions = new Float32Array(this.particleCount * 3);
        this.startPositions = new Float32Array(this.particleCount * 3);
        this.targetPositions = new Float32Array(this.particleCount * 3);
        this.colors = new Float32Array(this.particleCount * 3);
        this.startColors = new Float32Array(this.particleCount * 3);
        this.targetColors = new Float32Array(this.particleCount * 3);

        this.initParticles();
        this.camera.position.z = 12;

        // User-Provided Lead-and-Follow Kinetic Registry
        this.delays = new Float32Array(this.particleCount);
        for (let i = 0; i < this.particleCount; i++) {
            if (i < 960) { // 20% Vanguards (scaled for 4800)
                this.delays[i] = Math.random() * 0.1;
            } else { // 80% Followers (Ultra-Tight Gap)
                this.delays[i] = 0.12 + Math.random() * 0.35;
            }
        }
        this.morphStartTime = 0;
        this.morphDuration = 1800; // Accelerated responsive transformation
        this.isMorphing = false;

        this.shapes = {
            mist: this.createTreeShape(),
            hedione: this.createCubicShape(),
            natural_bloom: this.createNaturalShape(),
            ambriola: this.createTreeShape(),
            bergamot: this.createBergamotShape(),
            isoe: this.createIsoEShape(),
            galbanum: this.createGalbanumShape(),
            jasmine: this.createJasmineShape()
        };

        this.currentShape = 'mist';
        this.setTargetPositions(this.shapes.mist);

        this.animate();
        this.initEvents();
    }

    createCircleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    initParticles() {
        const geometry = new THREE.BufferGeometry();
        
        for (let i = 0; i < this.particleCount; i++) {
            this.positions[i * 3] = (Math.random() - 0.5) * 20;
            this.positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
            this.positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
            
            this.targetPositions[i * 3] = this.positions[i * 3];
            this.targetPositions[i * 3 + 1] = this.positions[i * 3 + 1];
            this.targetPositions[i * 3 + 2] = this.positions[i * 3 + 2];

            this.colors[i * 3] = 0.85; // Initial Red
            this.colors[i * 3 + 1] = 0.16;
            this.colors[i * 3 + 2] = 0.11;
            
            this.targetColors[i * 3] = 0.85;
            this.targetColors[i * 3 + 1] = 0.16;
            this.targetColors[i * 3 + 2] = 0.11;

            // Initialize baseline start buffers
            for (let j = 0; j < 3; j++) {
                const idx = i * 3 + j;
                this.startPositions[idx] = this.positions[idx];
                this.startColors[idx] = this.colors[idx];
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.09, // Hyper-fine ultra-HD scale
            transparent: true,
            opacity: 0.75,
            vertexColors: true, 
            blending: THREE.AdditiveBlending,
            depthTest: false,
            map: this.createCircleTexture(),
            alphaTest: 0.01
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createTreeShape() {
        const points = [];
        const foliageCount = 4000;
        const trunkCount = 800;
        
        // 5-Lobe Symmetrical Canopy Registry (Compressed HD)
        const phi = Math.PI * (3 - Math.sqrt(5));
        const lobes = [
            { x: 0, y: 1.8, r: 1.8 },      // Central Top (Compressed)
            { x: -1.6, y: 1.0, r: 1.5 },   // Upper Left
            { x: 1.6, y: 1.0, r: 1.5 },    // Upper Right
            { x: -2.0, y: -0.5, r: 1.8 },  // Lower Left
            { x: 2.0, y: -0.5, r: 1.8 }   // Lower Right
        ];

        for (let i = 0; i < foliageCount; i++) {
            const lobe = lobes[i % lobes.length];
            const pIdx = Math.floor(i / lobes.length);
            const ptsPerLobe = foliageCount / lobes.length;
            
            const yOff = 1 - (pIdx / (ptsPerLobe - 1)) * 2;
            const rRadius = Math.sqrt(1 - yOff * yOff);
            const theta = phi * pIdx;
            
            points.push({
                x: lobe.x + rRadius * Math.cos(theta) * lobe.r,
                y: lobe.y + yOff * lobe.r + 1.5, // Center offset
                z: rRadius * Math.sin(theta) * (lobe.r * 0.8),
                color: { r: 0.36, g: 0.79, b: 0.48 } // Botanical Green
            });
        }

        // Surgical Vertical Trunk (Compressed HD)
        for (let i = 0; i < trunkCount; i++) {
            const h = (i / trunkCount) * 3.0; // Shorter trunk
            points.push({
                x: (Math.random() - 0.5) * 1.0,
                y: h - 3.5, // Centered Root position
                z: (Math.random() - 0.5) * 1.0,
                color: { r: 0.36, g: 0.79, b: 0.48 }
            });
        }
        return points;
    }

    createNaturalShape() {
        const points = [];
        // Staggered Axis-Filling Leaf Logic (Adapted from provided code)
        for (let i = 0; i < this.particleCount; i++) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 100) {
                const u = Math.random(); // 0..1 along the leaf axis
                const v = Math.random() * 2 - 1; // -1..1 across the leaf
                const halfWidth = Math.sin(u * Math.PI) * (1 - Math.pow(Math.abs(v), 1.5) * 0.3) * 6;
                
                if (Math.abs(v * 8) <= halfWidth) {
                    points.push({
                        x: v * 8,
                        y: -(u - 0.5) * 11 - 1,
                        z: (Math.random() - 0.5) * 1.5
                    });
                    placed = true;
                }
                attempts++;
            }
            if (!placed) {
                points.push({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 11, z: 0 });
            }
        }
        return points;
    }

    createHedioneShape() {
        const points = [];
        // Sparse Molecular Nodes (Ball & Stick feel)
        const nodes = [
            {x: -1.5, y: 1.5}, {x: -2.5, y: -0.5}, {x: -1, y: -2}, {x: 1, y: -2}, {x: 1.5, y: 0},
            {x: -1.5, y: 2.8}, // O=
            {x: 2.5, y: 0.5}, {x: 3.5, y: 2}, {x: 5, y: 3}, // Tail nodes
            {x: 2, y: -3}, {x: 4, y: -3}, {x: 5.5, y: -4}  // Ester nodes
        ];

        for (let i = 0; i < this.particleCount; i++) {
            const node = nodes[i % nodes.length];
            points.push({
                x: node.x + (Math.random() - 0.5) * 0.4,
                y: node.y + (Math.random() - 0.5) * 0.4,
                z: (Math.random() - 0.5) * 0.6
            });
        }
        return points;
    }

    createCubicShape() {
        const points = [];
        const side = Math.ceil(Math.pow(this.particleCount, 1/3));
        for (let i = 0; i < this.particleCount; i++) {
            const x = (i % side) - side/2;
            const y = (Math.floor(i / side) % side) - side/2;
            const z = (Math.floor(i / (side * side))) - side/2;
            // Hyper-compressed surgical density (0.5 multiplier)
            points.push({ x: x * 0.5, y: y * 0.5, z: z * 0.5 });
        }
        return points;
    }

    createAmbriolaShape() {
        const points = [];
        // Compressed Golden Angle Sphere Distribution
        const phi = Math.PI * (3 - Math.sqrt(5)); 
        for (let i = 0; i < this.particleCount; i++) {
            const y = 1 - (i / (this.particleCount - 1)) * 2;
            const r = Math.sqrt(1 - y * y);
            const theta = phi * i;
            points.push({
                x: r * Math.cos(theta) * 3.5, // Compressed from 5.5
                y: y * 3.5,
                z: r * Math.sin(theta) * 3.5
            });
        }
        return points;
    }

    createBergamotShape() {
        const points = [];
        for (let i = 0; i < this.particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * 6;
            points.push({ x: r * Math.cos(angle) * 1.5, y: r * Math.sin(angle) * 0.8, z: (Math.random() - 0.5) * 3 });
        }
        return points;
    }

    createIsoEShape() {
        const points = [];
        for (let i = 0; i < this.particleCount; i++) {
            points.push({ x: (Math.random() - 0.5) * 9, y: (Math.random() - 0.5) * 9, z: (Math.random() - 0.5) * 9 });
        }
        return points;
    }

    createGalbanumShape() {
        const points = [];
        for (let i = 0; i < this.particleCount; i++) {
            const segment = i % 3;
            const val = (i/(this.particleCount/3) - 1.5) * 6;
            if (segment === 0) points.push({ x: val, y: 0, z: 0 });
            else if (segment === 1) points.push({ x: 0, y: val, z: 0 });
            else points.push({ x: 0, y: 0, z: val });
        }
        return points;
    }

    createJasmineShape() {
        const points = [];
        for (let i = 0; i < this.particleCount; i++) {
            const petal = i % 6;
            const angle = (petal * Math.PI * 2) / 6;
            const r = Math.random() * 7;
            points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * (r * 0.4), z: Math.sin(r) * 3 });
        }
        return points;
    }

    setTargetPositions(points, forcedColor = null) {
        for (let i = 0; i < this.particleCount * 3; i++) {
            this.startPositions[i] = this.positions[i];
            this.startColors[i] = this.colors[i];
        }
        for (let i = 0; i < this.particleCount; i++) {
            this.targetPositions[i * 3] = points[i].x;
            this.targetPositions[i * 3 + 1] = points[i].y;
            this.targetPositions[i * 3 + 2] = points[i].z;
            
            const color = forcedColor || points[i].color;
            if (color) {
                this.targetColors[i * 3] = color.r;
                this.targetColors[i * 3 + 1] = color.g;
                this.targetColors[i * 3 + 2] = color.b;
            }
        }
    }

    initEvents() {
        const items = document.querySelectorAll('.philosophy-item');
        const RED = { r: 0.85, g: 0.16, b: 0.11 };
        const GREEN = { r: 0.36, g: 0.79, b: 0.48 };

        items.forEach(item => {
            const molecule = item.getAttribute('data-molecule');
            const triggerMorph = () => {
                if (molecule === 'natural') {
                    this.currentShape = 'ambriola';
                    this.setTargetPositions(this.shapes.ambriola, GREEN);
                } else if (molecule === 'synthetic') {
                    this.currentShape = 'hedione'; 
                    this.setTargetPositions(this.shapes.hedione, RED);
                }
                this.morphStartTime = performance.now();
            };
            item.addEventListener('mouseenter', triggerMorph);
            item.addEventListener('mouseleave', () => {
                this.currentShape = 'mist';
                this.setTargetPositions(this.shapes.mist);
                this.morphStartTime = performance.now();
            });
        });

        window.addEventListener('resize', () => {
            if (!this.container) return;
            this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const posAttr = this.particles.geometry.attributes.position;
        const colAttr = this.particles.geometry.attributes.color;
        const posArray = posAttr.array;
        const colArray = colAttr.array;
        
        const elapsed = performance.now() - this.morphStartTime;

        for (let i = 0; i < this.particleCount; i++) {
            let t = (elapsed - this.delays[i] * this.morphDuration) / (this.morphDuration * 0.6);
            t = Math.max(0, Math.min(1, t));
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            
            for (let j = 0; j < 3; j++) {
                const idx = i * 3 + j;
                // Pure Linear-Eased Discovery (No Spring)
                this.positions[idx] = this.startPositions[idx] + (this.targetPositions[idx] - this.startPositions[idx]) * eased;
                this.colors[idx] = this.startColors[idx] + (this.targetColors[idx] - this.startColors[idx]) * eased;
            }
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
        // Ethereal Horizontal-Only Orbit (Y-axis slow drift)
        this.particles.rotation.y += 0.002;
        this.renderer.render(this.scene, this.camera);
    }
}

// Global initialization
window.addEventListener('load', () => {
    new MolecularVisualizer();
});
