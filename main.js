// controllables
let particleCount = 100000,
  particleResolution = 0.01,
  grabDistance = 0.5;
const minDistanceToCamera = 2;
let orbitSpeed = 0.03;
let spiralInwardSpeed = 10;
const ejectDistance = 2.1;
const ejectForce = 0.05;

// Variables
let scene, camera, renderer, geometry, material, mesh;
let particleSystem,
  particles,
  particleMaterial,
  mouseX = 0,
  mouseY = 0,
  mousePos = new THREE.Vector3();
let raycaster = new THREE.Raycaster(),
  plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let initialPositions;

// Scene and camera setup
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  createParticleSystem();
  window.addEventListener("mousemove", onMouseMove, false);
  animate();
}

function createParticleSystem() {
  particles = new THREE.BufferGeometry();
  //   particleMaterial = new THREE.PointsMaterial({
  //     map: createBlobTexture(),
  //     size: particleResolution,
  //     transparent: true,
  //     blending: THREE.AdditiveBlending,
  //     depthWrite: false,
  //     vertexColors: true,
  //   });
  //particleMaterial = createMetaballShaderMaterial();
  const textureLoader = new THREE.TextureLoader();
  const sprite = textureLoader.load(
    "https://threejs.org/examples/textures/sprites/disc.png"
  );

  particleMaterial = new THREE.PointsMaterial({
    map: sprite,
    size: particleResolution,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  });
  const positions = new Float32Array(particleCount * 3);
  initialPositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = Math.random() * 10 - 5;
    positions[i + 1] = Math.random() * 10 - 5;
    positions[i + 2] = Math.random() * 10 - 5;

    initialPositions[i] = positions[i];
    initialPositions[i + 1] = positions[i + 1];
    initialPositions[i + 2] = positions[i + 2];
  }

  particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const colors = new Float32Array(particleCount * 3);
  particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (particleSystem) {
    scene.remove(particleSystem);
  }

  particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);
}

function createMetaballShaderMaterial() {
  const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

  const fragmentShader = `
  uniform vec3 color;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float d = dot(p, p);
    float alpha = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(color, alpha * opacity);
  }
`;

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0xffffff) },
      opacity: { value: 1 },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide, // Add this line
  });

  return shaderMaterial;
}

function createBlobTexture() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const size = 128;

  canvas.width = size;
  canvas.height = size;

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.5)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

// Get the time of day as a normalized value between 0 and 1
function getTimeOfDay() {
  const now = new Date();
  const currentTime =
    now.getHours() * 60 * 60 + now.getMinutes() * 60 + now.getSeconds();
  return currentTime / (24 * 60 * 60);
}

// Color palettes for day and night
const dayPalette = [
  new THREE.Color(0xff9f00), // Orange
  new THREE.Color(0xff5200), // Darker orange
  new THREE.Color(0xff2600), // Red-orange
];

