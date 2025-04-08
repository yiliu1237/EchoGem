import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';

import shaderCode from './single_crystal.js'; 

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '3'; //Higher z-index = rendered on top

//crystal still renders beautifully on top, but users can interact with HTML elements (like slider buttons) beneath it.
renderer.domElement.style.pointerEvents = 'none'; //Ignore this element for all mouse events like clicks or hovers.

//renderer.domElement.style.display = 'none';


renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create Crystals
const basePlanes = [
    [0.0, 1.0, 0.0, -1.75],
    [0.0, -1.0, 0.0, -1.75],
    [0.865558981895, 0.0, -0.500807106495, -0.742628234022],
    [-0.353560000658, -1.80422770057e-08, -0.935411810875, -0.880737701417],
    [-0.999897956848, -1.36637803294e-08, 0.0142883695662, -0.894969639267],
    [-0.358315140009, 1.2375285692e-11, 0.933600723743, -0.848164967797],
    [0.862004518509, 3.33596505975e-09, 0.50690060854, -0.81893926951],
    [0.781055212021, 0.623916983604, 0.0260841995478, -1.22853477631],
    [0.276541233063, 0.654822647572, -0.703372061253, -1.37026202368],
    [-0.653981924057, 0.653027355671, -0.381919920444, -1.36055210583],
    [-0.651714146137, 0.676901042461, 0.342160224915, -1.30437838268],
    [0.32613825798, 0.617486417294, 0.715782403946, -1.26344136905],
    [0.835819482803, -0.545120954514, 0.065184481442, -1.06336148713],
    [0.240880459547, -0.629201292992, -0.738973855972, -1.31147556665],
    [-0.596318423748, -0.65652692318, -0.461927205324, -1.35845409037],
    [-0.591593742371, -0.707991778851, 0.385700017214, -1.36638951145],
    [0.33144068718, -0.517934799194, 0.788600444794, -1.33775803516]
  ];

const loader = new THREE.CubeTextureLoader();
const cubeMapPaths = ['Cube/Bridge/', 'Cube/Castle/', 'Cube/Sky/', 'Cube/Park/'];


// // Crystal 
function generateCrystalShape(basePlanes, variationFactor = 0.1, dVariationFactor = 0.05) {
  const minCount = 16, maxCount = 32;
  const targetCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  console.log("targetCount: ", targetCount);
  const originalCount = basePlanes.length;
  const newPlanes = [...basePlanes]; // clone to preserve original

  if (targetCount < originalCount) {
    // Drop planes, preserving order
    const indicesToRemove = new Set();
    while (indicesToRemove.size < originalCount - targetCount) {
      indicesToRemove.add(Math.floor(Math.random() * originalCount));
    }

    return newPlanes.filter((_, i) => !indicesToRemove.has(i));

  } else if (targetCount > originalCount) {
    const planesToAdd = targetCount - originalCount;

    // For even interpolation, spread the additions across the array
    const insertions = [];
    for (let i = 0; i < planesToAdd; i++) {
      const insertIndex = Math.floor((i + 1) * (originalCount - 1) / (planesToAdd + 1));
      insertions.push(insertIndex);
    }

    // Interpolate and insert
    const result = [];
    for (let i = 0; i < newPlanes.length; i++) {
      const [x1, y1, z1, d1] = newPlanes[i];
      result.push([x1, y1, z1, d1]);

      if (insertions.includes(i) && i + 1 < newPlanes.length) {
        const [x2, y2, z2, d2] = newPlanes[i + 1];

        // Interpolate normal and d
        const normal = new THREE.Vector3(
          (x1 + x2) / 2,
          (y1 + y2) / 2,
          (z1 + z2) / 2
        ).normalize();

        const d = (d1 + d2) / 2;

        result.push([normal.x, normal.y, normal.z, d]);
      }
    }

    return result;
  }
  // If equal, just return a lightly jittered version
  return basePlanes.map(([x, y, z, d]) => {
    const nx = x + (Math.random() * 2 - 1) * Math.abs(x) * variationFactor;
    const ny = y + (Math.random() * 2 - 1) * Math.abs(y) * variationFactor;
    const nz = z + (Math.random() * 2 - 1) * Math.abs(z) * variationFactor;
    const nd = d + (Math.random() * 2 - 1) * Math.abs(d) * dVariationFactor;
    const normal = new THREE.Vector3(nx, ny, nz).normalize();
    return [normal.x, normal.y, normal.z, nd];
  });
}


