const exports = {};

exports.pipeline = null;
exports.setPipeline = null;
exports.connection_list = {};
exports.updateConnectionList = null;
exports.pointData = {};

exports.container = null;
exports.precanvas = null;
exports.nodeId = 1;
exports.ele_selected = null;
exports.node_selected = null;
exports.drag = false;
exports.reroute = false;
exports.reroute_fix_curvature = false;
exports.curvature = 0.5;
exports.reroute_curvature_start_end = 0.5;
exports.reroute_curvature = 0.5;
exports.reroute_width = 6;
exports.drag_point = false;
exports.editor_selected = false;
exports.connection = false;
exports.connection_ele = null;
exports.connection_selected = null;
exports.canvas_x = 0;
exports.canvas_y = 0;
exports.pos_x = 0;
exports.pos_x_start = 0;
exports.pos_y = 0;
exports.pos_y_start = 0;
exports.mouse_x = 0;
exports.mouse_y = 0;
exports.line_path = 5;
exports.first_click = null;
exports.force_first_input = false;
exports.draggable_inputs = true;
exports.useuuid = false;
exports.parent = null;

exports.noderegister = {};
exports.render = null;
exports.drawflow = {"drawflow": {"Home": {"data": {}} } };
// Configurable options
exports.module = 'Home';
exports.editor_mode = 'edit';
exports.zoom = 1;
exports.zoom_max = 5.6;
exports.zoom_min = 0.15;
exports.zoom_value = 0.03;
exports.zoom_last_value = 1;

// Mobile
exports.evCache = new Array();
exports.prevDiff = -1;

exports.removeNodeSubscribers = [];

exports.drawConnection = (node) => {
    const connection = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    exports.connection_ele = connection;
    const path = document.createElementNS('http://www.w3.org/2000/svg', "path");
    path.classList.add("main-path");
    path.setAttributeNS(null, 'd', '');
    connection.classList.add("connection");
    connection.appendChild(path);
    exports.precanvas.appendChild(connection);
    // const id_output = node.parentElement.parentElement.id.slice(5);
    // const output_class = node.classList[1];
}

