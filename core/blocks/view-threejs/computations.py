import uuid
from string import Template


def compute(num_cubes=3):
    """Generates an HTML file displaying a 3D scene with cubes using Three.js.

    Inputs:
        num_cubes (int): The number of cubes to generate in the 3D scene.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.

    Requirements:
        uuid
        string
    """

    html_template = Template(
        """
<canvas id="c"></canvas>
<script type="importmap">
    {
    "imports": {
        "three": "https://cdn.skypack.dev/three@0.138.0/build/three.module"
    }
    }
</script>


<script type="module">
import * as THREE from "three";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.138.0/examples/jsm/controls/OrbitControls";

var scene, camera, renderer, controls;
var geometry, material, mesh;
var numCubes = $num_cubes;

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.querySelector('#c') });
    renderer.setSize(window.innerWidth, window.innerHeight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    controls.update();
}

function generateCubes() {
    geometry = new THREE.BoxGeometry(1, 1, 1);
    material = new THREE.MeshStandardMaterial({color: 0x00ff00}); 

    for (let i = 0; i < numCubes; i++) {
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = (Math.random() - 0.5) * 20;
        mesh.position.y = (Math.random() - 0.5) * 20;
        mesh.position.z = (Math.random() - 0.5) * 20;
        scene.add(mesh);
    }
}

function addLights() {
    // Ambient light
    var ambientLight = new THREE.AmbientLight(0x404040); 
    scene.add(ambientLight);

    // Point light
    var pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);

    // Directional light
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Hemisphere light
    var hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    scene.add(hemisphereLight);

    // Spot light
    var spotLight = new THREE.SpotLight(0xffffff, 0.5);
    spotLight.position.set(10, 20, 10);
    scene.add(spotLight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);

    scene.traverse(function(node){
        if (node instanceof THREE.Mesh) {
            node.rotation.x += 0.01;
            node.rotation.y += 0.02;
        }
    });
}

init();
generateCubes();
addLights();
animate();
</script>

    """
    )

    # Generate a UUID
    unique_id = str(uuid.uuid4())

    html_path = f"views/viz_{unique_id}.html"
    html_code = html_template.substitute(num_cubes=num_cubes)

    # Write the file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"viz_{unique_id}.html"}


def test():
    """Test the compute function."""

    print("Running test")
