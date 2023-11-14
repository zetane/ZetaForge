
function loadFiles(fileUrls) {
// Function to load a single file using XMLHttpRequest
function loadFile(url) {
    return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "text"; // Set response type to text for JSON files

    xhr.onload = () => {
        if (xhr.status === 200) {
        try {
            const jsonData = JSON.parse(xhr.response); // Parse the text response as JSON
            resolve(jsonData);
        } catch (error) {
            reject(new Error(`Failed to parse JSON from file: ${url}. Error: ${error.message}`));
        }
        } else {
        reject(new Error(`Failed to load file: ${url}. Status: ${xhr.status}`));
        }
    };

    xhr.onerror = () => {
        reject(new Error(`Network error while loading file: ${url}`));
    };

    xhr.send();
    });
}

// Load all files and return a promise that resolves with an array of file data
return Promise.all(fileUrls.map(loadFile));
}


function generateDiv(items) {
let container = document.getElementById('side_library');

Object.entries(items).forEach(([dataNode, item]) => {
    let div = document.createElement('div');
    div.className = 'drag-drawflow';
    div.setAttribute('draggable', 'true');
    div.setAttribute('ondragstart', 'drag(event)');
    div.setAttribute('data-node', dataNode);

    let i = document.createElement('i');
    // i.className = 'fa ' + item.icon;
    i.className = 'fa ' + 'fa-rocket';

    let span = document.createElement('span');
    span.textContent = ' ' + item.block.information.name;

    div.appendChild(i);
    div.appendChild(span);
    container.appendChild(div);
});

return container;
}

// const path = require('path');


const filesToLoad = [
"blocks/new_python/specs.json", "blocks/minimal/specs.json",
"blocks/string/specs.json", "blocks/integer/specs.json", "blocks/text/specs.json", "blocks/string_list/specs.json", 
"blocks/canny_edge/specs.json", "blocks/training_iris/specs.json", "blocks/gpt-turbo/specs.json",
"blocks/view_numpy/specs.json", "blocks/view_images/specs.json", "blocks/view_threejs/specs.json", "blocks/view_two_columns/specs.json"
];

// TO REPAIR
// "blocks/block_view_inference/specs.json", "blocks/block_js_view/specs.json", 
// TO BRING BACK
// "blocks/block_email/specs.json",

let jsonDataArrayGlobal = []; 
var block_library = {} 

loadFiles(filesToLoad)
.then((fileDataArray) => {
    fileDataArray.map((e)=>{
    block_library[e.block.information.id]= e;    
    });
    generateDiv(block_library);
})
.catch((error) => {
    console.error("Error loading files:", error);
});


// Events!
editor.on('nodeCreated', function(id) {
console.log("Node created " + id);
})

editor.on('nodeRemoved', function(id) {
console.log("Node removed " + id);
})

editor.on('nodeSelected', function(id) {
console.log("Node selected " + id);
})

editor.on('moduleCreated', function(name) {
console.log("Module Created " + name);
})

editor.on('moduleChanged', function(name) {
console.log("Module Changed " + name);
})

editor.on('connectionCreated', function(connection) {
console.log('Connection created');
console.log(connection);
})

editor.on('connectionRemoved', function(connection) {
console.log('Connection removed');
console.log(connection);
})
/*
editor.on('mouseMove', function(position) {
console.log('Position mouse x:' + position.x + ' y:'+ position.y);
})
*/
editor.on('nodeMoved', function(id) {
console.log("Node moved " + id);
})

editor.on('zoom', function(zoom) {
console.log('Zoom level ' + zoom);
})

editor.on('translate', function(position) {
console.log('Translate x:' + position.x + ' y:'+ position.y);
})

editor.on('addReroute', function(id) {
console.log("Reroute added " + id);
})

editor.on('removeReroute', function(id) {
console.log("Reroute removed " + id);
})