exports.updateConnection = (eX, eY, editor, drawflowCanvas) => {
  const precanvas = exports.precanvas;
  const zoom = exports.zoom;
  let precanvasWitdhZoom = precanvas.clientWidth / (precanvas.clientWidth * zoom);
  precanvasWitdhZoom = precanvasWitdhZoom || 0;
  let precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * zoom);
  precanvasHeightZoom = precanvasHeightZoom || 0;
  var path = exports.connection_ele.children[0];

  var line_x = exports.ele_selected.offsetWidth / 2 + (exports.ele_selected.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
  var line_y = exports.ele_selected.offsetHeight / 2 + (exports.ele_selected.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

  var x = eX * (precanvas.clientWidth / (precanvas.clientWidth * exports.zoom)) - (precanvas.getBoundingClientRect().x * (precanvas.clientWidth / (precanvas.clientWidth * exports.zoom)));
  var y = eY * (precanvas.clientHeight / (precanvas.clientHeight * exports.zoom)) - (precanvas.getBoundingClientRect().y * (precanvas.clientHeight / (precanvas.clientHeight * exports.zoom)));

  var curvature = exports.curvature;
  var lineCurve = exports.createCurvature(line_x, line_y, x, y, curvature, 'openclose');
  path.setAttributeNS(null, 'd', lineCurve);
}

exports.addConnection = () => {
  for (let svg in exports.connection_list) {
    if (!exports.container.querySelector(svg)) {
      const connection = document.createElementNS('http://www.w3.org/2000/svg', "svg");
      connection.classList.add(...svg.split(".").filter(Boolean));

      if (exports.connection_list[svg].path) {
        for (const item of exports.connection_list[svg].path) {
          connection.appendChild(item);
        }
      } else {
        // redundant ?
        const path = document.createElementNS('http://www.w3.org/2000/svg', "path");
        path.classList.add("main-path");
        path.setAttributeNS(null, 'd', '');
        connection.appendChild(path);
        exports.updateConnectionList((draft) => {
          draft[svg].path = [path];
        })
      }
      exports.precanvas.appendChild(connection);
      exports.updateConnectionNodes('node-' + exports.connection_list[svg].output_id);
      exports.updateConnectionNodes('node-' + exports.connection_list[svg].input_id);
    }
  }
}

// EVENTS
exports.dblclick = (e) => {
  if (exports.connection_selected != null && exports.reroute) {
    exports.createReroutePoint(exports.connection_selected);
  }

  if (e.target.classList[0] === 'point') {
    exports.removeReroutePoint(e.target);
  }
}

/* Mobile zoom */
exports.pointerdown_handler = (e) => {
  exports.evCache.push(e);
}

exports.pointermove_handler = (e) => {
  for (var i = 0; i < exports.evCache.length; i++) {
    if (e.pointerId == exports.evCache[i].pointerId) {
      exports.evCache[i] = e;
      break;
    }
  }

  if (exports.evCache.length == 2) {
    // Calculate the distance between the two pointers
    var curDiff = Math.abs(exports.evCache[0].clientX - exports.evCache[1].clientX);

    if (exports.prevDiff > 100) {
      if (curDiff > exports.prevDiff) {
        // The distance between the two pointers has increased

        exports.zoom_in();
      }
      if (curDiff < exports.prevDiff) {
        // The distance between the two pointers has decreased
        exports.zoom_out();
      }
    }
    exports.prevDiff = curDiff;
  }
}

exports.pointerup_handler = (e) => {
  exports.remove_event(e);
  if (exports.evCache.length < 2) {
    exports.prevDiff = -1;
  }
}

exports.remove_event = (e) => {
  // Remove this event from the target's cache
  for (var i = 0; i < exports.evCache.length; i++) {
    if (exports.evCache[i].pointerId == e.pointerId) {
      exports.evCache.splice(i, 1);
      break;
    }
  }
}
/* End Mobile Zoom */

exports.click = (e) => {
  if (exports.editor_mode === 'fixed') {
    e.preventDefault();
    if (e.target.classList[0] === 'parent-drawflow' || e.target.classList[0] === 'drawflow') {
      exports.ele_selected = e.target.closest(".parent-drawflow");
    } else {
      return false;
    }
  } else if (exports.editor_mode === 'view') {
    if (e.target.closest(".drawflow") != null || e.target.matches('.parent-drawflow')) {
      exports.ele_selected = e.target.closest(".parent-drawflow");
      e.preventDefault();
    }
  } else {
    exports.first_click = e.target;
    exports.ele_selected = e.target;
    if (e.button === 0) {
      exports.contextmenuDel();
    }

    if (e.target.classList[0] == "input-element") {
      exports.ele_selected = e.target;
    } else if (e.target.classList[0] != "output" && e.target.closest(".drawflow-node") != null ) {
      exports.ele_selected = e.target.closest(".drawflow-node");
    }
  }

  switch (exports.ele_selected.classList[0]) {
    case 'drawflow-node':
      if (exports.node_selected != null) {
        exports.node_selected.classList.remove("selected");
        if (exports.node_selected != exports.ele_selected) {
        }
      }
      if (exports.connection_selected != null) {
        exports.connection_selected.classList.remove("selected");
        exports.removeReouteConnectionSelected();
        exports.connection_selected = null;
      }
      if (exports.node_selected != exports.ele_selected) {
      }
      exports.node_selected = exports.ele_selected;
      exports.node_selected.classList.add("selected");
      if (!exports.draggable_inputs) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT' && e.target.hasAttribute('contenteditable') !== true) {
          exports.drag = true;
        }
      } else {
        if (e.target.tagName !== 'SELECT') {
          exports.drag = true;
        }
      }
      break;
    case 'output':
      exports.connection = true;
      if (exports.node_selected != null) {
        exports.node_selected.classList.remove("selected");
        exports.node_selected = null;
      }
      if (exports.connection_selected != null) {
        exports.connection_selected.classList.remove("selected");
        exports.removeReouteConnectionSelected();
        exports.connection_selected = null;
      }
      exports.drawConnection(e.target);
      break;
    case 'parent-drawflow':
      if (exports.node_selected != null) {
        exports.node_selected.classList.remove("selected");
        exports.node_selected = null;
      }
      if (exports.connection_selected != null) {
        exports.connection_selected.classList.remove("selected");
        exports.removeReouteConnectionSelected();
        exports.connection_selected = null;
      }
      exports.editor_selected = true;
      break;
    case 'drawflow':
      if (exports.node_selected != null) {
        exports.node_selected.classList.remove("selected");
        exports.node_selected = null;
      }
      if (exports.connection_selected != null) {
        exports.connection_selected.classList.remove("selected");
        exports.removeReouteConnectionSelected();
        exports.connection_selected = null;
      }
      exports.editor_selected = true;
      break;
    case 'main-path':
      if (exports.node_selected != null) {
        exports.node_selected.classList.remove("selected");
        exports.node_selected = null;
      }
      if (exports.connection_selected != null) {
        exports.connection_selected.classList.remove("selected");
        exports.removeReouteConnectionSelected();
        exports.connection_selected = null;
      }
      exports.connection_selected = exports.ele_selected;
      exports.connection_selected.classList.add("selected");
      const listclassConnection = exports.connection_selected.parentElement.classList;
      if (listclassConnection.length > 1) {
        if (exports.reroute_fix_curvature) {
          exports.connection_selected.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
            item.classList.add("selected");
          });
        }
      }
      break;
    case 'point':
      exports.drag_point = true;
      exports.ele_selected.classList.add("selected");
      break;
    case 'drawflow-delete':
      if (exports.node_selected) {
        console.log("delete by removing block")
        exports.removeConnectionNodeId(exports.node_selected.id);
      }

      if (exports.connection_selected) {
        exports.removeConnection();
      }

      if (exports.node_selected != null) {
        exports.node_selected.classList.remove("selected");
        exports.node_selected = null;
      }
      if (exports.connection_selected != null) {
        exports.connection_selected.classList.remove("selected");
        exports.removeReouteConnectionSelected();
        exports.connection_selected = null;
      }

      break;
    default:
  }
  if (e.type === "touchstart") {
    exports.pos_x = e.touches[0].clientX;
    exports.pos_x_start = e.touches[0].clientX;
    exports.pos_y = e.touches[0].clientY;
    exports.pos_y_start = e.touches[0].clientY;
    exports.mouse_x = e.touches[0].clientX;
    exports.mouse_y = e.touches[0].clientY;
  } else {
    exports.pos_x = e.clientX;
    exports.pos_x_start = e.clientX;
    exports.pos_y = e.clientY;
    exports.pos_y_start = e.clientY;
  }
  if (['input', 'output', 'main-path'].includes(exports.ele_selected.classList[0])) {
    e.preventDefault();
  }
}

