import uuid
from string import Template

import numpy as np

# THIS IS TO HAVE A SLICER
# def slice_array(arr, slice_string):
#     # If an empty string is passed, return the full array
#     if not slice_string.strip():
#         return arr

#     # Split the string into slices for each dimension
#     slices = slice_string.split(',')

#     # If there are less slices than dimensions, fill the rest with full slices
#     if len(slices) < arr.ndim:
#         slices += [":" for _ in range(arr.ndim - len(slices))]

#     # Convert each slice from a string to a slice object
#     for i, s in enumerate(slices):
#         if ':' in s:
#             parts = [int(part) if part else None for part in s.split(':')]
#             if len(parts) > 3:
#                 raise ValueError(f"Slice {s} is not valid. Slices can have at most 3 values: start, end, and step.")
#             slices[i] = slice(*parts)
#         else:
#             slices[i] = int(s)
#             if slices[i] < 0 or slices[i] >= arr.shape[i]:
#                 raise ValueError(f"Index {slices[i]} is out of bounds for dimension {i} with size {arr.shape[i]}.")

#     # Use the slices to slice the array
#     return arr[tuple(slices)]


def compute(my_numpy):
    """Generates an HTML file displaying NumPy data and shape.

    Inputs:
        my_numpy (str): The path to a NumPy data file.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.

    Requirements:
        numpy
        string
        uuid
    """

    data = np.load(my_numpy)
    shape_list = str(list(data.shape))
    numpy_list = data.flatten().tolist()
    html_template = Template(
        """
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8" />
    <title>Numpy</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet'>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/nicolaspanel/numjs@0.15.1/dist/numjs.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"
        integrity="sha512-ElRFoEQdI5Ht6kZvyzXhYG9NqjtkmlkfYk0wr6wHxU9JEHakS7UJZNeml5ALk+8IKlU6jDgMabC3vkumRokgJA=="
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script async src="https://unpkg.com/es-module-shims@1.3.6/dist/es-module-shims.js"></script>
    <script type="importmap">
      {
        "imports": {
          "three": "https://cdn.skypack.dev/three@0.138.0/build/three.module"
        }
      }
    </script>
    <style>
        body {
            margin-right: 30px;
            margin-left: 30px;
            font-size: 16px;
            font-family: 'Roboto';
        }

        #instructions {
            width: 100%;
            height: 100%;

            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;

            text-align: center;
            font-size: 14px;
            cursor: pointer;
        }

        canvas {
            position: relative
        }

        #myChart {
            width: 100%;
            height: 100%;
        }

        .component {
            padding-left: 0;
            padding-right: 0;
            padding-top: 30px;
            padding-bottom: 5px;
        }

        .btn-primary,
        .btn-primary:hover,
        .btn-primary:active,
        .btn-primary:visited {
            background-color: #6333DB !important;
        }

        .btn-primary:hover {
            background-color: #542bba !important;
        }


        h1,
        h3 {
            color: #6333DB
        }

        .textBox {
            border: none;
            margin-top: 10px;
            padding: 5px;
            width: 100%;
            overflow: scroll;
            overflow-x: hidden;
            background-color: #fafafa;
            word-wrap: break-word;
        }

        .textBox::-webkit-scrollbar {
            width: 14px;
            height: 14px;
        }

        .textBox::-webkit-scrollbar-track {
            border: 1px solid #6333DB;
            border-radius: 10px;
        }

        .textBox::-webkit-scrollbar-thumb {
            background: #6333DB;
            border-radius: 10px;
        }

        .textBox::-webkit-scrollbar-thumb:hover {
            background: #6333DB;
        }

        .slidecontainer {
            width: 175px;
            padding-top: 10px;
        }

        .button {
            background-color: white;
            border: none;
            color: white;
            text-align: center;
            text-decoration: none;
            font-size: 14px;
            transition-duration: 0.2s;
            cursor: pointer;
            border-radius: 2px;
        }

        .button1 {
            background-color: WhiteSmoke;
            color: black;
            border: 2px solid WhiteSmoke;
        }

        .button1:hover {
            background-color: #6333DB;
            color: white;
            border: 2px solid #6333DB;
        }

        .element_info {
            position: absolute;
            display: block;
            z-index: 99;
            padding-top: 10px;
            padding-left: 10px;
            color: yellow;
            font-size: 14px;
        }

        .nav-pills {
            background-color: white;
            padding-top: 2px;
            padding-bottom: 2px;
            font: 14;
        }

        .nav-pills>li>a {
            border: medium none;
            background-color: WhiteSmoke;
            color: black;
            border-radius: 10px;
        }

        .nav-pills>li.active>a {
            background-color: #6333DB !important;
            border: medium none;
            border-radius: 10px;
        }

        .nav-pills>li>a:hover {
            background-color: #6333DB !important;
            border: medium none;
            border-radius: 10px;
            color: #fff;
        }
    </style>
</head>

<body>
    <script src="https://cdn.jsdelivr.net/npm/d3-color@3"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3-interpolate@3"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3-scale-chromatic@3"></script>

    <h1 id='app_title'>Zetane Visualizer: Numpy</h1>
    <script>
        function updateSlider(slideAmount) {
            var sliderDiv = document.getElementById("sliderAmount");
            sliderDiv.innerHTML = slideAmount;
        }
    </script>

    <ul class="nav nav-pills" style="margin-bottom: 5px;">
        <li class="active"><a data-toggle="pill" href="#home">3D</a></li>
        <li><a data-toggle="pill" href="#menu1">String</a></li>
        <li><a data-toggle="pill" href="#menu2">Distribution</a></li>
    </ul>

    <div id="dashboard" class="row" style="display: none">
        <div id="views" class="col-md-10" style="margin-bottom: 20px;">
            <div class="tab-content" style="margin-top: 10px;margin-left: 20px">

                <div id="home" class="tab-pane fade in active">
                    <div id="element_info" class="element_info"></div>
                    <div id="canvas_three"></div>
                    <button id="shot" class="button button1" style="margin-top:3px;">Screenshot</button>
                </div>

                <div id="menu1" class="tab-pane fade">
                    <div id="numpy_array_string" class="textBox"
                        style="height:calc(100vh - 210px);width:calc(100% - 40px);"></div>
                </div>

                <div id="menu2" class="tab-pane fade">
                    <div id="cont" class="row">
                        <div style="height:calc(100vh - 210px);width:calc(100% - 40px);">
                            <canvas id="myChart"></canvas>
                            <img src="https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/turbo.png"
                                alt="Turbo" style="float: right;" width="97%" height="20px">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="numpy_stats" class="col-md-2">
            <h3>Information</h3>
            <div class="row" style="margin-top: 10px;margin-left: 5px;">

                <div id="response-container"><b>Shape</b>: [ ] <br /><b>Direction</b>: [ ] <br /><b>Number of
                        Elements</b>: </div>
            </div>
            <h3>Tools</h3>
            <div class="row" style="margin-top: 5px;margin-left: 5px;">
                <label for="myRange">Spacing</label></br>
                <input type="range" id="myRange" min="0" max="2" step="0.01" value="0.5"
                    style="accent-color: #6333DB;width: 150px;display: inline-block;" oninput="updateValue()"
                    onchange="handleRelease()">
                &nbsp;<span id="sliderValue" style="display: inline-block;">0.5</span>
            </div>
            <!-- Reshape button disabled -->
            <div class="row" style="margin-top: 10px;margin-left: 5px;display: none;">
                <label for="name_input">Reshape</label><br />
                <input id="name_input" size="13" placeholder="[ , ,..., ]" />
                <button type="button" class="button button1" onClick="reshape()">Reshape</button>
            </div>
        </div>
    </div>

    <!-- GLB Button Disabled -->
    <button type="button" class="btn btn-primary btn-sm" style="padding: 5px;display: none;"
        onclick="importData()">Import
        GLB</button>
    <button type="button" class="btn btn-primary btn-sm" id="heavy-stuff-btn" style="padding: 5px;display: none"
        onClick="call_python_numpy()">Numpy</button>

    <script>
        window.addEventListener('pywebviewready', function () {
            call_python_numpy();
        })

        window.showResponse = showResponse;
        window.showNumpyStats = showNumpyStats;
        window.showShape = showShape;

        function showResponse(response) {
            var container = document.getElementById('numpy_array_string')
            container.innerText = response.numpy_print
        }

        function showShape(shape) {
            var container = document.getElementById('response-container')
            let xyx_view = ['x'];
            for (let i = 0; i < shape.length - 1; i++) {
                if (xyx_view[i] == 'x') {
                    xyx_view[i + 1] = 'y'
                } else if (xyx_view[i] == 'y') {
                    xyx_view[i + 1] = 'z'
                } else if (xyx_view[i] == 'z') {
                    xyx_view[i + 1] = 'x'
                }
            }
            let array_view = xyx_view;
            container.innerHTML = '<b>Shape</b>: [' + shape + '] <br/>' + '<b>Direction</b>: [' + array_view.reverse() + '] <br/>' + '<b>Number of Elements</b>: ' + String(window.array_product(shape, 0, shape.length));
            container.style.display = 'block';
        }

        // function initialize() {
        //     pywebview.api.init().then(showResponse)
        // }

        // function call_python_numpy() {
        //     showNumpyStats();
        //     var btn = document.getElementById('heavy-stuff-btn')
        //     pywebview.api.call_python_numpy().then(function (response) {
        //         showResponse(response)
        //         showShape(response.shape)
        //         btn.onclick = call_python_numpy
        //         btn.innerText = 'Numpy'
        //         let incoming = response.message;
        //         window.init(response.message, response.shape)
        //     })
        //     showResponse({ message: 'Working...' })
        //     btn.innerText = '  Cancel   '
        //     btn.onclick = cancel_call
        //     window.active_object = 'numpy'
        // }

        // function reshape() {
        //     window.init(window.incoming, JSON.parse(document.getElementById('name_input').value))
        // }

        // function call_python_text() {
        //     var name_input = document.getElementById('name_input').value;
        //     pywebview.api.send_text_to_python(name_input).then(showResponse)
        // }

        // function cancel_call() {
        //     pywebview.api.cancel_call()
        // }

        function importData() {
            hideNumpyStats();
            let input = document.createElement('input');
            input.type = 'file';
            input.onchange = _ => {
                let files = Array.from(input.files);
                window.var = files
                window.init(window.incoming, window.shape);
            };
            input.click();
            window.active_object = '3d-glb';
        }

        function showNumpyStats() {
            var x = document.getElementById("numpy_stats");
            x.style.display = "block";
        }

        function hideNumpyStats() {
            var x = document.getElementById("numpy_stats");
            x.style.display = "none";
        }

        function updateValue() {
            var slider = document.getElementById("myRange");
            var output = document.getElementById("sliderValue");
            output.innerHTML = slider.value;
        }

        function handleRelease() {
            var slider = document.getElementById("myRange");
            window.spacing_factor = slider.value;
            console.log(window.spacing_factor)
            window.init(window.incoming, window.shape);
        }
    </script>



    <script type="module">
        import * as THREE from "three";
        import Stats from "https://cdn.skypack.dev/three@0.138.0/examples/jsm/libs/stats.module";
        import GUI from "https://cdn.skypack.dev/dat.gui";
        import { OrbitControls } from "https://cdn.skypack.dev/three@0.138.0/examples/jsm/controls/OrbitControls";
        import { TextGeometry } from "https://cdn.skypack.dev/three@0.138.0/examples/jsm/geometries/TextGeometry";
        import { FontLoader } from "https://cdn.skypack.dev/three@0.138.0/examples/jsm/loaders/FontLoader";
        import { GLTFLoader } from "https://cdn.skypack.dev/three@0.138.0/examples/jsm/loaders/GLTFLoader";

        let renderer, scene, camera, raycaster, controls, stats, mouse, hover_text, myChart;
        let dot, dotGeometry, intersects_point;
        let last_color = [0, 0, 0];
        let first_buffer_color = [0, 0, 0]
        let currentIntersection = null;
        let INTERSECTED;
        let buffer_infos = [];

        const size_cst = 2;
        window.spacing_factor = 0.3;

        const window_width_factor = 0.75;
        const window_height_factor = 0.75;

        scene = new THREE.Scene();
        hover_text = new THREE.Group();
        raycaster = new THREE.Raycaster();
        raycaster.params.Points.threshold = size_cst * 0.5;
        mouse = new THREE.Vector2();
        stats = Stats();

        camera = new THREE.PerspectiveCamera(
            75,
            (window_width_factor * window.innerWidth) / (window_height_factor * window.innerHeight),
            0.1,
            10000
        );

        camera.position.z = 40;
        camera.position.x = -5;

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window_width_factor * window.innerWidth, window_height_factor * window.innerHeight);
        renderer.outputEncoding = THREE.sRGBEncoding;

        const div = document.getElementById('canvas_three');
        div.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;   //damping 
        controls.dampingFactor = 0.25;   //damping inertia
        controls.enableZoom = true;      //Zooming
        controls.autoRotate = false;       // enable rotation
        controls.maxPolarAngle = Math.PI; // Limit angle of visibility

        document.getElementById("shot").addEventListener('click', takeScreenshot);

        window.addEventListener('mousemove', onPointerMove);

        window.addEventListener(
            "resize",
            () => {
                let cont = document.getElementById('views');
                camera.aspect = (cont.clientWidth - 40) / (window.innerHeight - 210);
                camera.updateProjectionMatrix();
                renderer.setSize((cont.clientWidth - 40), window.innerHeight - 210);
                render();
            },
            false
        );

        const my_numpy = $numpy_data;
        const my_shape = $numpy_shape;

        if (my_numpy && my_numpy.length > 0) {
            window.active_object = 'numpy';
            document.getElementById('app_title').innerHTML = 'Zetane Visualizer: Numpy';
            var container = document.getElementById('response-container')
            let xyx_view = ['x'];
            for (let i = 0; i < my_shape.length - 1; i++) {
                if (xyx_view[i] == 'x') {
                    xyx_view[i + 1] = 'y'
                } else if (xyx_view[i] == 'y') {
                    xyx_view[i + 1] = 'z'
                } else if (xyx_view[i] == 'z') {
                    xyx_view[i + 1] = 'x'
                }
            }
            let array_view = xyx_view;
            container.innerHTML = '<b>Shape</b>: [' + my_shape + '] <br/>' + '<b>Direction</b>: [' + array_view.reverse() + '] <br/>' + '<b>Number of Elements</b>: ' + String(array_product(my_shape, 0, my_shape.length));
            container.style.display = 'block';
            window.showNumpyStats();

            var container = document.getElementById('numpy_array_string')
            let jupyter_array_to_print = nj.array(my_numpy).reshape(my_shape)
            let clean_array_to_print = String(jupyter_array_to_print).replace('array(','').replace(')','').replaceAll(']],',']],');
            container.innerText = clean_array_to_print;

            init(my_numpy, my_shape);
        }

        window.init = init;
        showDashboard();

        let cont = document.getElementById('views');
        camera.aspect = (cont.clientWidth - 40) / (window.innerHeight - 210);
        camera.updateProjectionMatrix();
        renderer.setSize((cont.clientWidth - 40), window.innerHeight - 210);

        function init(numpy_array, shape_incoming) {
            var spacing_factor = window.spacing_factor;
            while (scene.children.length > 0) {
                scene.remove(scene.children[0]);
            }

            var clock = new THREE.Clock();
            var incoming = [];
            var shape = []

            if (numpy_array && numpy_array.length > 0) {
                incoming = numpy_array;
                shape = shape_incoming;
            }
            if (my_numpy.length != 0) {
                incoming = my_numpy;
                shape = my_shape;
            }

            // Default Lights
            //   Ambient light
            var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);

            //   Directional light
            var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
            directionalLight.position.set(0, 10, 0);
            scene.add(directionalLight);

            //   Point light
            var pointLight = new THREE.PointLight(0xffffff, 0.3);
            pointLight.position.set(0, 5, 10);
            scene.add(pointLight);

            //   Spot light
            var spotLight = new THREE.SpotLight(0xffffff, 0.2);
            spotLight.position.set(10, 10, 10);
            spotLight.angle = Math.PI / 6;
            spotLight.penumbra = 0.1;
            spotLight.decay = 2;
            spotLight.distance = 30;
            scene.add(spotLight);

            //    Hemispheric light
            var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
            hemiLight.color.setHSL(0.6, 1, 0.6);
            hemiLight.groundColor.setHSL(0.095, 1, 0.75);
            hemiLight.position.set(0, 50, 0);
            scene.add(hemiLight);

            // Axis Arrows
            var arrowPos = new THREE.Vector3(0, 0, 0);
            scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), arrowPos, 1, 0xFF0000));
            scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), arrowPos, 1, 0x00FF00));
            scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), arrowPos, 1, 0x0000FF));

            // View GLB
            if (window.var && window.active_object == '3d-glb') {
                document.getElementById('app_title').innerHTML = 'Zetane Visualizer: 3D GLB';
                var objectURL = URL.createObjectURL(window.var[0]);
                const loader = new GLTFLoader();
                loader.load(objectURL,
                    function (gltf) {
                        let new_model = gltf.scene;
                        new_model.scale.set(1.2, 1.2, 1.2);
                        scene.add(new_model);

                        // Animation
                        var mixer = new THREE.AnimationMixer(gltf.scene);

                        //   Get the animation clips
                        var animations = gltf.animations;

                        for (var i = 0; i < animations.length; i++) {
                            var animation = animations[i];
                        }

                        //   Create an action for each clip
                        for (var i = 0; i < animations.length; i++) {
                            var animation = animations[i];
                            mixer.clipAction(animation).play();
                        }

                        //   Update the animation mixer on each frame
                        function animate() {
                            requestAnimationFrame(animate);
                            mixer.update(clock.getDelta());
                            renderer.render(scene, camera);
                        }
                        animate();
                    }, undefined,
                    function (error) {
                        console.error(error);
                    }
                );
            } else if (window.active_object == 'numpy') {
                const geometry = new THREE.PlaneGeometry(size_cst, size_cst);

                AddHistogram(incoming);

                var positions = []
                const dims_product = array_product(shape, 0, shape.length);
                const shape_reversed = [...shape].reverse();

                for (let i = 0; i < incoming.length; i++) {
                    let array_to_push = []
                    for (let j = 0; j < shape_reversed.length; j++) {
                        let remainder = i % (array_product(shape_reversed, 0, j + 1));
                        let component = Math.floor(remainder / array_product(shape_reversed, 0, j));
                        array_to_push.push(component);
                    }
                    positions.push(array_to_push);
                }

                var xyx_view = ['x'];
                for (let i = 0; i < shape.length - 1; i++) {
                    if (xyx_view[i] == 'x') {
                        xyx_view[i + 1] = 'y'
                    } else if (xyx_view[i] == 'y') {
                        xyx_view[i + 1] = 'z'
                    } else if (xyx_view[i] == 'z') {
                        xyx_view[i + 1] = 'x'
                    }
                }
                // var array_view = xyx_view.reverse();
                var array_view = xyx_view;

                var max = getMax(incoming);
                var min = getMin(incoming);

                var buffer_positions = [];
                var buffer_colors = [];


                for (let i = 0; i < incoming.length; i++) {
                    var material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, wireframe: false });
                    let colormap = d3.interpolateTurbo((incoming[i] - min) / (max - min));
                    let rgb = colormap;
                    var color3 = new THREE.Color(rgb);

                    var pos_x = 0;
                    var pos_y = 0;
                    var pos_z = 0;
                    var x_count = 0;
                    var y_count = 0;
                    var z_count = 0;

                    for (let j = 0; j < shape.length; j++) {
                        if (array_view[j] == 'x') {
                            pos_x += size_cst * positions[i][j] * (1 + x_count + (spacing_factor) * j);
                            x_count = (shape_reversed[j]) * (x_count + 1 + (spacing_factor) * j) - 1;
                        } else if (array_view[j] == 'y') {
                            pos_y -= size_cst * positions[i][j] * (1 + y_count + (spacing_factor) * j);
                            y_count = (shape_reversed[j]) * (y_count + 1 + (spacing_factor) * j) - 1;
                        } else if (array_view[j] == 'z') {
                            pos_z -= size_cst * positions[i][j] * (1 + z_count + (spacing_factor) * j);
                            z_count = (shape_reversed[j]) * (z_count + 1 + (spacing_factor) * j) - 1;
                        }
                    }

                    buffer_positions.push(pos_x, pos_y, pos_z);
                    buffer_colors.push(color3.r, color3.g, color3.b);
                    buffer_infos.push('Index: [' + String(positions[i].reverse()) + ']' + ' Value:'+ ' ' + String(incoming[i]));
                }

                dotGeometry = new THREE.BufferGeometry();
                dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer_positions), 3));
                dotGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(buffer_colors), 3));

                var dotMaterial = new THREE.PointsMaterial({
                    size: size_cst * 1.3,
                    vertexColors: THREE.VertexColors,
                });

                dot = new THREE.Points(dotGeometry, dotMaterial);
                scene.add(dot);

                const g = dot.geometry;
                const attributes = g.attributes;
                first_buffer_color = [attributes.color.array[0], attributes.color.array[1], attributes.color.array[2]];
                // To fix the color update bug on the first element of the buffer
                attributes.color.array[0] = first_buffer_color[0];
                attributes.color.array[1] = first_buffer_color[1];
                attributes.color.array[2] = first_buffer_color[2];

                window.incoming = incoming;
                window.shape = shape;
            }
        }

        function onPointerMove(event) {
            const { top, left, width, height } = renderer.domElement.getBoundingClientRect();
            mouse.x = -1 + 2 * (event.clientX - left) / width;
            mouse.y = 1 - 2 * (event.clientY - top) / height;
        }

        function takeScreenshot() {
            renderer.render(scene, camera);
            renderer.domElement.toBlob(function (blob) {
                var a = document.createElement('a');
                var url = URL.createObjectURL(blob);
                a.href = url;
                a.download = 'numpy_3D_viz.png';
                a.click();
            }, 'image/png', 1.0);
        }

        var animate = function () {
            requestAnimationFrame(animate);
            controls.update();
            render();
            stats.update();
        };

        function render() {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(dot);
            const hightlight_r = 0.8;
            const hightlight_g = 0.8;
            const hightlight_b = 0;

            const g = dot.geometry;
            const attributes = g.attributes;

            first_buffer_color = [attributes.color.array[0], attributes.color.array[1], attributes.color.array[2]];

            if (intersects.length > 0) {

                if (INTERSECTED != intersects[0].index) {
                    attributes.color.array[INTERSECTED * 3] = last_color[0];
                    attributes.color.array[INTERSECTED * 3 + 1] = last_color[1];
                    attributes.color.array[INTERSECTED * 3 + 2] = last_color[2];

                    // To fix the color update bug on the first element of the buffer
                    if (INTERSECTED != 0) {
                        attributes.color.array[0] = first_buffer_color[0];
                        attributes.color.array[1] = first_buffer_color[1];
                        attributes.color.array[2] = first_buffer_color[2];
                    }

                    INTERSECTED = intersects[0].index;

                    last_color = [attributes.color.array[INTERSECTED * 3], attributes.color.array[INTERSECTED * 3 + 1], attributes.color.array[INTERSECTED * 3 + 2]]

                    attributes.color.array[INTERSECTED * 3] = hightlight_r;
                    attributes.color.array[INTERSECTED * 3 + 1] = hightlight_g;
                    attributes.color.array[INTERSECTED * 3 + 2] = hightlight_b;

                    attributes.color.needsUpdate = true;
                    var container = document.getElementById('element_info')
                    container.innerText = buffer_infos[INTERSECTED];
                }
            } else if (INTERSECTED !== null) {

                attributes.color.array[INTERSECTED * 3] = last_color[0];
                attributes.color.array[INTERSECTED * 3 + 1] = last_color[1];
                attributes.color.array[INTERSECTED * 3 + 2] = last_color[2];

                attributes.color.needsUpdate = true;
                INTERSECTED = null;
            }

            renderer.render(scene, camera);
        }

        function array_product(shape, begin, end) {
            let prod = 1;
            for (let i = begin; i < end; i++) {
                prod = prod * shape[i];
            }
            return prod;
        }

        function insertText(text, x, y, z) {
            const loader = new FontLoader();
            loader.load("https://cdn.skypack.dev/three@0.138.0/examples/fonts/helvetiker_regular.typeface.json",
                function (font) {
                    const geometrytxt = new TextGeometry(text, {
                        font: font,
                        size: 0.08,
                        height: 0.005,
                        curveSegments: 12,
                        bevelEnabled: false,
                        bevelThickness: 0.01,
                        bevelSize: 0.01,
                        bevelSegments: 0.01
                    });
                    const textMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
                    const mesh = new THREE.Mesh(geometrytxt, textMaterial);
                    mesh.position.set(x, y, z);
                    hover_text.add(mesh);
                }
            );
        }

        function generateRandomArray(length) {
            var output = [];
            for (var i = 0; i < length; i++) {
                output.push(Math.floor(Math.random() * 100));
            }
            return output;
        }

        function getMax(arr) {
            let len = arr.length;
            let max = -Infinity;
            for (let i = 0; i < len; i++) {
                if (arr[i] > max) {
                    max = arr[i];
                }
            }
            return max;
        }

        function getMin(arr) {
            let len = arr.length;
            let min = Infinity;
            for (let i = 0; i < len; i++) {
                if (arr[i] < min) {
                    min = arr[i];
                }
            }
            return min;
        }

        function showDashboard() {
            var x = document.getElementById("dashboard");
            x.style.display = "block";
        }

        function hideDashboard() {
            var x = document.getElementById("dashboard");
            x.style.display = "none";
        }
        function AddHistogram(input_array) {
            var inputArray = input_array;
            var binCount = 20;

            var max2 = getMax(inputArray);
            var min2 = getMin(inputArray);

            var histogram_pairs = histogram_data(inputArray, binCount, min2, max2);

            if (myChart) {
                myChart.destroy();
            }

            var ctx = document.getElementById('myChart');
            const gradient = ctx.getContext('2d').createLinearGradient(0, 300, 0, 0);
            gradient.addColorStop(0, '#6334DC');
            gradient.addColorStop(0.5, '#A3397D');
            gradient.addColorStop(1, '#CC4046');
            var inputLabels = histogram_pairs.map(function (el) {
                return String(el.minNum.toFixed(2)) + ' - ' + String(el.maxNum.toFixed(2));
            });
            var inputFrequencies = histogram_pairs.map(function (el) {
                return el.count;
            });

            myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: inputLabels,
                    datasets: [{
                        label: 'Numpy values per interval',
                        data: inputFrequencies,
                        backgroundColor: gradient,
                        borderColor: 'rgba(0, 0, 0, 0)',
                        borderWidth: 1,
                        hoverBackgroundColor: 'rgba(99, 52, 220, 0.8)',
                        hoverBorderColor: 'rgba(255, 255, 0, 0.8)',
                        hoverBorderWidth: '1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                },
            });
        }

        function histogram_data(data, binCount, min2, max2) {
            var binSize = Math.abs((max2 - min2) / binCount);
            var bins = [];

            for (var i = 0; i < binCount; i++) {
                bins.push({
                    binNum: i,
                    minNum: min2 + binSize * i,
                    maxNum: min2 + binSize * (i + 1),
                    count: 0
                })
            }

            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                for (var j = 0; j < bins.length; j++) {
                    var bin = bins[j];
                    if (item >= bin.minNum && item < bin.maxNum) {
                        bin.count++;
                        break;
                    }
                }
            }
            return bins;
        }
        window.array_product = array_product;
        animate();
    </script>
</body>

</html>
    """
    )

    # Generate a UUID
    unique_id = str(uuid.uuid4())

    html_path = f"views/viz_{unique_id}.html"
    html_code = html_template.substitute(numpy_data=numpy_list, numpy_shape=shape_list)

    # Write the file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"viz_{unique_id}.html"}


def test():
    """Test the compute function."""

    print("Running test")
