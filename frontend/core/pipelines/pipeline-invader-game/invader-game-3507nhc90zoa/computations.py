import uuid
from string import Template

def compute(player_image_path, enemy_image_path):
    """Generates an HTML file displaying an Invader game using Three.js.

    Inputs:
        player_image_path (str): The file path to the player image asset.
        enemy_image_path (str): The file path to the enemy image asset.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.
    """

    html_template = Template(
        """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invader Game</title>
    <style>
        body, html {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            background-color: black;
            color: white;
            font-family: Arial, sans-serif;
        }
        #score, #lives {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 1;
        }
        #lives {
            left: auto;
            right: 10px;
        }
        #message {
            display: none;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            font-size: 24px;
            text-align: center;
            z-index: 2;
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
    <div id="score">Score: 0</div>
    <div id="lives">Lives: 3</div>
    <div id="message"></div>
    <script>
        const assetImagePlayer = '$player_image_path';  // Local image
        const assetImageEnemy = '$enemy_image_path';    // Local image

        let scene, camera, renderer;
        let player, enemyTexture, bullets = [], enemyBullets = [], enemies = [], keys = {};
        let lastShot = 0, score = 0, lives = 3, gameOver = false, enemyDirection = 1;

        function init() {
            scene = new THREE.Scene();

            camera = new THREE.OrthographicCamera(
                window.innerWidth / -2, window.innerWidth / 2,
                window.innerHeight / 2, window.innerHeight / -2,
                1, 1000
            );
            camera.position.z = 1000;

            renderer = new THREE.WebGLRenderer();
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);

            const loader = new THREE.TextureLoader();
            loader.load(assetImagePlayer, function(texture) {
                player = createSprite(texture, 50, 50);
                player.position.set(0, -window.innerHeight / 2 + 60, 0);
                scene.add(player);
            });

            loadEnemies();

            window.addEventListener("keydown", onKeyDown, false);
            window.addEventListener("keyup", onKeyUp, false);

            animate();
        }

        function loadEnemies() {
            const loader = new THREE.TextureLoader();
            loader.load(assetImageEnemy, function(texture) {
                enemyTexture = texture;
                for (let row = 0; row < 3; row++) {
                    for (let i = 0; i < 6; i++) {
                        let enemy = createSprite(enemyTexture, 50, 50);
                        enemy.position.set(i * 80 - 200, window.innerHeight / 2 - 60 - row * 80, 0);
                        scene.add(enemy);
                        enemies.push(enemy);
                    }
                }
            });
        }

        function createSprite(texture, width, height) {
            let material = new THREE.SpriteMaterial({ map: texture });
            let sprite = new THREE.Sprite(material);
            sprite.scale.set(width, height, 1);
            return sprite;
        }

        function onKeyDown(event) {
            keys[event.key] = true;
            if (gameOver && event.key === ' ') {
                restartGame();
            }
        }

        function onKeyUp(event) {
            keys[event.key] = false;
        }

        function shoot() {
            if (performance.now() - lastShot > 300) {
                let bulletGeometry = new THREE.BoxGeometry(5, 20, 1);
                let bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x66CCFF });
                let bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
                bullet.position.set(player.position.x, player.position.y + 30, 0);
                bullets.push(bullet);
                scene.add(bullet);
                lastShot = performance.now();
            }
        }

        function enemyShoot(enemy) {
            let bulletGeometry = new THREE.BoxGeometry(5, 20, 1);
            let bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
            let bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
            bullet.position.set(enemy.position.x, enemy.position.y - 30, 0);
            enemyBullets.push(bullet);
            scene.add(bullet);
        }

        function createExplosion(x, y) {
            let explosionGeometryOuter = new THREE.CircleGeometry(30, 32); // Larger outer circle
            let explosionMaterialOuter = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
            let explosionOuter = new THREE.Mesh(explosionGeometryOuter, explosionMaterialOuter);
            explosionOuter.position.set(x, y, 0);
            scene.add(explosionOuter);

            let explosionGeometryInner = new THREE.CircleGeometry(15, 32); // Smaller inner circle
            let explosionMaterialInner = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
            let explosionInner = new THREE.Mesh(explosionGeometryInner, explosionMaterialInner);
            explosionInner.position.set(x, y, 0);
            scene.add(explosionInner);

            setTimeout(() => {
                scene.remove(explosionOuter);
                scene.remove(explosionInner);
            }, 300);
        }

        function updateScore() {
            score += 10;
            document.getElementById('score').innerText = `Score: $${score}`;
        }

        function updateLives() {
            lives -= 1;
            document.getElementById('lives').innerText = `Lives: $${lives}`;
            if (lives <= 0) {
                endGame("You lost! Press Spacebar to restart.");
            }
        }

        function endGame(message) {
            gameOver = true;
            document.getElementById('message').innerText = message;
            document.getElementById('message').style.display = 'block';
        }

        function restartGame() {
            score = 0;
            lives = 3;
            gameOver = false;
            bullets.forEach(bullet => scene.remove(bullet));
            enemyBullets.forEach(bullet => scene.remove(bullet));
            bullets = [];
            enemyBullets = [];
            enemies.forEach(enemy => scene.remove(enemy));
            enemies = [];
            enemyDirection = 1;
            document.getElementById('score').innerText = `Score: $${score}`;
            document.getElementById('lives').innerText = `Lives: $${lives}`;
            document.getElementById('message').style.display = 'none';

            loadEnemies();

            requestAnimationFrame(animate);
        }

        function animate() {
            if (gameOver) return;

            requestAnimationFrame(animate);

            if (keys['ArrowLeft']) {
                player.position.x -= 10;
            }
            if (keys['ArrowRight']) {
                player.position.x += 10;
            }
            if (keys[' ']) {
                shoot();
            }

            bullets.forEach((bullet, index) => {
                bullet.position.y += 10;
                if (bullet.position.y > window.innerHeight / 2) {
                    scene.remove(bullet);
                    bullets.splice(index, 1);
                }
                enemies.forEach((enemy, enemyIndex) => {
                    if (bullet.position.distanceTo(enemy.position) < 25) {
                        createExplosion(enemy.position.x, enemy.position.y);
                        scene.remove(enemy);
                        scene.remove(bullet);
                        enemies.splice(enemyIndex, 1);
                        bullets.splice(index, 1);
                        updateScore();
                        if (enemies.length === 0) {
                            endGame("You won! Press Spacebar to restart.");
                        }
                    }
                });
            });

            enemyBullets.forEach((bullet, index) => {
                bullet.position.y -= 10;
                if (bullet.position.y < -window.innerHeight / 2) {
                    scene.remove(bullet);
                    enemyBullets.splice(index, 1);
                }
                if (bullet.position.distanceTo(player.position) < 25) {
                    createExplosion(player.position.x, player.position.y);
                    scene.remove(bullet);
                    enemyBullets.splice(index, 1);
                    updateLives();
                }
            });

            enemies.forEach((enemy, index) => {
                enemy.position.x += 2 * enemyDirection;
                if (enemy.position.x > window.innerWidth / 2 || enemy.position.x < -window.innerWidth / 2) {
                    enemyDirection *= -1;
                    enemies.forEach(e => e.position.y -= 20);
                }
                if (Math.random() < 0.01) {
                    enemyShoot(enemy);
                }
            });

            renderer.render(scene, camera);
        }

        window.addEventListener('resize', function() {
            camera.left = window.innerWidth / -2;
            camera.right = window.innerWidth / 2;
            camera.top = window.innerHeight / 2;
            camera.bottom = window.innerHeight / -2;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        init();
    </script>
</body>
</html>
    """
    )

    # Generate a UUID
    unique_id = str(uuid.uuid4())

    html_path = f"invader_game_{unique_id}.html"
    html_code = html_template.substitute(player_image_path=player_image_path, enemy_image_path=enemy_image_path)

    # Write the file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"invader_game_{unique_id}.html"}

def test():
    """Test the compute function."""

    print(compute("path_to_player_image.png", "path_to_enemy_image.png"))