exports.position = (e) => {
  if (e.type === "touchmove") {
    var e_pos_x = e.touches[0].clientX;
    var e_pos_y = e.touches[0].clientY;
  } else {
    var e_pos_x = e.clientX;
    var e_pos_y = e.clientY;
  }


  if (exports.connection) {
    exports.updateConnection(e_pos_x, e_pos_y);
  }
  if (exports.editor_selected) {
    x = exports.canvas_x + (-(exports.pos_x - e_pos_x))
    y = exports.canvas_y + (-(exports.pos_y - e_pos_y))
    exports.precanvas.style.transform = "translate(" + x + "px, " + y + "px) scale(" + exports.zoom + ")";
    // exports.updatePosition((draft) => {
    //   console.log("from position change")
    //   draft.precanvasStyle = exports.precanvas.style.transform;
    // })  
  }
  if (exports.drag) {
    e.preventDefault();
    var x = (exports.pos_x - e_pos_x) * exports.precanvas.clientWidth / (exports.precanvas.clientWidth * exports.zoom);
    var y = (exports.pos_y - e_pos_y) * exports.precanvas.clientHeight / (exports.precanvas.clientHeight * exports.zoom);
    exports.pos_x = e_pos_x;
    exports.pos_y = e_pos_y;

    exports.ele_selected.style.top = (exports.ele_selected.offsetTop - y) + "px";
    exports.ele_selected.style.left = (exports.ele_selected.offsetLeft - x) + "px";

    exports.updateConnectionNodes(exports.ele_selected.id)
  }

  if (exports.drag_point) {

    var x = (exports.pos_x - e_pos_x) * exports.precanvas.clientWidth / (exports.precanvas.clientWidth * exports.zoom);
    var y = (exports.pos_y - e_pos_y) * exports.precanvas.clientHeight / (exports.precanvas.clientHeight * exports.zoom);
    exports.pos_x = e_pos_x;
    exports.pos_y = e_pos_y;

    var pos_x = exports.pos_x * (exports.precanvas.clientWidth / (exports.precanvas.clientWidth * exports.zoom)) - (exports.precanvas.getBoundingClientRect().x * (exports.precanvas.clientWidth / (exports.precanvas.clientWidth * exports.zoom)));
    var pos_y = exports.pos_y * (exports.precanvas.clientHeight / (exports.precanvas.clientHeight * exports.zoom)) - (exports.precanvas.getBoundingClientRect().y * (exports.precanvas.clientHeight / (exports.precanvas.clientHeight * exports.zoom)));

    exports.ele_selected.setAttributeNS(null, 'cx', pos_x);
    exports.ele_selected.setAttributeNS(null, 'cy', pos_y);

    const nodeUpdate = exports.ele_selected.parentElement.classList[2].slice(9);
    const nodeUpdateIn = exports.ele_selected.parentElement.classList[1].slice(13);
    const output_class = exports.ele_selected.parentElement.classList[3];
    const input_class = exports.ele_selected.parentElement.classList[4];

    let numberPointPosition = Array.from(exports.ele_selected.parentElement.children).indexOf(exports.ele_selected) - 1;

    if (exports.reroute_fix_curvature) {
      const numberMainPath = exports.ele_selected.parentElement.querySelectorAll(".main-path").length - 1;
      numberPointPosition -= numberMainPath;
      if (numberPointPosition < 0) {
        numberPointPosition = 0;
      }
    }

    const nodeId = nodeUpdate.slice(5);
    const searchConnection = exports.pipeline.data[nodeId].outputs[output_class].connections.findIndex(function (item, i) {
      return item.block === nodeUpdateIn && item.variable === input_class;
    });

    exports.pointData = {
      nodeId,
      output_class,
      searchConnection,
      numberPointPosition,
      pos_x,
      pos_y,
    };

    const parentSelected = exports.ele_selected.parentElement.classList[2].slice(9);
    exports.updateConnectionNodes(parentSelected);
  }

  if (e.type === "touchmove") {
    exports.mouse_x = e_pos_x;
    exports.mouse_y = e_pos_y;
  }
}

exports.dragEnd = (e) => {
  if (e.type === "touchend") {
    var e_pos_x = exports.mouse_x;
    var e_pos_y = exports.mouse_y;
    var ele_last = document.elementFromPoint(e_pos_x, e_pos_y);
  } else {
    var e_pos_x = e.clientX;
    var e_pos_y = e.clientY;
    var ele_last = e.target;
  }

  if (exports.drag) {
    if (exports.pos_x_start != e_pos_x || exports.pos_y_start != e_pos_y) {
    }
  }

  if (exports.drag_point) {
    exports.ele_selected.classList.remove("selected");
    if (exports.pos_x_start != e_pos_x || exports.pos_y_start != e_pos_y) {
    }
  }

  if (exports.editor_selected) {
    exports.canvas_x = exports.canvas_x + (-(exports.pos_x - e_pos_x));
    exports.canvas_y = exports.canvas_y + (-(exports.pos_y - e_pos_y));
    exports.editor_selected = false;
  }

  if (exports.connection === true) {
    if (ele_last.classList[0] === 'input' || (exports.force_first_input && (ele_last.closest(".drawflow_content_node") != null || ele_last.classList[0] === 'drawflow-node'))) {

      if (exports.force_first_input && (ele_last.closest(".drawflow_content_node") != null || ele_last.classList[0] === 'drawflow-node')) {
        if (ele_last.closest(".drawflow_content_node") != null) {
          var input_id = ele_last.closest(".drawflow_content_node").parentElement.id;
        } else {
          var input_id = ele_last.id;
        }
        if (Object.keys(exports.getNodeFromId(input_id.slice(5)).inputs).length === 0) {
          var input_class = false;
        } else {
          var input_class = "input_1";
        }
      } else {
        // Fix connection;
        var input_id = ele_last.closest('.drawflow-node').id;
        var input_class = ele_last.classList[1];
      }
      var output_id = exports.ele_selected.closest('.drawflow-node').id;
      var output_class = exports.ele_selected.classList[1];

      if (output_id !== input_id && input_class !== false) {
        
        // if (exports.container.querySelectorAll('.connection.node_in_' + input_id + '.node_out_' + output_id + '.' + output_class + '.' + input_class).length === 0) {
        const svgName = '.connection.node_in_' + input_id + '.node_out_' + output_id + '.' + output_class + '.' + input_class;
        if (!exports.connection_list[svgName]) {

          var id_input = input_id.slice(5);
          var id_output = output_id.slice(5);


          exports.updateConnectionList((draft) => {
            draft[svgName] = {
              input_id: id_input,
              input_class,
              output_id: id_output,
              output_class,
              path: Array.from(exports.connection_ele.children),
            }
          })

          exports.connection_ele.remove();
          exports.connection_ele = null;

          exports.setPipeline((draft) => {
            draft.data[id_output].outputs[output_class].connections.push({variable: input_class, block: id_input});
            draft.data[id_input].inputs[input_class].connections.push({variable: output_class, block: id_output});
          })

        } else {
          exports.connection_ele.remove();
        }

        exports.connection_ele = null;
      } else {
        // Connection exists Remove Connection;
        exports.connection_ele.remove();
        exports.connection_ele = null;
      }

    } else {
      // Remove Connection;
      exports.connection_ele.remove();
      exports.connection_ele = null;
    }
  }

  if (exports.node_selected) { // update block position in pipeline
    const nodeId = exports.node_selected.id.slice(5);
    exports.setPipeline((draft) => {
      draft.data[nodeId].views.node.pos_x = exports.node_selected.offsetLeft;
      draft.data[nodeId].views.node.pos_y = exports.node_selected.offsetTop;

      for (let svg in exports.connection_list) {
        if (svg.includes(nodeId)) {
          exports.updateConnectionList((draft) => {
            draft[svg].path = Array.from(exports.container.querySelector(svg)?.children);
          })
        }
      }
    })    
  }

  if (Object.keys(exports.pointData)?.length) { // update point position in pipeline
    const { nodeId, output_class, searchConnection, numberPointPosition, pos_x, pos_y } = exports.pointData;
    exports.setPipeline((draft) => {
      draft.data[nodeId].outputs[output_class].connections[searchConnection].points[numberPointPosition] = { pos_x: pos_x, pos_y: pos_y };
    })
  }
  
  exports.drag = false;
  exports.drag_point = false;
  exports.connection = false;
  exports.ele_selected = null;
  exports.editor_selected = false;
  exports.pointData = {};
}

