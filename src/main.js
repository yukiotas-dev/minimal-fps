import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Setup Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.Fog(0x87ceeb, 0, 750);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6; // Eye height

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.querySelector('#app').appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // Soft white light
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// --- World ---
// Floor
const floorGeometry = new THREE.PlaneGeometry(200, 200);
const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(200, 50);
scene.add(gridHelper);

// --- Enemies ---
const enemies = [];
const enemyGeometry = new THREE.CapsuleGeometry(1, 2, 4, 8);
const enemyMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });

let enemiesSpawned = 0;
const maxEnemies = 10;
let isGameOver = false;

function spawnEnemy(x, z) {
  if (enemiesSpawned >= maxEnemies) return;

  const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial.clone());
  enemy.position.set(x, 2, z); // Capsule center is mid-height
  enemy.castShadow = true;
  enemy.receiveShadow = true;

  // Custom properties
  enemy.lastShotTime = 0;

  scene.add(enemy);
  enemies.push(enemy);
  enemiesSpawned++;
}

const enemyCounterUI = document.getElementById('enemy-counter');

function updateEnemyCounter() {
  enemyCounterUI.textContent = `Enemies Left: ${enemies.length}`;
}

// Create initial enemies
for (let i = 0; i < maxEnemies; i++) {
  const x = (Math.random() - 0.5) * 60;
  const z = (Math.random() - 0.5) * 60 - 30;
  spawnEnemy(x, z);
}
updateEnemyCounter();

// --- Controls ---
const controls = new PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  instructions.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  instructions.style.display = 'flex';
});

// Movement State
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

const onKeyDown = (event) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
  }
};

const onKeyUp = (event) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

const uiHealth = document.getElementById('health-display');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverTitle = document.getElementById('game-over-title');

let playerHealth = 100;
const damagePerHit = 10;
const damageCooldown = 500; // ms
let lastDamageTime = 0;

function updateHealthUI() {
  uiHealth.textContent = `Health: ${playerHealth}`;
}

function endGame(isVictory) {
  isGameOver = true;
  controls.unlock();
  gameOverScreen.style.display = 'flex';
  gameOverTitle.textContent = isVictory ? 'VICTORY' : 'Game Over';
  if (isVictory) {
    gameOverTitle.classList.add('victory-text');
  }
  instructions.style.display = 'none'; // Ensure instructions don't overlap
}

gameOverScreen.addEventListener('click', () => {
  location.reload();
});

function shoot() {
  if (!controls.isLocked || isGameOver) return;

  // Create player projectile
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  // Offset start position slightly forward to avoid clipping camera
  const startPos = camera.position.clone().add(direction.clone().multiplyScalar(1.0));

  createProjectile(startPos, direction, true);
}

document.addEventListener('mousedown', shoot);

// --- Resize ---
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Animation Loop ---
// --- Projectiles ---
const projectiles = [];
const projectileGeometry = new THREE.SphereGeometry(0.2, 8, 8);
const projectileMaterialEnemy = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const projectileMaterialPlayer = new THREE.MeshBasicMaterial({ color: 0x00ffff });

function createProjectile(position, direction, isPlayer = false) {
  const material = isPlayer ? projectileMaterialPlayer : projectileMaterialEnemy;
  const projectile = new THREE.Mesh(projectileGeometry, material);
  projectile.position.copy(position);

  const speed = isPlayer ? 40 : 8; // Slower enemy, faster player

  projectile.velocity = direction.normalize().multiplyScalar(speed);
  projectile.creationTime = Date.now();
  projectile.isPlayerProjectile = isPlayer;

  scene.add(projectile);
  projectiles.push(projectile);
}

const damageOverlay = document.getElementById('damage-overlay');
function takeDamage() {
  damageOverlay.style.opacity = '0.5';
  setTimeout(() => {
    damageOverlay.style.opacity = '0';
  }, 100);
}

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  if (isGameOver) return;

  if (controls.isLocked) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 100.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 100.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
  }

  // Enemy AI
  const playerPos = camera.position;
  enemies.forEach(enemy => {
    // Look at player
    enemy.lookAt(playerPos.x, enemy.position.y, playerPos.z);

    const dist = enemy.position.distanceTo(playerPos);

    // Move towards player if far
    if (dist > 10) {
      const dir = new THREE.Vector3().subVectors(playerPos, enemy.position).normalize();
      dir.y = 0; // Keep on ground
      enemy.position.add(dir.multiplyScalar(4 * delta)); // Speed 4
    }

    // Shoot
    if (Date.now() - enemy.lastShotTime > 2000 && dist < 30) {
      enemy.lastShotTime = Date.now();
      const shootDir = new THREE.Vector3().subVectors(playerPos, enemy.position);
      createProjectile(enemy.position, shootDir, false);
    }
  });

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.position.add(p.velocity.clone().multiplyScalar(delta));

    // Check hit player (Enemy Projectiles)
    if (!p.isPlayerProjectile && p.position.distanceTo(playerPos) < 1.0) {
      if (Date.now() - lastDamageTime < damageCooldown) {
        scene.remove(p);
        projectiles.splice(i, 1);
        continue;
      }

      takeDamage();
      playerHealth -= damagePerHit;
      lastDamageTime = Date.now();
      updateHealthUI();

      scene.remove(p);
      projectiles.splice(i, 1);

      if (playerHealth <= 0) {
        playerHealth = 0;
        updateHealthUI();
        endGame(false);
      }
      continue;
    }

    // Check hit Enemy (Player Projectiles)
    if (p.isPlayerProjectile) {
      let hitEnemy = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        // Simple distance check for hit
        if (p.position.distanceTo(enemy.position) < 1.5) { // Enemy radius approx + bullet radius
          scene.remove(enemy);
          enemies.splice(j, 1);
          hitEnemy = true;
          updateEnemyCounter();

          break; // One bullet hits one enemy
        }
      }

      if (hitEnemy) {
        scene.remove(p);
        projectiles.splice(i, 1);

        // Victory Condition
        if (enemies.length === 0) {
          endGame(true);
        }
        continue;
      }
    }

    // Cleanup old/far projectiles
    if (Date.now() - p.creationTime > 3000) {
      scene.remove(p);
      projectiles.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}


animate();
