// controllables
let particleCount = 100000,
  particleResolution = 0.015,
  grabDistance = window.innerWidth <= 768 ? 0.75 : 0.5;
let orbitSpeed = 0.03;
let spiralInwardSpeed = 10;
const ejectDistance = 2.1;
const ejectForce = 0.05;
const minDistanceToCamera = 2;

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

const palettes = [
  [
    new THREE.Color(0xff9f00), // Orange
    new THREE.Color(0xff5200), // Darker orange
    new THREE.Color(0xff2600), // Red-orange
  ],
  [
    new THREE.Color(0x5432ff), // Blue
    new THREE.Color(0x3200ff), // Darker blue
    new THREE.Color(0x8b32ff), // Purple
  ],
  [
    new THREE.Color(0xff0080),
    new THREE.Color(0xff00ff),
    new THREE.Color(0xff4080),
  ],
  [
    new THREE.Color(0x66ffff),
    new THREE.Color(0x003366),
    new THREE.Color(0x99ccff),
  ],
  [
    new THREE.Color(0xffcc00),
    new THREE.Color(0xff6600),
    new THREE.Color(0xffcc33),
  ],
  [
    new THREE.Color(0x00bfff),
    new THREE.Color(0x006699),
    new THREE.Color(0x66ccff),
  ],
  [
    new THREE.Color(0x6600ff),
    new THREE.Color(0xff00ff),
    new THREE.Color(0xff33cc),
  ],
  [
    new THREE.Color(0xff00ff),
    new THREE.Color(0xff6600),
    new THREE.Color(0xffff00),
  ],
  [
    new THREE.Color(0xff0000),
    new THREE.Color(0xffff00),
    new THREE.Color(0x00ff00),
  ],
  [
    new THREE.Color(0x00ff00),
    new THREE.Color(0xff0000),
    new THREE.Color(0x0000ff),
  ],
  [
    new THREE.Color(0xff0000),
    new THREE.Color(0x00ffff),
    new THREE.Color(0xffffff),
  ],
  [
    new THREE.Color(0xff9933),
    new THREE.Color(0xff6666),
    new THREE.Color(0xff0000),
  ],
];
// Choose a random palette at the start
const paletteIndex = Math.floor(Math.random() * palettes.length);
const palette = palettes[paletteIndex];
console.log(palette);
// Helper function to create the GUI
function createGUI() {
  const gui = new dat.GUI();

  const params = {
    particleCount: 100000,
    particleResolution: 0.01,
    grabDistance: 0.5,
    orbitSpeed: 0.02,
    spiralInwardSpeed: 0.01,
    palette,
    paletteIndex,
    palette_a: palette[0],
    palette_b: palette[1],
    palette_c: palette[2],
    reset: function () {
      this.particleCount = 100000;
      this.particleResolution = 0.01;
      this.grabDistance = 0.5;
      this.orbitSpeed = 0.02;
      this.spiralInwardSpeed = 0.01;
      this.palette = palette;
      this.paletteIndex = paletteIndex;
      this.palette_a = palette[0];
      this.palette_b = palette[1];
      this.palette_c = palette[2];
    },
  };

  // Add folder for particle settings
  const particleFolder = gui.addFolder("Particle Settings");
  particleFolder.add(params, "particleCount", 100, 250000, 1).onChange(() => {
    particleCount = params.particleCount;
    updateParticleSystem();
  });
  particleFolder
    .add(params, "particleResolution", 0.001, 0.1, 0.001)
    .onChange(() => {
      particleResolution = params.particleResolution;
      updateParticleSystem();
    });
  particleFolder.add(params, "grabDistance", 0.01, 5, 0.01).onChange(() => {
    grabDistance = params.grabDistance;
  });
  particleFolder.add(params, "orbitSpeed", 0.001, 0.1, 0.001).onChange(() => {
    orbitSpeed = params.orbitSpeed;
  });
  particleFolder
    .add(params, "spiralInwardSpeed", 0.001, 0.1, 0.001)
    .onChange(() => {
      spiralInwardSpeed = params.spiralInwardSpeed;
    });

  // Add folder for palette settings
  //   const paletteFolder = gui.addFolder("Palette Settings");
  //   const paletteSelectionA = paletteFolder
  //     .addColor(params, "palette_a")
  //     .onChange((colorValue) => {
  //       console.log(colorValue);
  //       let colorObject = new THREE.Color(colorValue);
  //       palette[0] = colorObject;
  //       //updateParticleSystem();
  //     });
  //   const paletteSelectionB = paletteFolder
  //     .addColor(params, "palette_b")
  //     .onChange((colorValue) => {
  //       let colorObject = new THREE.Color(colorValue);
  //       palette[1] = colorObject;
  //       //updateParticleSystem();
  //     });
  //   const paletteSelectionC = paletteFolder
  //     .addColor(params, "palette_c")
  //     .onChange((colorValue) => {
  //       let colorObject = new THREE.Color(colorValue);
  //       palette[2] = colorObject;
  //       console.log(palette)
  //     });

  // Add listener for changes
  gui.remember(params);
  gui.close();
  gui.add(params, "reset").name("Reset All");
}

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
  // add event listeners for both mouse and touch events
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("touchmove", onMouseMove, { passive: false });
  animate();
  createGUI();
}

function createParticleSystem() {
  particles = new THREE.BufferGeometry();
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

// Get the time of day as a normalized value between 0 and 1
function getTimeOfDay() {
  const now = new Date();
  const currentTime =
    now.getHours() * 60 * 60 + now.getMinutes() * 60 + now.getSeconds();
  return currentTime / (24 * 60 * 60);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  particleSystem.rotation.x += 0.001;
  particleSystem.rotation.y += 0.001;
  particleSystem.rotation.z += 0.001;
  const colors = particles.attributes.color.array;
  const positions = particles.attributes.position.array;

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

  const paletteBoxA = document.getElementById("palette-box-a");
  paletteBoxA.style.backgroundColor = `rgb(${Math.round(
    palette[0].r * 255
  )}, ${Math.round(palette[0].g * 255)}, ${Math.round(palette[0].b * 255)})`;
  const paletteBoxB = document.getElementById("palette-box-b");
  paletteBoxB.style.backgroundColor = `rgb(${Math.round(
    palette[1].r * 255
  )}, ${Math.round(palette[1].g * 255)}, ${Math.round(palette[1].b * 255)})`;
  const paletteBoxC = document.getElementById("palette-box-c");
  paletteBoxC.style.backgroundColor = `rgb(${Math.round(
    palette[2].r * 255
  )}, ${Math.round(palette[2].g * 255)}, ${Math.round(palette[2].b * 255)})`;

  document.getElementById("time-info").textContent = `Time: ${timeString}`;

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
      const t = particle.distanceTo(mousePos) / grabDistance;
      const color = palette[0]
        .clone()
        .lerp(palette[1], t)
        .lerp(palette[2], distance / grabDistance);
      colors[i] = color.r;
      colors[i + 1] = color.g;
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
  const x = event.clientX || event.touches[0].clientX;
  const y = event.clientY || event.touches[0].clientY;
  mouseX = (x / window.innerWidth) * 2 - 1;
  mouseY = -(y / window.innerHeight) * 2 + 1;

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