exports.contextmenu = (e) => {
  e.preventDefault();
  if (exports.editor_mode === 'fixed' || exports.editor_mode === 'view') {
    return false;
  }
  if (exports.precanvas.getElementsByClassName("drawflow-delete").length) {
    exports.precanvas.getElementsByClassName("drawflow-delete")[0].remove()
  }
  if (exports.node_selected || exports.connection_selected) {
    var deletebox = document.createElement('div');
    deletebox.classList.add("drawflow-delete");
    deletebox.innerHTML = "x";
    if (exports.node_selected) {
      exports.node_selected.appendChild(deletebox);

    }
    if (exports.connection_selected && (exports.connection_selected.parentElement.classList.length > 1)) {
      deletebox.style.top = e.clientY * (exports.precanvas.clientHeight / (exports.precanvas.clientHeight * exports.zoom)) - (exports.precanvas.getBoundingClientRect().y * (exports.precanvas.clientHeight / (exports.precanvas.clientHeight * exports.zoom))) + "px";
      deletebox.style.left = e.clientX * (exports.precanvas.clientWidth / (exports.precanvas.clientWidth * exports.zoom)) - (exports.precanvas.getBoundingClientRect().x * (exports.precanvas.clientWidth / (exports.precanvas.clientWidth * exports.zoom))) + "px";
      exports.precanvas.appendChild(deletebox);
    }
  }
}

exports.contextmenuDel = () => {
  if (exports.precanvas.getElementsByClassName("drawflow-delete").length) {
    exports.precanvas.getElementsByClassName("drawflow-delete")[0].remove()
  };
}

exports.key = (e) => {
  if (exports.editor_mode === 'fixed' || exports.editor_mode === 'view') {
    return false;
  }
  if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
    if (exports.node_selected != null) {
      if (exports.first_click.tagName !== 'INPUT' && exports.first_click.tagName !== 'TEXTAREA' && exports.first_click.hasAttribute('contenteditable') !== true) {
        exports.removeConnectionNodeId(exports.node_selected.id);
      }
    }
    if (exports.connection_selected != null) {
      console.log("delete svg")
      exports.removeConnection();
    }
  }
}

exports.zoom_enter = (e) =>{
  e.preventDefault();
  if (e.deltaY > 0) {
    // Zoom Out
    exports.zoom_out();
  } else {
    // Zoom In
    exports.zoom_in();
  }

  // exports.updatePosition((draft) => {
  //   console.log("from zoom")
  //   draft.zoom = exports.zoom;
  //   draft.zoom_max = exports.zoom_max;
  //   draft.zoom_min = exports.zoom_min;
  //   draft.zoom_value = exports.zoom_value;
  //   draft.zoom_last_value = exports.zoom_last_value;
  //   draft.canvas_x = exports.canvas_x;
  //   draft.canvas_y = exports.canvas_y;
  //   draft.precanvasStyle = exports.precanvas.style.transform;
  // })

  // console.log(`
  //   exports.zoom ${exports.zoom}
  //   exports.zoom_max ${exports.zoom_max}
  //   exports.zoom_min ${exports.zoom_min}
  //   exports.zoom_value ${exports.zoom_value}
  //   exports.zoom_last_value ${exports.zoom_last_value}
  //   exports.canvas_x: ${exports.canvas_x}
  //   exports.canvas_y: ${exports.canvas_y}
  //   exports.precanvas.style: ${exports.precanvas.style.transform}
  // `)
}

exports.zoom_refresh = () => {
  exports.canvas_x = (exports.canvas_x / exports.zoom_last_value) * exports.zoom;
  exports.canvas_y = (exports.canvas_y / exports.zoom_last_value) * exports.zoom;
  exports.zoom_last_value = exports.zoom;
  exports.precanvas.style.transform = "translate(" + exports.canvas_x + "px, " + exports.canvas_y + "px) scale(" + exports.zoom + ")";
}

exports.zoom_in = () => {
  if (exports.zoom < exports.zoom_max) {
    exports.zoom += exports.zoom_value;
    exports.zoom_refresh();
  }
}

exports.zoom_out = () => {
  if (exports.zoom > exports.zoom_min) {
    exports.zoom -= exports.zoom_value;
    exports.zoom_refresh();
  }
}

