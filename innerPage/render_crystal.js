import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';

import shaderCode from './single_crystal.js'; 

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '-1'; //Higher z-index = rendered on top

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);



let planeValues = [
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

//Three.js doesn't automatically support sending arrays of Vector4 objects as GLSL uniform vec4[32] arrays 
//Three.js tries to flatten that array internally to something GLSL can understand, like a Float32Array
//However, if any element is undefined, or if the array isn't in the right structure, or if the shader expects a packed buffer, it fails.
//In the shader, we have: uniform vec4 planes[32]; Which means the GPU wants this shape in memory: [x0, y0, z0, w0, x1, y1, z1, w1, ..., xN, yN, zN, wN] (exactly a Float32Array)
//But we if we give it: [Vector4, Vector4, Vector4, ...]  // JavaScript objects, 17 elements
//Three.js tried to run .toArray() on each one, and if even one was missing, it failed with: TypeError: undefined is not an object (evaluating 'array[i].toArray')
let planeVectors = planeValues.map(v => new THREE.Vector4(...v));

// Uniforms
const uniforms = {
  iTime: { value: 0.0 },
  iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  iMouse: { value: new THREE.Vector2() }, 
  iChannel1: { value: null },
  numPlanes: { value: planeVectors.length},
  planes: {
    value: new Float32Array(planeVectors.flatMap(v => v.toArray()))
  }
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




const loader = new THREE.TextureLoader();
loader.load('/images/mem_img1.jpeg', texture => {
    console.log("bg loaded");
    uniforms.iChannel1.value = texture;
});


let lastSliderUpdateTime = performance.now();

// Animation loop
function animate() { 
  const time = performance.now();
  uniforms.iTime.value = time / 1000;

//   if (time - lastSliderUpdateTime > 200) { // every 200ms
//     updateCanvasTexture();
//     lastSliderUpdateTime = time;
//   }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();