import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.173.0/+esm';
import OrbitControlsFactory from 'https://cdn.jsdelivr.net/npm/three-orbit-controls@82.1.0/+esm';

const OrbitControls = OrbitControlsFactory(THREE);

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

const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

// const controls = new OrbitControls(camera, renderer.domElement);

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

// Animation loop
function animate() {
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