exports.updateConnectionNodes = (id) => {
  const idSearch = 'node_in_' + id;
  const idSearchOut = 'node_out_' + id;
  var line_path = exports.line_path / 2;
  const container = exports.container;
  const precanvas = exports.precanvas;
  const curvature = exports.curvature;
  const createCurvature = exports.createCurvature;
  const reroute_curvature = exports.reroute_curvature;
  const reroute_curvature_start_end = exports.reroute_curvature_start_end;
  const reroute_fix_curvature = exports.reroute_fix_curvature;
  const rerouteWidth = exports.reroute_width;
  const zoom = exports.zoom;
  let precanvasWitdhZoom = precanvas.clientWidth / (precanvas.clientWidth * zoom);
  precanvasWitdhZoom = precanvasWitdhZoom || 0;
  let precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * zoom);
  precanvasHeightZoom = precanvasHeightZoom || 0;

  const elemsOut = container.querySelectorAll(`.${idSearchOut}`);

  Object.keys(elemsOut).map(function (item, index) {
    if (elemsOut[item].querySelector('.point') === null) {

      var elemtsearchId_out = container.querySelector(`#${id}`);

      var id_search = elemsOut[item].classList[1].replace('node_in_', '');
      var elemtsearchId = container.querySelector(`#${id_search}`);

      var elemtsearch = elemtsearchId.querySelectorAll('.' + elemsOut[item].classList[4])[0]

      var eX = elemtsearch.offsetWidth / 2 + (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
      var eY = elemtsearch.offsetHeight / 2 + (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

      var elemtsearchOut = elemtsearchId_out.querySelectorAll('.' + elemsOut[item].classList[3])[0]

      var line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
      var line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

      var x = eX;
      var y = eY;

      const lineCurve = createCurvature(line_x, line_y, x, y, curvature, 'openclose');
      elemsOut[item].children[0].setAttributeNS(null, 'd', lineCurve);
    } else {
      const points = elemsOut[item].querySelectorAll('.point');
      let linecurve = '';
      const reoute_fix = [];
      points.forEach((item, i) => {
        if (i === 0 && ((points.length - 1) === 0)) {

          var elemtsearchId_out = container.querySelector(`#${id}`);
          var elemtsearch = item;

          var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;

          var elemtsearchOut = elemtsearchId_out.querySelectorAll('.' + item.parentElement.classList[3])[0]
          var line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
          var line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);

          var elemtsearchId_out = item;
          var id_search = item.parentElement.classList[1].replace('node_in_', '');
          var elemtsearchId = container.querySelector(`#${id_search}`);
          var elemtsearch = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]

          var elemtsearchIn = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]
          var eX = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
          var eY = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;


          var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);

        } else if (i === 0) {

          var elemtsearchId_out = container.querySelector(`#${id}`);
          var elemtsearch = item;

          var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;

          var elemtsearchOut = elemtsearchId_out.querySelectorAll('.' + item.parentElement.classList[3])[0]
          var line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
          var line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);

          // SECOND
          var elemtsearchId_out = item;
          var elemtsearch = points[i + 1];

          var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);

        } else if (i === (points.length - 1)) {

          var elemtsearchId_out = item;

          var id_search = item.parentElement.classList[1].replace('node_in_', '');
          var elemtsearchId = container.querySelector(`#${id_search}`);
          var elemtsearch = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]

          var elemtsearchIn = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]
          var eX = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
          var eY = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;
          var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) + rerouteWidth;
          var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) + rerouteWidth;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);

        } else {
          var elemtsearchId_out = item;
          var elemtsearch = points[i + 1];

          var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) + rerouteWidth;
          var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) + rerouteWidth;
          var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) + rerouteWidth;
          var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) + rerouteWidth;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);
        }

      });
      if (reroute_fix_curvature) {
        reoute_fix.forEach((itempath, i) => {
          elemsOut[item].children[i].setAttributeNS(null, 'd', itempath);
        });

      } else {
        elemsOut[item].children[0].setAttributeNS(null, 'd', linecurve);
      }

    }
  })

  const elems = container.querySelectorAll(`.${idSearch}`);
  Object.keys(elems).map(function (item, index) {

    if (elems[item].querySelector('.point') === null) {
      var elemtsearchId_in = container.querySelector(`#${id}`);

      var id_search = elems[item].classList[2].replace('node_out_', '');
      var elemtsearchId = container.querySelector(`#${id_search}`);
      var elemtsearch = elemtsearchId.querySelectorAll('.' + elems[item].classList[3])[0]

      var line_x = elemtsearch.offsetWidth / 2 + (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
      var line_y = elemtsearch.offsetHeight / 2 + (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

      var elemtsearchId_in = elemtsearchId_in.querySelectorAll('.' + elems[item].classList[4])[0]
      var x = elemtsearchId_in.offsetWidth / 2 + (elemtsearchId_in.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
      var y = elemtsearchId_in.offsetHeight / 2 + (elemtsearchId_in.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

      const lineCurve = createCurvature(line_x, line_y, x, y, curvature, 'openclose');
      elems[item].children[0].setAttributeNS(null, 'd', lineCurve);

    } else {
      const points = elems[item].querySelectorAll('.point');
      let linecurve = '';
      const reoute_fix = [];
      points.forEach((item, i) => {
        if (i === 0 && ((points.length - 1) === 0)) {

          var elemtsearchId_out = container.querySelector(`#${id}`);
          var elemtsearch = item;

          var line_x = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var line_y = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;

          var elemtsearchIn = elemtsearchId_out.querySelectorAll('.' + item.parentElement.classList[4])[0]
          var eX = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
          var eY = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);

          var elemtsearchId_out = item;
          var id_search = item.parentElement.classList[2].replace('node_out_', '');
          var elemtsearchId = container.querySelector(`#${id_search}`);
          var elemtsearch = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[3])[0]

          var elemtsearchOut = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[3])[0]
          var line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
          var line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

          var eX = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var eY = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);


        } else if (i === 0) {
          // FIRST
          var elemtsearchId_out = item;
          var id_search = item.parentElement.classList[2].replace('node_out_', '');
          var elemtsearchId = container.querySelector(`#${id_search}`);
          var elemtsearch = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[3])[0]
          var elemtsearchOut = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[3])[0]
          var line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
          var line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

          var eX = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var eY = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);

          // SECOND
          var elemtsearchId_out = item;
          var elemtsearch = points[i + 1];

          var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);

        } else if (i === (points.length - 1)) {

          var elemtsearchId_out = item;

          var id_search = item.parentElement.classList[1].replace('node_in_', '');
          var elemtsearchId = container.querySelector(`#${id_search}`);
          var elemtsearch = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]

          var elemtsearchIn = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]
          var eX = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
          var eY = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

          var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);

        } else {

          var elemtsearchId_out = item;
          var elemtsearch = points[i + 1];

          var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
          var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
          var x = eX;
          var y = eY;

          var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
          linecurve += lineCurveSearch;
          reoute_fix.push(lineCurveSearch);
        }

      });
      if (reroute_fix_curvature) {
        reoute_fix.forEach((itempath, i) => {
          elems[item].children[i].setAttributeNS(null, 'd', itempath);
        });

      } else {
        elems[item].children[0].setAttributeNS(null, 'd', linecurve);
      }

    }
  })
}