function generateCrystalColor() {
  const randomInRange = (min, max) => Math.random() * (max - min) + min;
  return new THREE.Vector3(
    randomInRange(0.5, 3.5), // R
    randomInRange(0.5, 3.5), // G
    randomInRange(0.5, 3.5)  // B
  );
}


function generateCrystalMap() {
  const randomPath = cubeMapPaths[Math.floor(Math.random() * cubeMapPaths.length)];

  const cubeMap = loader.setPath(randomPath).load([
    'px.jpg', 'nx.jpg', // +X, -X
    'py.jpg', 'ny.jpg', // +Y, -Y
    'pz.jpg', 'nz.jpg'  // +Z, -Z
  ]);

  return cubeMap;
}



function generateCrystal(){
  let movedPlanes = generateCrystalShape(basePlanes, 0.3, 0.3);
  let crystalColor = generateCrystalColor();
  let crystalMap = generateCrystalMap();

  return [movedPlanes, crystalColor, crystalMap];
}



// Uniforms
const uniforms = {
  iTime: { value: 0.0 },
  iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  iMouse: { value: new THREE.Vector2() }, 
  iChannel0: { value: null },
  numPlanes: { value: 0},
  gemCenter: {value: new THREE.Vector3()}, 
  planes: {value: new Float32Array([])},
  rgb_factor: {value: new THREE.Vector3()}, 
};


// Geometry + ShaderMaterial
const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: shaderCode,
    uniforms: uniforms
  });

console.log(material.uniforms);

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Mouse tracking
window.addEventListener('mousemove', (e) => {
  uniforms.iMouse.value.x = e.clientX;
  uniforms.iMouse.value.y = window.innerHeight - e.clientY;
});

// Handle resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
});


//Three.js doesn't automatically support sending arrays of Vector4 objects as GLSL uniform vec4[32] arrays 
//Three.js tries to flatten that array internally to something GLSL can understand, like a Float32Array
//However, if any element is undefined, or if the array isn't in the right structure, or if the shader expects a packed buffer, it fails.
//In the shader, we have: uniform vec4 planes[32]; Which means the GPU wants this shape in memory: [x0, y0, z0, w0, x1, y1, z1, w1, ..., xN, yN, zN, wN] (exactly a Float32Array)
//But we if we give it: [Vector4, Vector4, Vector4, ...]  // JavaScript objects, 17 elements
//Three.js tried to run .toArray() on each one, and if even one was missing, it failed with: TypeError: undefined is not an object (evaluating 'array[i].toArray')
//movedPlanes = movedPlanes.map(v => new THREE.Vector4(...v));
//In addition,  Three.js still can't pass Vector4[] directly to vec4[32] uniforms.Even if all elements are perfectly valid Vector4s, the WebGL shader does not understand JavaScript objects. It only understands raw binary buffers (Float32Array)
function updateCrystal() {
  console.log("Updating crystal!");

  let [movedPlanes, crystalColor, crystalMap] = generateCrystal();

  const offset = new THREE.Vector3(0.0, 0.0, 0.0);
  let scale = 0.5;

  movedPlanes = movedPlanes.map(([x, y, z, d]) => [x, y, z, d * scale])
    .map(([x, y, z, d]) => {
      const normal = new THREE.Vector3(x, y, z);
      const delta = normal.dot(offset);
      return [x, y, z, d + delta];
    })
    .filter(v => Array.isArray(v) && v.length === 4 && v.every(n => typeof n === 'number'))
    .map(v => new THREE.Vector4(...v));


  const flatPlanes = new Float32Array(movedPlanes.flatMap(v => v.toArray()));

  uniforms.rgb_factor.value = crystalColor;
  uniforms.planes.value = flatPlanes;
  uniforms.numPlanes.value = flatPlanes.length;
  uniforms.gemCenter.value = offset;
  uniforms.iChannel0.value = crystalMap;
}


updateCrystal();


document.addEventListener('keydown', function(e) {
  let lists = document.querySelectorAll('.item');
  const slide = document.getElementById('slide');

  // Post message to parent if Space is pressed
  if (e.code === "Space") {
    e.preventDefault();
    window.parent.postMessage("TOGGLE_GEM", "*");
  }

  if (e.key === 'ArrowRight') {
      document.getElementById('slide').appendChild(lists[0]);
      updateCrystal();
  }

  if (e.key === 'ArrowLeft') {
      document.getElementById('slide').prepend(lists[lists.length - 1]);
      updateCrystal();
  }
});


// Animation loop
function animate() { 
  const time = performance.now();
  uniforms.iTime.value = time / 1000;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}


animate();