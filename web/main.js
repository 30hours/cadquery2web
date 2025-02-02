import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.173.0/+esm';
import CameraControls from 'https://cdn.jsdelivr.net/npm/camera-controls@2.9.0/+esm';

// extract CSS variable values
const rootStyles = getComputedStyle(document.documentElement);
const materialColor = rootStyles.getPropertyValue('--material-color').trim();
const materialMetalness = parseFloat(rootStyles.getPropertyValue('--material-metalness'));
const materialRoughness = parseFloat(rootStyles.getPropertyValue('--material-roughness'));


CameraControls.install({ THREE });
const api = window.location.origin + '/api/';

// Initialize Three.js viewer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth * 0.7 / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xffffff);
scene.background = new THREE.Color(0xffffff);

// Set size based on viewer container
const viewerContainer = document.querySelector('.right-panel');
renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
viewerContainer.appendChild(renderer.domElement);

// Add basic lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

let gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

function updateGrid(model) {
    // Remove old grid
    scene.remove(gridHelper);
    
    // Calculate bounding box of model
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    
    // Get the larger of width/depth and add some padding
    const maxSize = Math.max(size.x, size.z) * 1.5;
    const gridSize = Math.ceil(maxSize / 10) * 10; // Round up to nearest 10
    
    // Create new grid
    gridHelper = new THREE.GridHelper(gridSize, Math.floor(gridSize/2));
    scene.add(gridHelper);
}

camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

const cameraControls = new CameraControls(camera, renderer.domElement);

// Function to update output display
function updateOutput(message, success) {
    const outputContainer = document.getElementById('output-container');
    const outputMessage = document.getElementById('output-message');
    
    outputContainer.style.display = 'block';
    outputMessage.textContent = message;

    // Reset classes
    outputContainer.classList.remove('warning', 'success');
    
    // Add appropriate class based on message
    if (success) {
        outputContainer.classList.add('success');
    } else {
        outputContainer.classList.add('warning');
    }
}

// Keep track of current model for cleanup
let currentModel = null;

// handle model preview
document.getElementById('preview-btn').addEventListener('click', async () => {
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
            // Remove existing model if any
            if (currentModel) {
                scene.remove(currentModel);
            }

            // Create geometry from the mesh data
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.data.vertices, 3));
            geometry.setIndex(data.data.faces);
            geometry.computeVertexNormals();

            // Create material and mesh
            const material = new THREE.MeshStandardMaterial({
                color: materialColor,
                metalness: materialMetalness,
                roughness: materialRoughness,
            });
            
            currentModel = new THREE.Mesh(geometry, material);
            scene.add(currentModel);
            
            // Update grid size based on model
            updateGrid(currentModel);
        }
    } catch (error) {
        console.log(error);
        updateOutput('Error: ' + error.message, false);
    }
});

// handle STL download
document.getElementById('stl-btn').addEventListener('click', async () => {
    const code = document.getElementById('code-input').value;
    try {
        const response = await fetch(api + 'stl', {
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
  } catch (error) {
      console.log(error);
      updateOutput('Error: ' + error.message, false);
  }
});

const clock = new THREE.Clock();

// Animation loop
function animate() {
    const delta = clock.getDelta();
    cameraControls.update(delta);
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    const width = viewerContainer.clientWidth;
    const height = viewerContainer.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
});