exports.createCurvature = (start_pos_x, start_pos_y, end_pos_x, end_pos_y, curvature_value, type) => {
  var line_x = start_pos_x;
  var line_y = start_pos_y;
  var x = end_pos_x;
  var y = end_pos_y;
  var curvature = curvature_value;
  //type openclose open close other
  switch (type) {
    case 'open':
      if (start_pos_x >= end_pos_x) {
        var hx1 = line_x + Math.abs(x - line_x) * curvature;
        var hx2 = x - Math.abs(x - line_x) * (curvature * -1);
      } else {
        var hx1 = line_x + Math.abs(x - line_x) * curvature;
        var hx2 = x - Math.abs(x - line_x) * curvature;
      }
      return ' M ' + line_x + ' ' + line_y + ' C ' + hx1 + ' ' + line_y + ' ' + hx2 + ' ' + y + ' ' + x + '  ' + y;

      break
    case 'close':
      if (start_pos_x >= end_pos_x) {
        var hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
        var hx2 = x - Math.abs(x - line_x) * curvature;
      } else {
        var hx1 = line_x + Math.abs(x - line_x) * curvature;
        var hx2 = x - Math.abs(x - line_x) * curvature;
      }
      return ' M ' + line_x + ' ' + line_y + ' C ' + hx1 + ' ' + line_y + ' ' + hx2 + ' ' + y + ' ' + x + '  ' + y;
      break;
    case 'other':
      if (start_pos_x >= end_pos_x) {
        var hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
        var hx2 = x - Math.abs(x - line_x) * (curvature * -1);
      } else {
        var hx1 = line_x + Math.abs(x - line_x) * curvature;
        var hx2 = x - Math.abs(x - line_x) * curvature;
      }
      return ' M ' + line_x + ' ' + line_y + ' C ' + hx1 + ' ' + line_y + ' ' + hx2 + ' ' + y + ' ' + x + '  ' + y;
      break;
    default:

      var hx1 = line_x + Math.abs(x - line_x) * curvature;
      var hx2 = x - Math.abs(x - line_x) * curvature;

      return ' M ' + line_x + ' ' + line_y + ' C ' + hx1 + ' ' + line_y + ' ' + hx2 + ' ' + y + ' ' + x + '  ' + y;
  }

}

exports.updateAllConnections = () => {
  // Get all nodes from the drawflow canvas
  const nodes = exports.pipeline.data;
  Object.keys(nodes).forEach(nodeId => {
    // Update connections for each node
    // console.log("'node-' + nodeId): ", 'node-' + nodeId)
    exports.updateConnectionNodes('node-' + nodeId);
  });
}

exports.createReroutePoint = (ele) => {
  exports.connection_selected.classList.remove("selected");
  const nodeUpdate = exports.connection_selected.parentElement.classList[2].slice(9);
  const nodeUpdateIn = exports.connection_selected.parentElement.classList[1].slice(13);
  const output_class = exports.connection_selected.parentElement.classList[3];
  const input_class = exports.connection_selected.parentElement.classList[4];
  exports.connection_selected = null;
  const point = document.createElementNS('http://www.w3.org/2000/svg', "circle");
  point.classList.add("point");
  var pos_x = exports.pos_x * (exports.precanvas.clientWidth / (exports.precanvas.clientWidth * exports.zoom)) - (exports.precanvas.getBoundingClientRect().x * (exports.precanvas.clientWidth / (exports.precanvas.clientWidth * exports.zoom)));
  var pos_y = exports.pos_y * (exports.precanvas.clientHeight / (exports.precanvas.clientHeight * exports.zoom)) - (exports.precanvas.getBoundingClientRect().y * (exports.precanvas.clientHeight / (exports.precanvas.clientHeight * exports.zoom)));

  point.setAttributeNS(null, 'cx', pos_x);
  point.setAttributeNS(null, 'cy', pos_y);
  point.setAttributeNS(null, 'r', exports.reroute_width);

  let position_add_array_point = 0;
  if (exports.reroute_fix_curvature) {

    const numberPoints = ele.parentElement.querySelectorAll(".main-path").length;
    var path = document.createElementNS('http://www.w3.org/2000/svg', "path");
    path.classList.add("main-path");
    path.setAttributeNS(null, 'd', '');

    ele.parentElement.insertBefore(path, ele.parentElement.children[numberPoints]);
    if (numberPoints === 1) {
      ele.parentElement.appendChild(point);
    } else {
      const search_point = Array.from(ele.parentElement.children).indexOf(ele)
      position_add_array_point = search_point;
      ele.parentElement.insertBefore(point, ele.parentElement.children[search_point + numberPoints + 1]);
    }

  } else {
    ele.parentElement.appendChild(point);
  }

  exports.updateConnectionList((draft) => {
    const svgName = "." + ele.parentElement.classList.value.split(" ").join(".");
    draft[svgName].path = Array.from(ele.parentElement.children)
  })

  const nodeId = nodeUpdate.slice(5);

  exports.setPipeline((draft) => {
    const searchConnection = draft.data[nodeId].outputs[output_class].connections.findIndex(function (item, i) {
      return item.block === nodeUpdateIn && item.variable === input_class;
    });
  
    if (draft.data[nodeId].outputs[output_class].connections[searchConnection].points === undefined) {
      draft.data[nodeId].outputs[output_class].connections[searchConnection].points = [];
    }
  
    if (exports.reroute_fix_curvature) {
      if (position_add_array_point > 0 || draft.data[nodeId].outputs[output_class].connections[searchConnection].points != []) {
        draft.data[nodeId].outputs[output_class].connections[searchConnection].points.splice(position_add_array_point, 0, { pos_x: pos_x, pos_y: pos_y });
      } else {
        draft.data[nodeId].outputs[output_class].connections[searchConnection].points.push({ pos_x: pos_x, pos_y: pos_y });
      }
  
      ele.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
        item.classList.remove("selected");
      });

    } else {
      draft.data[nodeId].outputs[output_class].connections[searchConnection].points.push({ pos_x: pos_x, pos_y: pos_y });
    }

  })
  exports.updateConnectionNodes(nodeUpdate);
}

