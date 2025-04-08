import { setupMouseControl, checkAutoRotateResume, getMovementKeys} from './control.js';
import { initScreenshot } from './screenshot.js';
      
const scene = new THREE.Scene();
const camera = new THREE.Camera();
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true  // html2canvas needs to "read" the pixel buffer when capturing
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const uniforms = {
  uRotationTime: { value: 0 },
  iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
  iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
  uClick: { value: new THREE.Vector4(0, 0, 0, 0) },
  currentCameraPos: { value: new THREE.Vector3(0, 0, -8.0) },
  baseColor: { value: new THREE.Vector3(0, 0, 0) }
};

setupMouseControl(uniforms, renderer, () => rotationClock); 

// === ShaderMaterial ===
import shaderCode from './shader.js';

const material = new THREE.ShaderMaterial({
  uniforms: uniforms,
  fragmentShader: shaderCode
});

const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);


function generateColor(time) {
  let period = 20000.0;
  let phi = (time / period) * 2 * Math.PI;

  let r = 0.3 + 0.3 * Math.sin(phi);
  let g = 0.2 + 0.2 * Math.sin(phi + 2.0 );
  let b = 0.25 + 0.25 * Math.sin(phi + 4.0 );

  return [r, g, b]; // returns an array like [0.3, 0.2, 0.25]
}

let rotationClock = 0;
let lastFrameTime = 0;

const MOVE_SPEED = 2.5; // units per second

function animate(time) {
  // convert `time` from milliseconds to seconds
  const delta = (time - lastFrameTime) * 0.001;
  lastFrameTime = time;

  let baseColor = generateColor(time);
  uniforms.baseColor.value = baseColor;

  const autoRotate = checkAutoRotateResume();

  if (autoRotate) {
    rotationClock += delta;
    //uniforms.iMouse.value.z = 0.0;
  }

  if (isNaN(rotationClock)) {
    rotationClock = 0;
    console.log("NaN rotationClock")
  }

  uniforms.uRotationTime.value = rotationClock;

  // Handle movement
  const keys = getMovementKeys();
  const moveVec = new THREE.Vector3();
  
  if (keys.z) moveVec.z += 1;
  if (keys.x) moveVec.z -= 1;
  if (keys.a) moveVec.x -= 1;
  if (keys.d) moveVec.x += 1;
  if (keys.s) moveVec.y -= 1;
  if (keys.w) moveVec.y += 1;
  
  if (moveVec.lengthSq() > 0) {
    moveVec.normalize().multiplyScalar(MOVE_SPEED * delta);
    uniforms.currentCameraPos.value.add(moveVec);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

initScreenshot();