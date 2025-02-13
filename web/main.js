import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.173.0/+esm';
import CameraControls from 'https://cdn.jsdelivr.net/npm/camera-controls@2.9.0/+esm';

CameraControls.install({ THREE });
const api = window.location.origin + '/api/';

// set default code input
import { models } from './models.js';
document.addEventListener('DOMContentLoaded', () => {
  const codeInput = document.getElementById('code-input');
  codeInput.value = models['default'];
});

// initialize three.js viewer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth * 0.7 / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xffffff);
scene.background = new THREE.Color(0xffffff);

// set size based on viewer container
const viewerContainer = document.querySelector('.right-panel');
renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
viewerContainer.appendChild(renderer.domElement);

// add basic lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

let gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

const cameraControls = new CameraControls(camera, renderer.domElement);

// function to get CSS variable value
function getCSSVariable(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// convert CSS color to hex
function cssColorToHex(color) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = color;
  return parseInt(ctx.fillStyle.slice(1), 16);
}

// get material properties from CSS variables
function getMaterialProperties() {
  return {
    color: cssColorToHex(getCSSVariable('--material-color')),
    metalness: parseFloat(getCSSVariable('--material-metalness')),
    roughness: parseFloat(getCSSVariable('--material-roughness'))
  };
}

function updateGrid(model) {
  // remove old grid
  scene.remove(gridHelper);
  // calculate bounding box of model
  const bbox = new THREE.Box3().setFromObject(model);
  const size = bbox.getSize(new THREE.Vector3());
  // get the larger of width/depth and add some padding
  const maxSize = Math.max(size.x, size.z) * 1.5;
  const gridSize = Math.ceil(maxSize / 10) * 10; // round up to nearest 10
  // create new grid
  gridHelper = new THREE.GridHelper(gridSize, Math.floor(gridSize/2));
  scene.add(gridHelper);
}

// function to update output display
function updateOutput(message, success) {
  const outputContainer = document.getElementById('output-container');
  const outputMessage = document.getElementById('output-message');
  outputContainer.style.display = 'block';
  outputMessage.textContent = message;
  // reset classes
  outputContainer.classList.remove('warning', 'success');
  // add appropriate class based on message
  if (success) {
    outputContainer.classList.add('success');
  } else {
    outputContainer.classList.add('warning');
  }
}

// keep track of current model for cleanup
let currentModel = null;
// handle model preview
const preview_button = document.getElementById('preview-btn');
preview_button.addEventListener('click', async () => {
  preview_button.classList.add('button-disabled');
  updateOutput('Processing...', false);  // Show processing status
  const code = document.getElementById('code-input').value;
  try {
    const response = await fetch(api + 'preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code })
    });
    const statusCode = response.status;
    const data = await response.json();
    const success = statusCode === 200 && data.message !== "none";
    updateOutput(data.message, success);
    if (success && data.data && data.data !== "None") {
      // remove existing model if any
      if (currentModel) {
        scene.remove(currentModel);
      }
      // create geometry from the mesh data
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.data.vertices, 3));
      geometry.setIndex(data.data.faces);
      geometry.computeVertexNormals();
      // create material with CSS properties
      const material = new THREE.MeshStandardMaterial(getMaterialProperties());
      // create and position the model
      currentModel = new THREE.Mesh(geometry, material);
      // center the model (XY only, note Y is Z)
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      currentModel.geometry.boundingBox.getCenter(center);
      currentModel.geometry.translate(-center.x, 0, -center.z);
      scene.add(currentModel);
      // update grid size based on model
      updateGrid(currentModel);
      // set camera to frame the object
      const bbox = new THREE.Box3().setFromObject(currentModel);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraDistance = Math.abs(maxDim / Math.tan(fov / 2)) * 0.5;
      // position camera at an isometric-like view
      camera.position.set(cameraDistance, cameraDistance, cameraDistance);
      cameraControls.setLookAt(
        cameraDistance, cameraDistance, cameraDistance,
        0, 0, 0,
        true // immediate = true
      );
    }
  } catch (error) {
    console.log(error);
    updateOutput('Error: ' + error.message, false);
  }
  preview_button.classList.remove('button-disabled');
});

const download = async(button, type) => {
  button.classList.add('button-disabled');
  updateOutput('Processing...', false);
  const code = document.getElementById('code-input').value;
  try {
    const response = await fetch(api + type, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate ' + type.toUpperCase());
    }
    // set filename
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'model.' + type;
    // convert response to blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    updateOutput(type.toUpperCase() + ' file generated successfully', true);
  } catch (error) {
    console.error(error);
    updateOutput('Error: ' + error.message, false);
  }
  stl_button.classList.remove('button-disabled');
}

// handle STL download
const stl_button = document.getElementById('stl-btn');
const step_button = document.getElementById('step-btn');
stl_button.addEventListener('click', () => download(stl_button, 'stl'));
step_button.addEventListener('click', () => download(step_button, 'step'));

const clock = new THREE.Clock();

// animation loop
function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// handle window resize
window.addEventListener('resize', () => {
  const width = viewerContainer.clientWidth;
  const height = viewerContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});