exports.removeReroutePoint = (ele) => {
  const nodeUpdate = ele.parentElement.classList[2].slice(9)
  const nodeUpdateIn = ele.parentElement.classList[1].slice(13);
  const output_class = ele.parentElement.classList[3];
  const input_class = ele.parentElement.classList[4];

  let numberPointPosition = Array.from(ele.parentElement.children).indexOf(ele);
  const nodeId = nodeUpdate.slice(5);

  exports.setPipeline((draft) => {
    const searchConnection = draft.data[nodeId].outputs[output_class].connections.findIndex(function (item, i) {
      return item.block === nodeUpdateIn && item.variable === input_class;
    });
  
    if (exports.reroute_fix_curvature) {
      const numberMainPath = ele.parentElement.querySelectorAll(".main-path").length
      ele.parentElement.children[numberMainPath - 1].remove();

      exports.updateConnectionList((draft) => {
        const svgName = "." + ele?.parentElement?.classList?.value?.split(" ")?.join(".");
        draft[svgName].path.splice(numberMainPath - 1, 1);
        const searchPoint = draft[svgName].path.findIndex(function (item, i) {
          return item === ele;
        });
        draft[svgName].path.splice(searchPoint, 1);      
      })

      numberPointPosition -= numberMainPath;
      if (numberPointPosition < 0) {
        numberPointPosition = 0;
      }
    } else {
      numberPointPosition--;
    }
    draft.data[nodeId].outputs[output_class].connections[searchConnection].points.splice(numberPointPosition, 1);
  
    ele.remove();
    exports.updateConnectionNodes(nodeUpdate);
  })
}

exports.removeConnection = () => {
  if (exports.connection_selected != null) {
    const svgName = "." + Array.from(exports.connection_selected.parentElement.classList).join(".");
    const { input_id, input_class, output_id, output_class } = exports.connection_list[svgName];
    exports.connection_selected.parentElement.remove();
    exports.connection_selected = null;
    exports.updateConnectionList((draft) => {
      delete draft[svgName];
    })
    exports.setPipeline((draft) => {
      const index_out = draft.data[output_id].outputs[output_class].connections.findIndex(element => {
        return element.variable === input_class && element.block === input_id;
      })
      const index_in = draft.data[input_id].inputs[input_class].connections.findIndex(element => {
        return element.variable === output_class && element.block === output_id;
      })
      draft.data[output_id].outputs[output_class].connections.splice(index_out, 1);
      draft.data[input_id].inputs[input_class].connections.splice(index_in, 1);
    })
  }
}

exports.removeSingleConnection = (id_output, id_input, output_class, input_class) => {
  var nodeOneModule = exports.getModuleFromNodeId(id_output);
  var nodeTwoModule = exports.getModuleFromNodeId(id_input);
  if (nodeOneModule === nodeTwoModule) {
    // Check nodes in same module.

    // Check connection exist
    var exists = exports.pipeline[nodeOneModule].data[id_output].outputs[output_class].connections.findIndex(function (item, i) {
      return item.node == id_input && item.output === input_class
    });
    if (exists > -1) {

      if (exports.module === nodeOneModule) {
        // In same module with view.
        exports.container.querySelector('.connection.node_in_node-' + id_input + '.node_out_node-' + id_output + '.' + output_class + '.' + input_class).remove();
      }

      exports.setPipeline((draft) => {
        var index_out = draft.data[id_output].outputs[output_class].connections.findIndex(function (item, i) {
          return item.node == id_input && item.output === input_class
        });
        draft.data[id_output].outputs[output_class].connections.splice(index_out, 1);
  
        var index_in = draft[nodeOneModule].data[id_input].inputs[input_class].connections.findIndex(function (item, i) {
          return item.node == id_output && item.input === output_class
        });
        draft.data[id_input].inputs[input_class].connections.splice(index_in, 1);
      })

      return true;

    } else {
      return false;
    }
  } else {
    return false;
  }
}

exports.removeConnectionNodeId = (id) => {
  // DELETE all connections associated with this id with setpipeline
  const nodeId = id.slice(5);
  exports.setPipeline((draft) => {
    const connectionList = []
    
    for (let connection in exports.connection_list) {
      if (connection.includes(nodeId)) {
        const { input_id, input_class, output_id, output_class } = exports.connection_list[connection];
        connectionList.push(connection);
        
        // Remove connection data from output property of connecting block
        if (input_id === nodeId) {
          const index_out = draft.data[output_id].outputs[output_class].connections.findIndex(function (item, i) {
            return item.variable === input_class && item.block === input_id;
          });
          draft.data[output_id].outputs[output_class].connections.splice(index_out, 1);

        // Remove connection data from input property of connecting block
        } else if (output_id === nodeId) {
          const index_in = draft.data[input_id].inputs[input_class].connections.findIndex(function (item, i) {
            return item.variable === output_class && item.block === output_id;
          });
          draft.data[input_id].inputs[input_class].connections.splice(index_in, 1);
        }
      }      
    }

    exports.updateConnectionList((connectionListDraft) => {
      connectionList.forEach((connection) => {
        if (connectionListDraft[connection]) {
          exports.container.querySelector(connection).remove()
          delete connectionListDraft[connection];
        }
      })
    })

    delete draft.data[nodeId]
  })

  // const idSearchIn = 'node_in_' + id;
  // const idSearchOut = 'node_out_' + id;

  // const elemsOut = exports.container.querySelectorAll(`.${idSearchOut}`);
  // console.log("elemsOut: ", elemsOut)
  // for (var i = elemsOut.length - 1; i >= 0; i--) {
  //   var listclass = elemsOut[i].classList;

  //   var index_in = exports.drawflow.drawflow[exports.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.findIndex(function (item, i) {
  //     return item.node === listclass[2].slice(14) && item.input === listclass[3]
  //   });
  //   exports.drawflow.drawflow[exports.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.splice(index_in, 1);

  //   var index_out = exports.drawflow.drawflow[exports.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.findIndex(function (item, i) {
  //     return item.node === listclass[1].slice(13) && item.output === listclass[4]
  //   });
  //   exports.drawflow.drawflow[exports.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.splice(index_out, 1);

  //   elemsOut[i].remove();

  // }

  // const elemsIn = exports.container.querySelectorAll(`.${idSearchIn}`);
  // console.log("elemsIn: ", elemsIn)
  // for (var i = elemsIn.length - 1; i >= 0; i--) {

  //   var listclass = elemsIn[i].classList;

  //   var index_out = exports.drawflow.drawflow[exports.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.findIndex(function (item, i) {
  //     return item.node === listclass[1].slice(13) && item.output === listclass[4]
  //   });
  //   exports.drawflow.drawflow[exports.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.splice(index_out, 1);

  //   var index_in = exports.drawflow.drawflow[exports.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.findIndex(function (item, i) {
  //     return item.node === listclass[2].slice(14) && item.input === listclass[3]
  //   });
  //   exports.drawflow.drawflow[exports.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.splice(index_in, 1);

  //   elemsIn[i].remove();

  // }
}