const nightPalette = [
  new THREE.Color(0x5432ff), // Blue
  new THREE.Color(0x3200ff), // Darker blue
  new THREE.Color(0x8b32ff), // Purple
];

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  particleSystem.rotation.x += 0.001;
  particleSystem.rotation.y += 0.001;
  particleSystem.rotation.z += 0.001;
  const colors = particles.attributes.color.array;
  const positions = particles.attributes.position.array;

  const attractorStrength = 0.05;
  const orbitSpeed = 0.02;

  const tempParticle = new THREE.Vector3();
  const tempMousePos = new THREE.Vector3(mouseX, mouseY, 0.5);
  // Calculate matrixWorldInverse
  let matrixWorldInverse = new THREE.Matrix4()
    .copy(particleSystem.matrixWorld)
    .invert();

  // Calculate the camera position in the particle system's local space
  let cameraPosLocal = camera.position.clone().applyMatrix4(matrixWorldInverse);

  // Function to enforce minimum distance to camera
  function enforceMinDistanceToCamera(particlePos, minDistance) {
    let distance = particlePos.distanceTo(cameraPosLocal);
    if (distance < minDistance) {
      let dir = particlePos.clone().sub(cameraPosLocal).normalize();
      return cameraPosLocal.clone().add(dir.multiplyScalar(minDistance));
    }
    return particlePos;
  }

  const timeOfDay = getTimeOfDay();
  const currentTime = new Date();
  const timeString = currentTime.toLocaleTimeString();
  const palette = timeOfDay < 0.5 ? dayPalette : nightPalette;
  const paletteString = palette
    .map((color) => {
      return `rgb(${Math.round(color.r * 255)}, ${Math.round(
        color.g * 255
      )}, ${Math.round(color.b * 255)})`;
    })
    .join(", ");

  const paletteBox = document.getElementById("palette-box");
  paletteBox.style.backgroundColor = `rgb(${Math.round(
    palette[1].r * 255
  )}, ${Math.round(palette[1].g * 255)}, ${Math.round(
    palette[1].b * 255
  )})`;

  document.getElementById(
    "time-info"
  ).textContent = `Time: ${timeString}`;

  for (let i = 0; i < positions.length; i += 3) {
    let particle = new THREE.Vector3(
      positions[i],
      positions[i + 1],
      positions[i + 2]
    );
    let initialPosition = new THREE.Vector3(
      initialPositions[i],
      initialPositions[i + 1],
      initialPositions[i + 2]
    );

    // Transform the particle position to camera space
    tempParticle.copy(particle).applyMatrix4(particleSystem.matrixWorld);
    tempParticle.project(camera);

    let distance = tempParticle.distanceTo(tempMousePos);

    if (distance < grabDistance) {
      // Smooth orbit around the mouse position
      const axis = new THREE.Vector3()
        .subVectors(particle, mousePos)
        .normalize();
      particle.applyAxisAngle(axis, orbitSpeed);

      // Decrease the distance over time to create a spiral effect
      distance *= 1 - spiralInwardSpeed;

      // Eject particles from the center when they get close enough
      if (distance < ejectDistance) {
        particle.x += ejectForce * (mousePos.x - particle.x);
        particle.y += ejectForce * (mousePos.y - particle.y);
      }

      // Update particle color based on distance and time
      const t = Math.sin(performance.now() * 0.001) * 0.5 + 0.5;
      const color = palette[0]
        .clone()
        .lerp(palette[1], t)
        .lerp(palette[2], distance / grabDistance);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
      colors[i + 2] = color.b;
    } else {
      particle.lerp(initialPosition, 0.05);
      // Reset the particle color to white
      colors[i] = 1;
      colors[i + 1] = 1;
      colors[i + 2] = 1;
    }

    // Enforce minimum distance to camera
    let newPos = enforceMinDistanceToCamera(particle, minDistanceToCamera);
    positions[i] = newPos.x;
    positions[i + 1] = newPos.y;
    positions[i + 2] = newPos.z;
  }

  particles.attributes.position.needsUpdate = true;
  particles.attributes.color.needsUpdate = true;

  renderer.render(scene, camera);
}

function onMouseMove(event) {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

  mousePos.set(mouseX, mouseY, 0.5);
  mousePos.unproject(camera);
  mousePos.sub(camera.position).normalize();
  mousePos.multiplyScalar(5);
  mousePos.add(camera.position);

  // Transform mousePos to the particleSystem's local space
  mousePos.applyMatrix4(
    new THREE.Matrix4().copy(particleSystem.matrixWorld).invert()
  );
}

// Resize listener
window.addEventListener("resize", () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

function updateParticleSystem() {
  // Remove the existing particle system from the scene
  if (scene.getObjectByName("particleSystem")) {
    scene.remove(scene.getObjectByName("particleSystem"));
  }

  // Create a new particle system with the updated values
  createParticleSystem(particleCount, particleResolution);

  // Add the new particle system to the scene
  scene.add(particleSystem);
}

// Initialize the scene
init();

document.getElementById("toggleDrawer").addEventListener("click", () => {
  document.getElementById("drawer").classList.toggle("open");
});

document.getElementById("update").addEventListener("click", () => {
  particleCount = parseInt(document.getElementById("particleCount").value);
  particleResolution = parseFloat(
    document.getElementById("particleResolution").value
  );
  grabDistance = parseFloat(document.getElementById("grabDistance").value);
  orbitSpeed = parseFloat(document.getElementById("orbitSpeed").value);
  spiralInwardSpeed = parseFloat(
    document.getElementById("spiralInwardSpeed").value
  );

  // Update the particle system with new values
  updateParticleSystem();
});

document.getElementById("toggle-controls").addEventListener("click", () => {
  document.getElementById("drawer").classList.toggle("open");
});
