export const drawConnection = (node, editor, drawflowCanvas) => {
    const connection = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    editor.connection_ele = connection;
    const path = document.createElementNS('http://www.w3.org/2000/svg', "path");
    path.classList.add("main-path");
    path.setAttributeNS(null, 'd', '');
    connection.classList.add("connection");
    connection.appendChild(path);
    drawflowCanvas.appendChild(connection);
    const id_output = node.parentElement.parentElement.id.slice(5);
    const output_class = node.classList[1];
    editor.dispatch('connectionStart', { output_id: id_output, output_class: output_class });
}

export const updateConnection = (eX, eY, editor, drawflowCanvas) => {
    const precanvas = drawflowCanvas;
    const zoom = editor.zoom;
    let precanvasWitdhZoom = precanvas.clientWidth / (precanvas.clientWidth * zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;
    var path = editor.connection_ele.children[0];

    var line_x = editor.ele_selected.offsetWidth / 2 + (editor.ele_selected.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
    var line_y = editor.ele_selected.offsetHeight / 2 + (editor.ele_selected.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

    var x = eX * (precanvas.clientWidth / (precanvas.clientWidth * editor.zoom)) - (precanvas.getBoundingClientRect().x * (precanvas.clientWidth / (precanvas.clientWidth * editor.zoom)));
    var y = eY * (precanvas.clientHeight / (precanvas.clientHeight * editor.zoom)) - (precanvas.getBoundingClientRect().y * (precanvas.clientHeight / (precanvas.clientHeight * editor.zoom)));

    var curvature = editor.curvature;
    var lineCurve = editor.createCurvature(line_x, line_y, x, y, curvature, 'openclose');
    path.setAttributeNS(null, 'd', lineCurve);
}

export const addConnection = (id_output, id_input, output_class, input_class, pipelineData, drawflowCanvas, editor) => {
  // if (drawflowCanvas.querySelectorAll('.connection.node_in_node-' + id_input + '.node_out_node-' + id_output + '.' + output_class + '.' + input_class).length !== 0) {
  //   console.log("it exists, return")
  //   return;
  // }

    
      // let exist = false;
      // for (const checkOutput in pipelineData[id_output].outputs[output_class].connections) {
      //     const connectionSearch = pipelineData[id_output].outputs[output_class].connections[checkOutput]
      //     if (connectionSearch.block == id_input && connectionSearch.variable == input_class) {
      //       exist = true;
      //     }
      // }
      //   for (const checkOutput in dataNode.outputs[output_class].connections) {
      //     const connectionSearch = dataNode.outputs[output_class].connections[checkOutput]
      //     if (connectionSearch.node == id_input && connectionSearch.output == input_class) {
      //       exist = true;
      //     }
      //   }
        // Check connection exist
      // if (exist === false) {
        //Create Connection
        // this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].connections.push({ "node": id_input.toString(), "output": input_class });
        // this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[input_class].connections.push({ "node": id_output.toString(), "input": output_class });

        // if (this.module === nodeOneModule) {
          //Draw connection
          
          const connection = document.createElementNS('http://www.w3.org/2000/svg', "svg");
          const path = document.createElementNS('http://www.w3.org/2000/svg', "path");
          path.classList.add("main-path");
          path.setAttributeNS(null, 'd', '');
          // path.innerHTML = 'a';
          connection.classList.add("connection");
          connection.classList.add("node_in_node-" + id_input);
          connection.classList.add("node_out_node-" + id_output);
          connection.classList.add(output_class);
          connection.classList.add(input_class);
          connection.appendChild(path);
          drawflowCanvas.appendChild(connection);
          editor.updateConnectionNodes('node-' + id_output);
          editor.updateConnectionNodes('node-' + id_input);
      // }
    editor.dispatch('connectionCreated', { output_id: id_output, input_id: id_input, output_class: output_class, input_class: input_class });
  } 
// }

// export const displayConnections = (pipelineData, drawflowCanvas) => {

// }

export const removeConnection = () => {

}