// not used
// exports.zoom_reset = () => {
//   if (exports.zoom != 1) {
//     exports.zoom = 1;
//     exports.zoom_refresh();
//   }
// }
exports.clear = () => {
  exports.precanvas.innerHTML = "";
  // exports.drawflow = { "drawflow": { "Home": { "data": {} } } };
}

exports.import = (data, notifi = true) => {
  // this.clear();
  exports.drawflow = JSON.parse(JSON.stringify(data));
  exports.load();
  if (notifi) {
  }
}
exports.convert_drawflow_to_block = (name, blockGraph) => {
  const graph_with_connections = JSON.parse(JSON.stringify(blockGraph))
  const newPipeline = {}
  for (const block in graph_with_connections) {
    graph_with_connections[block].events = {};
    newPipeline[block] = graph_with_connections[block];
  }

  const pipeline = {
      pipeline: newPipeline,
      sink: "./history",
      build: "./my_pipelines"
  }

  return pipeline;
}

exports.getChildrenAsArray = (obj, parentKey) => {
  const result = [];

  if (parentKey in obj) {
    const childObjects = obj[parentKey];

    for (const key in childObjects) {
      if (Object.prototype.hasOwnProperty.call(childObjects, key)) {
        result.push(childObjects[key]);
      }
    }
  }

  return result;
}

// exports.renameKeyInArrayOfObjects = (array, oldKey, newKey) => {
//   // Create a deep copy of the array
//   let copiedArray = JSON.parse(JSON.stringify(array));
//   for (let obj of copiedArray) {
//       if (obj.hasOwnProperty(oldKey)) {
//           obj[newKey] = obj[oldKey];
//           delete obj[oldKey];
//       }
//   }
//   return copiedArray;
// }

// exports.addNode_from_JSON = (json) => {
//   const graph = exports.drawflow.drawflow[exports.module].data;
//   const id = json.id;
//   if (graph.hasOwnProperty(id) && exports.ioChanged(graph[id].inputs, json.inputs) && exports.ioChanged(graph[id].outputs, json.outputs)) {
//     // Inbound data from react managed inputs
//     // This happens because react re-renders twice
//     // And we have to make sure that if the user has mutated
//     // the DOM that we don't overwrite with unmanaged data,
//     // specifically dynamic graph connections are only stored 
//     // in the node.inputs and node.outputs json object,
//     // not the react data structure

//     // TODO: connections and svgs managed in react
//     // which essentially means a full port of drawflow
//     return id;
//   } else {
//     graph[id] = json
//   }
//   return id;
// }

// exports.ioChanged = (graphIO, jsonIO) => {
//   return JSON.stringify(graphIO) === JSON.stringify(jsonIO);
// }

exports.getModuleFromNodeId = (id) => {
  var nameModule;
  const editor = exports.drawflow.drawflow
  Object.keys(editor).map(function (moduleName, index) {
    Object.keys(editor[moduleName].data).map(function (node, index2) {
      if (node == id) {
        nameModule = moduleName;
      }
    })
  });
  return nameModule;
}

// used somewhere else
exports.removeNodeOutputConnections = (id, output_class) => { //check
  const infoNode = exports.getNodeFromId(id)
  const removeOutputs = [];
  Object.keys(infoNode.outputs[output_class].connections).map(function (key, index) {
    const id_input = infoNode.outputs[output_class].connections[index].node;
    const input_class = infoNode.outputs[output_class].connections[index].output;
    removeOutputs.push({ id, id_input, output_class, input_class })
  })
  // Remove connections
  removeOutputs.forEach((item, i) => {
    exports.removeSingleConnection(item.id, item.id_input, item.output_class, item.input_class);
  });
}

// used somewhere else
exports.removeNodeInputConnections = (id, input_class) => { //check
  const infoNode = exports.getNodeFromId(id)
  const removeInputs = [];
  Object.keys(infoNode.inputs[input_class].connections).map(function (key, index) {
    const id_output = infoNode.inputs[input_class].connections[index].node;
    const output_class = infoNode.inputs[input_class].connections[index].input;
    removeInputs.push({ id_output, id, output_class, input_class })
  })
  // Remove connections
  removeInputs.forEach((item, i) => {
    exports.removeSingleConnection(item.id_output, item.id, item.output_class, item.input_class);
  });
}

exports.removeReouteConnectionSelected = () => { // fine?
  if (exports.reroute_fix_curvature) {
    exports.connection_selected.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
      item.classList.remove("selected");
    });
  }
}
exports.getNodeFromId = (id) => { // check
  var moduleName = exports.getModuleFromNodeId(id)
  return JSON.parse(JSON.stringify(exports.drawflow.drawflow[moduleName].data[id]));
}

export default exports;