export default class Drawflow {
  constructor(container, openViewCallback, precanvas = null, render = null, parent = null) {
    this.events = {};
    this.container = container;
    this.precanvas = precanvas;
    //this.loadBlock = loadBlock;
    this.nodeId = 1;
    this.ele_selected = null;
    this.node_selected = null;
    this.drag = false;
    this.reroute = false;
    this.reroute_fix_curvature = false;
    this.curvature = 0.5;
    this.reroute_curvature_start_end = 0.5;
    this.reroute_curvature = 0.5;
    this.reroute_width = 6;
    this.drag_point = false;
    this.editor_selected = false;
    this.connection = false;
    this.connection_ele = null;
    this.connection_selected = null;
    this.canvas_x = 0;
    this.canvas_y = 0;
    this.pos_x = 0;
    this.pos_x_start = 0;
    this.pos_y = 0;
    this.pos_y_start = 0;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.line_path = 5;
    this.first_click = null;
    this.force_first_input = false;
    this.draggable_inputs = true;
    this.useuuid = false;
    this.parent = parent;

    this.noderegister = {};
    this.render = render;
    this.drawflow = { "drawflow": { "Home": { "data": {} } } };
    // Configurable options
    this.module = 'Home';
    this.editor_mode = 'edit';
    this.zoom = 1;
    // this.zoom_max = 1.6;
    this.zoom_max = 5.6;
    this.zoom_min = 0.15;
    // this.zoom_value = 0.1;
    this.zoom_value = 0.03;
    this.zoom_last_value = 1;

    // Mobile
    this.evCache = new Array();
    this.prevDiff = -1;

    this.removeNodeSubscribers = [];

    this.openViewCallback = openViewCallback;
  }

  


  start() {
    // console.info("Start Drawflow!!");
    this.container.classList.add("parent-drawflow");
    this.container.tabIndex = 0;
    //this.precanvas = document.createElement('div');
    this.precanvas.classList.add("drawflow");
    //this.container.appendChild(this.precanvas);

    /* Mouse and Touch Actions */
    this.container.addEventListener('mouseup', this.dragEnd.bind(this));
    this.container.addEventListener('mousemove', this.position.bind(this));
    this.container.addEventListener('mousedown', this.click.bind(this));

    this.container.addEventListener('touchend', this.dragEnd.bind(this));
    this.container.addEventListener('touchmove', this.position.bind(this));
    this.container.addEventListener('touchstart', this.click.bind(this));

    /* Context Menu */
    this.container.addEventListener('contextmenu', this.contextmenu.bind(this));
    /* Delete */
    this.container.addEventListener('keydown', this.key.bind(this));

    /* Zoom Mouse */
    this.container.addEventListener('wheel', this.zoom_enter.bind(this));
    /* Update data Nodes */
    this.container.addEventListener('input', this.updateNodeValue.bind(this));

    this.container.addEventListener('dblclick', this.dblclick.bind(this));
    /* Mobile zoom */
    this.container.onpointerdown = this.pointerdown_handler.bind(this);
    this.container.onpointermove = this.pointermove_handler.bind(this);
    this.container.onpointerup = this.pointerup_handler.bind(this);
    this.container.onpointercancel = this.pointerup_handler.bind(this);
    this.container.onpointerout = this.pointerup_handler.bind(this);
    this.container.onpointerleave = this.pointerup_handler.bind(this);

    this.load();
  }

  /* Mobile zoom */
  pointerdown_handler(ev) {
    this.evCache.push(ev);
  }

  pointermove_handler(ev) {
    for (var i = 0; i < this.evCache.length; i++) {
      if (ev.pointerId == this.evCache[i].pointerId) {
        this.evCache[i] = ev;
        break;
      }
    }

    if (this.evCache.length == 2) {
      // Calculate the distance between the two pointers
      var curDiff = Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);

      if (this.prevDiff > 100) {
        if (curDiff > this.prevDiff) {
          // The distance between the two pointers has increased

          this.zoom_in();
        }
        if (curDiff < this.prevDiff) {
          // The distance between the two pointers has decreased
          this.zoom_out();
        }
      }
      this.prevDiff = curDiff;
    }
  }

  pointerup_handler(ev) {
    this.remove_event(ev);
    if (this.evCache.length < 2) {
      this.prevDiff = -1;
    }
  }
  remove_event(ev) {
    // Remove this event from the target's cache
    for (var i = 0; i < this.evCache.length; i++) {
      if (this.evCache[i].pointerId == ev.pointerId) {
        this.evCache.splice(i, 1);
        break;
      }
    }
  }
  /* End Mobile Zoom */
  // load() {
  //   for (var key in this.drawflow.drawflow[this.module].data) {
  //     console.log(this.drawflow.drawflow[this.module].data[key].block)
  //     // this.addNodeImport(this.drawflow.drawflow[this.module].data[key], this.precanvas);
  //     this.addNode_from_JSON(this.drawflow.drawflow[this.module].data[key].block,this.drawflow.drawflow[this.module].data[key].pos_x, this.drawflow.drawflow[this.module].data[key].pos_y);
  //   }

  //   if(this.reroute) {
  //     for (var key in this.drawflow.drawflow[this.module].data) {
  //       this.addRerouteImport(this.drawflow.drawflow[this.module].data[key]);
  //     }
  //   }

  //   for (var key in this.drawflow.drawflow[this.module].data) {
  //     this.updateConnectionNodes('node-'+key);
  //   }

  //   const editor = this.drawflow.drawflow;
  //   let number = 1;
  //   Object.keys(editor).map(function(moduleName, index) {
  //     Object.keys(editor[moduleName].data).map(function(id, index2) {
  //       if(parseInt(id) >= number) {
  //         number = parseInt(id)+1;
  //       }
  //     });
  //   });
  //   this.nodeId = number;
  // }

  load_block(node, notifi = true) {
    const id = this.addNode_from_JSON(node, node.views.node.pos_x, node.views.node.pos_y);
    if (notifi) {
      this.dispatch('import', 'import')
    }
    return id
  }

  load_pipeline(pipeline, clear = true, notifi = true) {
    if (clear) {
      this.clearModuleSelected()
    }
    
    const nodes = pipeline.pipeline
    for (const key in nodes) {
      this.load_block(nodes[key])
    }
    for (const key in nodes) {
      let outputNames = Object.keys(nodes[key].outputs);
      for (let i = 0; i < outputNames.length; i++) {
        let inputConnections = nodes[key].outputs[outputNames[i]].connections;
        for (let j = 0; j < inputConnections.length; j++) {
          let inputNodeKey = inputConnections[j].block
          let inputNodeName = inputConnections[j].variable
          this.addConnection(key, inputNodeKey, outputNames[i], inputNodeName);
        }
      }
    }

    if (notifi) {
      this.dispatch('import', 'import');
    }
  }

  add_connections(pipeline) {
    for (const key in pipeline) {
      let outputNames = Object.keys(pipeline[key].outputs);
      for (let i = 0; i < outputNames.length; i++) {
        let inputConnections = pipeline[key].outputs[outputNames[i]].connections;
        for (let j = 0; j < inputConnections.length; j++) {
          let inputNodeKey = inputConnections[j].block
          let inputNodeName = inputConnections[j].variable
          this.addConnection(key, inputNodeKey, outputNames[i], inputNodeName);
        }
      }
    }
  }

  load() {
    for (var key in this.drawflow.drawflow[this.module].data) {
      this.addNode_from_JSON(this.drawflow.drawflow[this.module].data[key].block, this.drawflow.drawflow[this.module].data[key].pos_x, this.drawflow.drawflow[this.module].data[key].pos_y);
    }

    // if(this.reroute) {
    //   for (var key in this.drawflow.drawflow[this.module].data) {
    //     this.addRerouteImport(this.drawflow.drawflow[this.module].data[key]);
    //   }
    // }

    // for (var key in this.drawflow.drawflow[this.module].data) {
    //   this.updateConnectionNodes('node-'+key);
    // }

    // const editor = this.drawflow.drawflow;
    // let number = 1;
    // Object.keys(editor).map(function(moduleName, index) {
    //   Object.keys(editor[moduleName].data).map(function(id, index2) {
    //     if(parseInt(id) >= number) {
    //       number = parseInt(id)+1;
    //     }
    //   });
    // });
    // this.nodeId = number;
  }

  removeReouteConnectionSelected() {
    this.dispatch('connectionUnselected', true);
    if (this.reroute_fix_curvature) {
      this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
        item.classList.remove("selected");
      });
    }
  }

  click(e) {
    this.dispatch('click', e);
    if (this.editor_mode === 'fixed') {
      //return false;
      e.preventDefault();
      if (e.target.classList[0] === 'parent-drawflow' || e.target.classList[0] === 'drawflow') {
        this.ele_selected = e.target.closest(".parent-drawflow");
      } else {
        return false;
      }
    } else if (this.editor_mode === 'view') {
      if (e.target.closest(".drawflow") != null || e.target.matches('.parent-drawflow')) {
        this.ele_selected = e.target.closest(".parent-drawflow");
        e.preventDefault();
      }
    } else {
      this.first_click = e.target;
      this.ele_selected = e.target;
      if (e.button === 0) {
        this.contextmenuDel();
      }

      if (e.target.classList[0] != "output" && e.target.closest(".drawflow-node") != null ) {
        this.ele_selected = e.target.closest(".drawflow-node");
      }
    }
    switch (this.ele_selected.classList[0]) {
      case 'drawflow-node':
        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          if (this.node_selected != this.ele_selected) {
            this.dispatch('nodeUnselected', true);
          }
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        if (this.node_selected != this.ele_selected) {
          this.dispatch('nodeSelected', this.ele_selected.id.slice(5));
        }
        this.node_selected = this.ele_selected;
        this.node_selected.classList.add("selected");
        if (!this.draggable_inputs) {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT' && e.target.hasAttribute('contenteditable') !== true) {
            this.drag = true;
          }
        } else {
          if (e.target.tagName !== 'SELECT') {
            this.drag = true;
          }
        }
        break;
      case 'output':
        this.connection = true;
        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.drawConnection(e.target);
        break;
      case 'parent-drawflow':
        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.editor_selected = true;
        break;
      case 'drawflow':
        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.editor_selected = true;
        break;
      case 'main-path':
        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.connection_selected = this.ele_selected;
        this.connection_selected.classList.add("selected");
        const listclassConnection = this.connection_selected.parentElement.classList;
        if (listclassConnection.length > 1) {
          this.dispatch('connectionSelected', { output_id: listclassConnection[2].slice(14), input_id: listclassConnection[1].slice(13), output_class: listclassConnection[3], input_class: listclassConnection[4] });
          if (this.reroute_fix_curvature) {
            this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
              item.classList.add("selected");
            });
          }
        }
        break;
      case 'point':
        this.drag_point = true;
        this.ele_selected.classList.add("selected");
        break;
      case 'drawflow-delete':
        if (this.node_selected) {
          this.removeNodeId(this.node_selected.id);
        }

        if (this.connection_selected) {
          this.removeConnection();
        }

        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          this.node_selected = null;
          this.dispatch('nodeUnselected', true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }

        break;
      default:
    }
    if (e.type === "touchstart") {
      this.pos_x = e.touches[0].clientX;
      this.pos_x_start = e.touches[0].clientX;
      this.pos_y = e.touches[0].clientY;
      this.pos_y_start = e.touches[0].clientY;
      this.mouse_x = e.touches[0].clientX;
      this.mouse_y = e.touches[0].clientY;
    } else {
      this.pos_x = e.clientX;
      this.pos_x_start = e.clientX;
      this.pos_y = e.clientY;
      this.pos_y_start = e.clientY;
    }
    if (['input', 'output', 'main-path'].includes(this.ele_selected.classList[0])) {
      e.preventDefault();
    }
    this.dispatch('clickEnd', e);
  }

  position(e) {
    if (e.type === "touchmove") {
      var e_pos_x = e.touches[0].clientX;
      var e_pos_y = e.touches[0].clientY;
    } else {
      var e_pos_x = e.clientX;
      var e_pos_y = e.clientY;
    }


    if (this.connection) {
      this.updateConnection(e_pos_x, e_pos_y);
    }
    if (this.editor_selected) {
      x = this.canvas_x + (-(this.pos_x - e_pos_x))
      y = this.canvas_y + (-(this.pos_y - e_pos_y))
      this.dispatch('translate', { x: x, y: y });
      this.precanvas.style.transform = "translate(" + x + "px, " + y + "px) scale(" + this.zoom + ")";
    }
    if (this.drag) {
      e.preventDefault();
      var x = (this.pos_x - e_pos_x) * this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom);
      var y = (this.pos_y - e_pos_y) * this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom);
      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      this.ele_selected.style.top = (this.ele_selected.offsetTop - y) + "px";
      this.ele_selected.style.left = (this.ele_selected.offsetLeft - x) + "px";

      this.drawflow.drawflow[this.module].data[this.ele_selected.id.slice(5)].pos_x = (this.ele_selected.offsetLeft - x);
      this.drawflow.drawflow[this.module].data[this.ele_selected.id.slice(5)].pos_y = (this.ele_selected.offsetTop - y);

      this.updateConnectionNodes(this.ele_selected.id)
    }

    if (this.drag_point) {

      var x = (this.pos_x - e_pos_x) * this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom);
      var y = (this.pos_y - e_pos_y) * this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom);
      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      var pos_x = this.pos_x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)));
      var pos_y = this.pos_y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)));

      this.ele_selected.setAttributeNS(null, 'cx', pos_x);
      this.ele_selected.setAttributeNS(null, 'cy', pos_y);

      const nodeUpdate = this.ele_selected.parentElement.classList[2].slice(9);
      const nodeUpdateIn = this.ele_selected.parentElement.classList[1].slice(13);
      const output_class = this.ele_selected.parentElement.classList[3];
      const input_class = this.ele_selected.parentElement.classList[4];

      let numberPointPosition = Array.from(this.ele_selected.parentElement.children).indexOf(this.ele_selected) - 1;

      if (this.reroute_fix_curvature) {
        const numberMainPath = this.ele_selected.parentElement.querySelectorAll(".main-path").length - 1;
        numberPointPosition -= numberMainPath;
        if (numberPointPosition < 0) {
          numberPointPosition = 0;
        }
      }

      const nodeId = nodeUpdate.slice(5);
      const searchConnection = this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections.findIndex(function (item, i) {
        return item.node === nodeUpdateIn && item.output === input_class;
      });

      this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points[numberPointPosition] = { pos_x: pos_x, pos_y: pos_y };

      const parentSelected = this.ele_selected.parentElement.classList[2].slice(9);

      this.updateConnectionNodes(parentSelected);
    }

    if (e.type === "touchmove") {
      this.mouse_x = e_pos_x;
      this.mouse_y = e_pos_y;
    }
    this.dispatch('mouseMove', { x: e_pos_x, y: e_pos_y });
  }

  dragEnd(e) {
    if (e.type === "touchend") {
      var e_pos_x = this.mouse_x;
      var e_pos_y = this.mouse_y;
      var ele_last = document.elementFromPoint(e_pos_x, e_pos_y);
    } else {
      var e_pos_x = e.clientX;
      var e_pos_y = e.clientY;
      var ele_last = e.target;
    }

    if (this.drag) {
      if (this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
        this.dispatch('nodeMoved', this.ele_selected.id.slice(5));
      }
    }

    if (this.drag_point) {
      this.ele_selected.classList.remove("selected");
      if (this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
        this.dispatch('rerouteMoved', this.ele_selected.parentElement.classList[2].slice(14));
      }
    }

    if (this.editor_selected) {
      this.canvas_x = this.canvas_x + (-(this.pos_x - e_pos_x));
      this.canvas_y = this.canvas_y + (-(this.pos_y - e_pos_y));
      this.editor_selected = false;
    }

    if (this.connection === true) {
      if (ele_last.classList[0] === 'input' || (this.force_first_input && (ele_last.closest(".drawflow_content_node") != null || ele_last.classList[0] === 'drawflow-node'))) {

        if (this.force_first_input && (ele_last.closest(".drawflow_content_node") != null || ele_last.classList[0] === 'drawflow-node')) {
          if (ele_last.closest(".drawflow_content_node") != null) {
            var input_id = ele_last.closest(".drawflow_content_node").parentElement.id;
          } else {
            var input_id = ele_last.id;
          }
          if (Object.keys(this.getNodeFromId(input_id.slice(5)).inputs).length === 0) {
            var input_class = false;
          } else {
            var input_class = "input_1";
          }
        } else {
          // Fix connection;
          var input_id = ele_last.closest('.drawflow-node').id;
          var input_class = ele_last.classList[1];
        }
        var output_id = this.ele_selected.closest('.drawflow-node').id;
        var output_class = this.ele_selected.classList[1];

        if (output_id !== input_id && input_class !== false) {

          if (this.container.querySelectorAll('.connection.node_in_' + input_id + '.node_out_' + output_id + '.' + output_class + '.' + input_class).length === 0) {
            // Conection no exist save connection
            this.connection_ele.classList.add("node_in_" + input_id);
            this.connection_ele.classList.add("node_out_" + output_id);
            this.connection_ele.classList.add(output_class);
            this.connection_ele.classList.add(input_class);
            var id_input = input_id.slice(5);
            var id_output = output_id.slice(5);

            this.drawflow.drawflow[this.module].data[id_output].outputs[output_class].connections.push({ "node": id_input, "output": input_class });
            this.drawflow.drawflow[this.module].data[id_input].inputs[input_class].connections.push({ "node": id_output, "input": output_class });
            this.updateConnectionNodes('node-' + id_output);
            this.updateConnectionNodes('node-' + id_input);
            this.dispatch('connectionCreated', { output_id: id_output, input_id: id_input, output_class: output_class, input_class: input_class });
          } else {
            this.dispatch('connectionCancel', true);
            this.connection_ele.remove();
          }

          this.connection_ele = null;
        } else {
          // Connection exists Remove Connection;
          this.dispatch('connectionCancel', true);
          this.connection_ele.remove();
          this.connection_ele = null;
        }

      } else {
        // Remove Connection;
        this.dispatch('connectionCancel', true);
        this.connection_ele.remove();
        this.connection_ele = null;
      }
    }

    this.drag = false;
    this.drag_point = false;
    this.connection = false;
    this.ele_selected = null;
    this.editor_selected = false;

    this.dispatch('mouseUp', e);
  }

  contextmenu(e) {
    this.dispatch('contextmenu', e);
    e.preventDefault();
    if (this.editor_mode === 'fixed' || this.editor_mode === 'view') {
      return false;
    }
    if (this.precanvas.getElementsByClassName("drawflow-delete").length) {
      this.precanvas.getElementsByClassName("drawflow-delete")[0].remove()
    };
    if (this.node_selected || this.connection_selected) {
      var deletebox = document.createElement('div');
      deletebox.classList.add("drawflow-delete");
      deletebox.innerHTML = "x";
      if (this.node_selected) {
        this.node_selected.appendChild(deletebox);

      }
      if (this.connection_selected && (this.connection_selected.parentElement.classList.length > 1)) {
        deletebox.style.top = e.clientY * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom))) + "px";
        deletebox.style.left = e.clientX * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom))) + "px";

        this.precanvas.appendChild(deletebox);

      }

    }

  }
  contextmenuDel() {
    if (this.precanvas.getElementsByClassName("drawflow-delete").length) {
      this.precanvas.getElementsByClassName("drawflow-delete")[0].remove()
    };
  }

  key(e) {
    this.dispatch('keydown', e);
    if (this.editor_mode === 'fixed' || this.editor_mode === 'view') {
      return false;
    }
    if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
      if (this.node_selected != null) {
        if (this.first_click.tagName !== 'INPUT' && this.first_click.tagName !== 'TEXTAREA' && this.first_click.hasAttribute('contenteditable') !== true) {
          this.removeNodeId(this.node_selected.id);
        }
      }
      if (this.connection_selected != null) {
        this.removeConnection();
      }
    }
  }

  zoom_enter(event, delta) {
    // if (event.ctrlKey) {
    // this.pos_x = event.clientX;
    // this.pos_y = event.clientY;

    event.preventDefault()
    if (event.deltaY > 0) {
      // Zoom Out
      this.zoom_out();
    } else {
      // Zoom In
      this.zoom_in();
    }
    // }
  }
  zoom_refresh() {
    this.dispatch('zoom', this.zoom);
    this.canvas_x = (this.canvas_x / this.zoom_last_value) * this.zoom;
    this.canvas_y = (this.canvas_y / this.zoom_last_value) * this.zoom;
    this.zoom_last_value = this.zoom;
    this.precanvas.style.transform = "translate(" + this.canvas_x + "px, " + this.canvas_y + "px) scale(" + this.zoom + ")";
  }
  zoom_in() {
    if (this.zoom < this.zoom_max) {
      this.zoom += this.zoom_value;
      this.zoom_refresh();
    }
  }
  zoom_out() {
    if (this.zoom > this.zoom_min) {
      this.zoom -= this.zoom_value;
      this.zoom_refresh();
    }
  }
  zoom_reset() {
    if (this.zoom != 1) {
      this.zoom = 1;
      this.zoom_refresh();
    }
  }

  createCurvature(start_pos_x, start_pos_y, end_pos_x, end_pos_y, curvature_value, type) {
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

  drawConnection(ele) {
    var connection = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    this.connection_ele = connection;
    var path = document.createElementNS('http://www.w3.org/2000/svg', "path");
    path.classList.add("main-path");
    path.setAttributeNS(null, 'd', '');
    // path.innerHTML = 'a';
    connection.classList.add("connection");
    connection.appendChild(path);
    this.precanvas.appendChild(connection);
    var id_output = ele.parentElement.parentElement.id.slice(5);
    var output_class = ele.classList[1];
    this.dispatch('connectionStart', { output_id: id_output, output_class: output_class });
  }


  updateConnection(eX, eY) {
    const precanvas = this.precanvas;
    const zoom = this.zoom;
    let precanvasWitdhZoom = precanvas.clientWidth / (precanvas.clientWidth * zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;
    var path = this.connection_ele.children[0];

    var line_x = this.ele_selected.offsetWidth / 2 + (this.ele_selected.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
    var line_y = this.ele_selected.offsetHeight / 2 + (this.ele_selected.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

    var x = eX * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)));
    var y = eY * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)));

    var curvature = this.curvature;
    var lineCurve = this.createCurvature(line_x, line_y, x, y, curvature, 'openclose');
    path.setAttributeNS(null, 'd', lineCurve);

  }

  addConnection(id_output, id_input, output_class, input_class) {
    var nodeOneModule = this.getModuleFromNodeId(id_output);
    var nodeTwoModule = this.getModuleFromNodeId(id_input);
    if (nodeOneModule === nodeTwoModule) {

      var dataNode = this.getNodeFromId(id_output);
      var exist = false;
      for (var checkOutput in dataNode.outputs[output_class].connections) {
        var connectionSearch = dataNode.outputs[output_class].connections[checkOutput]
        if (connectionSearch.node == id_input && connectionSearch.output == input_class) {
          exist = true;
        }
      }
      // Check connection exist
      if (exist === false) {
        //Create Connection
        this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].connections.push({ "node": id_input.toString(), "output": input_class });
        this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[input_class].connections.push({ "node": id_output.toString(), "input": output_class });

        if (this.module === nodeOneModule) {
          //Draw connection
          var connection = document.createElementNS('http://www.w3.org/2000/svg', "svg");
          var path = document.createElementNS('http://www.w3.org/2000/svg', "path");
          path.classList.add("main-path");
          path.setAttributeNS(null, 'd', '');
          // path.innerHTML = 'a';
          connection.classList.add("connection");
          connection.classList.add("node_in_node-" + id_input);
          connection.classList.add("node_out_node-" + id_output);
          connection.classList.add(output_class);
          connection.classList.add(input_class);
          connection.appendChild(path);
          this.precanvas.appendChild(connection);
          this.updateConnectionNodes('node-' + id_output);
          this.updateConnectionNodes('node-' + id_input);
        }
        this.dispatch('connectionCreated', { output_id: id_output, input_id: id_input, output_class: output_class, input_class: input_class });
      }
    }
  }

  updateConnectionNodes(id) {

    // Aquí nos quedamos;
    const idSearch = 'node_in_' + id;
    const idSearchOut = 'node_out_' + id;
    var line_path = this.line_path / 2;
    const container = this.container;
    const precanvas = this.precanvas;
    const curvature = this.curvature;
    const createCurvature = this.createCurvature;
    const reroute_curvature = this.reroute_curvature;
    const reroute_curvature_start_end = this.reroute_curvature_start_end;
    const reroute_fix_curvature = this.reroute_fix_curvature;
    const rerouteWidth = this.reroute_width;
    const zoom = this.zoom;
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

  dblclick(e) {
    if (this.connection_selected != null && this.reroute) {
      this.createReroutePoint(this.connection_selected);
    }

    if (e.target.classList[0] === 'point') {
      this.removeReroutePoint(e.target);
    }
  }

  createReroutePoint(ele) {
    this.connection_selected.classList.remove("selected");
    const nodeUpdate = this.connection_selected.parentElement.classList[2].slice(9);
    const nodeUpdateIn = this.connection_selected.parentElement.classList[1].slice(13);
    const output_class = this.connection_selected.parentElement.classList[3];
    const input_class = this.connection_selected.parentElement.classList[4];
    this.connection_selected = null;
    const point = document.createElementNS('http://www.w3.org/2000/svg', "circle");
    point.classList.add("point");
    var pos_x = this.pos_x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)));
    var pos_y = this.pos_y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)));

    point.setAttributeNS(null, 'cx', pos_x);
    point.setAttributeNS(null, 'cy', pos_y);
    point.setAttributeNS(null, 'r', this.reroute_width);

    let position_add_array_point = 0;
    if (this.reroute_fix_curvature) {

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

    const nodeId = nodeUpdate.slice(5);
    const searchConnection = this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections.findIndex(function (item, i) {
      return item.node === nodeUpdateIn && item.output === input_class;
    });

    if (this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points === undefined) {
      this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points = [];
    }

    if (this.reroute_fix_curvature) {

      if (position_add_array_point > 0 || this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points != []) {
        this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points.splice(position_add_array_point, 0, { pos_x: pos_x, pos_y: pos_y });
      } else {
        this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points.push({ pos_x: pos_x, pos_y: pos_y });
      }

      ele.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
        item.classList.remove("selected");
      });

    } else {
      this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points.push({ pos_x: pos_x, pos_y: pos_y });
    }

    this.dispatch('addReroute', nodeId);
    this.updateConnectionNodes(nodeUpdate);
  }

  removeReroutePoint(ele) {
    const nodeUpdate = ele.parentElement.classList[2].slice(9)
    const nodeUpdateIn = ele.parentElement.classList[1].slice(13);
    const output_class = ele.parentElement.classList[3];
    const input_class = ele.parentElement.classList[4];

    let numberPointPosition = Array.from(ele.parentElement.children).indexOf(ele);
    const nodeId = nodeUpdate.slice(5);
    const searchConnection = this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections.findIndex(function (item, i) {
      return item.node === nodeUpdateIn && item.output === input_class;
    });

    if (this.reroute_fix_curvature) {
      const numberMainPath = ele.parentElement.querySelectorAll(".main-path").length
      ele.parentElement.children[numberMainPath - 1].remove();
      numberPointPosition -= numberMainPath;
      if (numberPointPosition < 0) {
        numberPointPosition = 0;
      }
    } else {
      numberPointPosition--;
    }
    this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points.splice(numberPointPosition, 1);

    ele.remove();
    this.dispatch('removeReroute', nodeId);
    this.updateConnectionNodes(nodeUpdate);
  }

  registerNode(name, html, props = null, options = null) {
    this.noderegister[name] = {html: html, props: props, options: options};
  }

  getNode(id) {
    let moduleName = this.getModuleFromNodeId(id)
    return this.drawflow.drawflow[moduleName].data[id];
  }

  getNodeFromId(id) {
    var moduleName = this.getModuleFromNodeId(id)
    return JSON.parse(JSON.stringify(this.drawflow.drawflow[moduleName].data[id]));
  }

  getNodesFromName(name) {
    var nodes = [];
    const editor = this.drawflow.drawflow
    Object.keys(editor).map(function (moduleName, index) {
      for (var node in editor[moduleName].data) {
        if (editor[moduleName].data[node].name == name) {
          nodes.push(editor[moduleName].data[node].id);
        }
      }
    });
    return nodes;
  }


  getIcon(type) {
    if (type == 'filepath') {
      return 'fas fa-regular fa-file'
    }
    else if (type == 'image') {
      return 'fas fa-thin fa-images'
    }
    else if (type == 'text') {
      return 'fa fa-font'
    }
    else if (type == 'str') {
      return 'fa fa-font'
    }
    else if (type == 'int') {
      return 'fa fa-hashtag'
    }
    else if (type == 'float') {
      return 'fa fa-hashtag'
    }
    else if (type == 'List[int]') {
      return 'fa fa-hashtag'
    }
    else if (type == 'view') {
      return 'fa fa-eye'
    }
    else if (type == 'controller') {
      return 'fa fa-gamepad'
    }
    else {
      return 'fa fa-star'
    }
  }

  defaultBlockProducer(block, pos_x, pos_y) {
    var newNodeId = null;
    if (this.useuuid) {
      newNodeId = this.getUuid();
    } else {
      newNodeId = this.nodeId;
    }

    let html_str = ""
    let params = block.action?.parameters;
    let first_key;

    if (block.views.node.html != "") {
      for (let key in params) {
        first_key = key;
        break;
      }

      let parser = new DOMParser()
      let doc = parser.parseFromString(block.views.node.html, 'text/html')
      //NOT SURE WE NEED THIS LINE
      doc.body.firstChild.setAttribute('value', params[first_key].value);
      html_str = doc.body.firstChild.outerHTML;
    }

    var title_background_color = 'rgba(107, 43, 224, 1)';
    if (block.views.node.title_bar && block.views.node.title_bar.background_color) {
      title_background_color = block.views.node.title_bar.background_color;
    }

    var preview = "";
    if (block.views.node.preview && block.views.node.preview.active && block.views.node.preview.active == 'true') {
      preview =`
      <style>
        .iframe_preview {
            transform: scale(0.5);
            transform-origin: 0 0;
            width: 200%; 
            height: 200%;
        }
      </style>
      <div style="position: absolute; top: -265px; left: 0; width: 300px; height: 250px; max-width: 800px; border: 2px solid #333; border-radius: 5px; overflow: hidden;">
        <div>
            <iframe class="iframe_preview" id="${newNodeId} "src="" style="border: none; position: absolute; top: 0; left: 0;"></iframe>
        </div>
      </div>  
      `
    }

    var html_title = `
    <div>    
      <div class="title-box" style="display: flex; align-items: center;background-color:`+ title_background_color +`;"> 
          ${block.information.name}
          <div style="margin-left: auto; display: flex;">
              <button id="btn_open_code" class="view-btn">
                  <div>
                      <svg class="mySvg" style="margin-bottom:15px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" stroke="#5eb017" stroke-width="0.6" class="bi bi-eye" viewBox="0 0 16 16"> 
                      <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/>
                      </svg>
                  </div>
              </button>
              <button id='btn_show_view' class="view-btn" style="visibility:visible;" onclick="openView(`+ newNodeId + `)">
                  <div>
                      <svg class="mySvg" style="margin-bottom:15px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" stroke="#5eb017" stroke-width="0.6" class="bi bi-eye" viewBox="0 0 16 16"> 
                      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/> <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/> 
                      </svg>
                  </div>
              </button>
          </div>
      </div>
      <div class="box" style="position:relative;top:30px;">
          ${html_str}
      </div>
      ${preview}
    </div>
    `;

    const name = block.information.id.substring(0, block.information.id.lastIndexOf("-"));
    // const num_in =10;
    // const num_out=6;
    const classoverride = block.information.id.substring(0, block.information.id.lastIndexOf("-"))
    const data = {}
    const html = html_title;


    const input_variable_names = Object.keys(block.inputs);
    const input_types = input_variable_names.map(v => block.inputs[v].type)

    const output_variable_names = Object.keys(block.outputs);
    const output_types = output_variable_names.map(v => block.outputs[v].type)

    const typenode = false;
    const parent = document.createElement('div');
    parent.classList.add("parent-node");

    const node = document.createElement('div');
    node.innerHTML = "";
    node.setAttribute("id", "node-" + newNodeId);
    node.classList.add("drawflow-node");
    if (classoverride != '') {
      node.classList.add(...classoverride.split(' '));
    }

    const inputs = document.createElement('div');
    inputs.classList.add("inputs");

    const outputs = document.createElement('div');
    outputs.classList.add("outputs");

    const json_inputs = {}
    let input_max = 0;
    for (let x = 0; x < input_variable_names.length; x++) {
      const input = document.createElement('div');
      input.classList.add("input");
      // input.classList.add("input_"+(x+1));
      input.classList.add(input_variable_names[x]);


      // Add the icon representing the type
      const wrap = document.createElement('span');
      wrap.classList.add("type-icon")
      // wrap.innerHTML = '<i class="'+'fas fa-thin fa-images'+'"></i>';
      wrap.innerHTML = '<i class="' + this.getIcon(input_types[x]) + '"></i>';
      input.appendChild(wrap);

      // Add the variable name
      const label = document.createElement('span');
      label.classList.add("variable-text")
      // label.innerHTML = 'Input ' + (x + 1) + ': hello';
      label.innerHTML = input_variable_names[x];
      input.appendChild(label);
      // json_inputs["input_"+(x+1)] = { "connections": []};
      json_inputs[input_variable_names[x]] = { "connections": [] };
      inputs.appendChild(input);

      // Compute the width of the text by adding and removing it from the DOM
      const label2 = document.createElement('span');
      label2.classList.add("variable-text")
      label2.innerHTML = input_variable_names[x];
      document.body.appendChild(label2);
      const width_of_input = label2.offsetWidth;
      document.body.removeChild(label2);

      if (width_of_input > input_max) {
        input_max = width_of_input;
      }
    }

    const json_outputs = {}
    let output_max = 0;
    for (let x = 0; x < output_variable_names.length; x++) {
      const output = document.createElement('div');
      output.classList.add("output");
      // output.classList.add("output_"+(x+1));
      output.classList.add(output_variable_names[x]);
      output.style.left = 10 + 'px';

      // Add the icon representing the type
      const wrap = document.createElement('span');
      wrap.classList.add("type-icon")
      wrap.innerHTML = '<i class="' + this.getIcon(output_types[x]) + '"></i>';
      wrap.style.left = (-60) + 'px';
      output.appendChild(wrap);

      // Add the variable name
      const label = document.createElement('span');
      label.classList.add("variable-text-output")

      label.innerHTML = output_variable_names[x];

      json_outputs[output_variable_names[x]] = { "connections": [] };



      // Compute the width of the text by adding and removing it from the DOM
      const label2 = document.createElement('span');
      label2.classList.add("variable-text-output")
      label2.innerHTML = output_variable_names[x];
      document.body.appendChild(label2);
      const width_of_output = label2.offsetWidth;
      document.body.removeChild(label2);

      label.style.left = (-width_of_output - 80) + 'px';
      output.appendChild(label);

      outputs.appendChild(output);

      if (width_of_output > output_max) {
        output_max = width_of_output;
      }
    }

    // Set width of node
    let min_width = 150;
    if (first_key == 'text') {
      min_width = 250;
    }
    const textWidth = input_max + output_max;
    node.style.width = min_width + textWidth + 'px';

    // TODO: Fix this. It's a hack because of the CSS
    // Could either calculate the height of the injected HTML
    // or attempt to make this (declarative) react code
    const argMax = Math.max(output_variable_names.length, input_variable_names.length)
    const height = (argMax * 20) + 100
    node.style.height = height + 'px';

    const content = document.createElement('div');
    content.classList.add("drawflow_content_node");

    content.innerHTML = html;

    Object.entries(data).forEach(function (key, value) {
      if (typeof key[1] === "object") {
        insertObjectkeys(null, key[0], key[0]);
      } else {
        var elems = content.querySelectorAll('[parameters-' + key[0] + ']');
        for (var i = 0; i < elems.length; i++) {
          elems[i].value = key[1];
          if (elems[i].isContentEditable) {
            elems[i].innerText = key[1];
          }
        }
      }
    })

    function insertObjectkeys(object, name, completname) {
      if (object === null) {
        var object = data[name];
      } else {
        var object = object[name]
      }
      if (object !== null) {
        Object.entries(object).forEach(function (key, value) {
          if (typeof key[1] === "object") {
            insertObjectkeys(object, key[0], completname + '-' + key[0]);
          } else {
            var elems = content.querySelectorAll('[parameters-' + completname + '-' + key[0] + ']');
            for (var i = 0; i < elems.length; i++) {
              elems[i].value = key[1];
              if (elems[i].isContentEditable) {
                elems[i].innerText = key[1];
              }
            }
          }
        });
      }
    }

    const openCodeButton = content.querySelector("#btn_open_code")
    openCodeButton.addEventListener("click", () => {
      this.openViewCallback(newNodeId)
    })

    node.appendChild(inputs);
    node.appendChild(content);
    node.appendChild(outputs);
    node.style.top = pos_y + "px";
    node.style.left = pos_x + "px";
    parent.appendChild(node);
    this.precanvas.appendChild(parent);
    const json = {
      id: newNodeId,
      name: name,
      block: block,
      data: data,
      class: classoverride,
      html: html,
      typenode: typenode,
      inputs: json_inputs,
      outputs: json_outputs,
      pos_x: pos_x,
      pos_y: pos_y,
    }

    return json
  }

  defaultNodeCreation(block, pos_x, pos_y) {
    const node = this.defaultBlockProducer(block, pos_x, pos_y)
    this.addNode_from_JSON(node)
  }

  getNextId() {
    let ids = Object.keys(this.drawflow.drawflow[this.module].data)
    ids = ids.map((id) => (parseInt(id)))
    if (ids.length == 0) {
      return 1
    } else {
      const max = Math.max(...ids)
      return max + 1;
    }
  }

  addNode_from_JSON(json) {
    this.drawflow.drawflow[this.module].data[json.id] = json;
    this.dispatch('nodeCreated', json);
    return json.id;
  }

  addNodeImport(dataNode, precanvas) {
    const parent = document.createElement('div');
    parent.classList.add("parent-node");

    const node = document.createElement('div');
    node.innerHTML = "";
    node.setAttribute("id", "node-" + dataNode.id);
    node.classList.add("drawflow-node");
    if (dataNode.class != '') {
      node.classList.add(...dataNode.class.split(' '));
    }

    const inputs = document.createElement('div');
    inputs.classList.add("inputs");

    const outputs = document.createElement('div');
    outputs.classList.add("outputs");

    Object.keys(dataNode.inputs).map(function (input_item, index) {
      const input = document.createElement('div');
      input.classList.add("input");
      input.classList.add(input_item);
      inputs.appendChild(input);
      Object.keys(dataNode.inputs[input_item].connections).map(function (output_item, index) {

        var connection = document.createElementNS('http://www.w3.org/2000/svg', "svg");
        var path = document.createElementNS('http://www.w3.org/2000/svg', "path");
        path.classList.add("main-path");
        path.setAttributeNS(null, 'd', '');
        // path.innerHTML = 'a';
        connection.classList.add("connection");
        connection.classList.add("node_in_node-" + dataNode.id);
        connection.classList.add("node_out_node-" + dataNode.inputs[input_item].connections[output_item].node);
        connection.classList.add(dataNode.inputs[input_item].connections[output_item].input);
        connection.classList.add(input_item);

        connection.appendChild(path);
        precanvas.appendChild(connection);

      });
    });

    for (var x = 0; x < Object.keys(dataNode.outputs).length; x++) {
      const output = document.createElement('div');
      output.classList.add("output");
      output.classList.add("output_" + (x + 1));
      outputs.appendChild(output);
    }

    const content = document.createElement('div');
    content.classList.add("drawflow_content_node");

    if (dataNode.typenode === false) {
      content.innerHTML = dataNode.html;
    } else if (dataNode.typenode === true) {
      content.appendChild(this.noderegister[dataNode.html].html.cloneNode(true));
    } else {
      if (parseInt(this.render.version) === 3) {
        //Vue 3
        let wrapper = this.render.h(this.noderegister[dataNode.html].html, this.noderegister[dataNode.html].props, this.noderegister[dataNode.html].options);
        wrapper.appContext = this.parent;
        this.render.render(wrapper, content);

      } else {
        //Vue 2
        let wrapper = new this.render({
          parent: this.parent,
          render: h => h(this.noderegister[dataNode.html].html, { props: this.noderegister[dataNode.html].props }),
          ...this.noderegister[dataNode.html].options
        }).$mount()
        content.appendChild(wrapper.$el);
      }
    }

    Object.entries(dataNode.data).forEach(function (key, value) {
      if (typeof key[1] === "object") {
        insertObjectkeys(null, key[0], key[0]);
      } else {
        var elems = content.querySelectorAll('[df-' + key[0] + ']');
        for (var i = 0; i < elems.length; i++) {
          elems[i].value = key[1];
          if (elems[i].isContentEditable) {
            elems[i].innerText = key[1];
          }
        }
      }
    })

    function insertObjectkeys(object, name, completname) {
      if (object === null) {
        var object = dataNode.data[name];
      } else {
        var object = object[name]
      }
      if (object !== null) {
        Object.entries(object).forEach(function (key, value) {
          if (typeof key[1] === "object") {
            insertObjectkeys(object, key[0], completname + '-' + key[0]);
          } else {
            var elems = content.querySelectorAll('[df-' + completname + '-' + key[0] + ']');
            for (var i = 0; i < elems.length; i++) {
              elems[i].value = key[1];
              if (elems[i].isContentEditable) {
                elems[i].innerText = key[1];
              }
            }
          }
        });
      }
    }
    node.appendChild(inputs);
    node.appendChild(content);
    node.appendChild(outputs);
    node.style.top = dataNode.pos_y + "px";
    node.style.left = dataNode.pos_x + "px";
    parent.appendChild(node);
    this.precanvas.appendChild(parent);
  }

  addRerouteImport(dataNode) {
    const reroute_width = this.reroute_width
    const reroute_fix_curvature = this.reroute_fix_curvature
    const container = this.container;
    Object.keys(dataNode.outputs).map(function (output_item, index) {
      Object.keys(dataNode.outputs[output_item].connections).map(function (input_item, index) {
        const points = dataNode.outputs[output_item].connections[input_item].points
        if (points !== undefined) {

          points.forEach((item, i) => {
            const input_id = dataNode.outputs[output_item].connections[input_item].node;
            const input_class = dataNode.outputs[output_item].connections[input_item].output;
            const ele = container.querySelector('.connection.node_in_node-' + input_id + '.node_out_node-' + dataNode.id + '.' + output_item + '.' + input_class);

            if (reroute_fix_curvature) {
              if (i === 0) {
                for (var z = 0; z < points.length; z++) {
                  var path = document.createElementNS('http://www.w3.org/2000/svg', "path");
                  path.classList.add("main-path");
                  path.setAttributeNS(null, 'd', '');
                  ele.appendChild(path);

                }
              }
            }

            const point = document.createElementNS('http://www.w3.org/2000/svg', "circle");
            point.classList.add("point");
            var pos_x = item.pos_x;
            var pos_y = item.pos_y;

            point.setAttributeNS(null, 'cx', pos_x);
            point.setAttributeNS(null, 'cy', pos_y);
            point.setAttributeNS(null, 'r', reroute_width);

            ele.appendChild(point);
          });
        };
      });
    });
  }

  updateNodeValue(event) {
    // fires on 'input'
    var attr = event.target.attributes
    for (var i = 0; i < attr.length; i++) {
      if (attr[i].nodeName.startsWith('parameters-')) {
        // var keys = attr[i].nodeName.slice(3).split("-");
        var keys = attr[i].nodeName.slice(11).split("-");
        var target = this.drawflow.drawflow[this.module].data[event.target.closest(".drawflow_content_node").parentElement.id.slice(5)].data;
        for (var index = 0; index < keys.length - 1; index += 1) {
          if (target[keys[index]] == null) {
            target[keys[index]] = {};
          }
          target = target[keys[index]];
        }
        target[keys[keys.length - 1]] = event.target.value;
        if (event.target.isContentEditable) {
          target[keys[keys.length - 1]] = event.target.innerText;
        }
        this.dispatch('nodeDataChanged', event.target.closest(".drawflow_content_node").parentElement.id.slice(5));
      }
    }
  }

  updateNodeDataFromId(id, data) {
    var moduleName = this.getModuleFromNodeId(id)
    this.drawflow.drawflow[moduleName].data[id].data = data;
    if (this.module === moduleName) {
      const content = this.container.querySelector('#node-' + id);

      Object.entries(data).forEach(function (key, value) {
        if (typeof key[1] === "object") {
          insertObjectkeys(null, key[0], key[0]);
        } else {
          var elems = content.querySelectorAll('[df-' + key[0] + ']');
          for (var i = 0; i < elems.length; i++) {
            elems[i].value = key[1];
            if (elems[i].isContentEditable) {
              elems[i].innerText = key[1];
            }
          }
        }
      })

      function insertObjectkeys(object, name, completname) {
        if (object === null) {
          var object = data[name];
        } else {
          var object = object[name]
        }
        if (object !== null) {
          Object.entries(object).forEach(function (key, value) {
            if (typeof key[1] === "object") {
              insertObjectkeys(object, key[0], completname + '-' + key[0]);
            } else {
              var elems = content.querySelectorAll('[df-' + completname + '-' + key[0] + ']');
              for (var i = 0; i < elems.length; i++) {
                elems[i].value = key[1];
                if (elems[i].isContentEditable) {
                  elems[i].innerText = key[1];
                }
              }
            }
          });
        }
      }

    }
  }

  addNodeInput(id) {
    var moduleName = this.getModuleFromNodeId(id)
    const infoNode = this.getNodeFromId(id)
    const numInputs = Object.keys(infoNode.inputs).length;
    if (this.module === moduleName) {
      //Draw input
      const input = document.createElement('div');
      input.classList.add("input");
      input.classList.add("input_" + (numInputs + 1));
      const parent = this.container.querySelector('#node-' + id + ' .inputs');
      parent.appendChild(input);
      this.updateConnectionNodes('node-' + id);

    }
    this.drawflow.drawflow[moduleName].data[id].inputs["input_" + (numInputs + 1)] = { "connections": [] };
  }

  addNodeOutput(id) {
    var moduleName = this.getModuleFromNodeId(id)
    const infoNode = this.getNodeFromId(id)
    const numOutputs = Object.keys(infoNode.outputs).length;
    if (this.module === moduleName) {
      //Draw output
      const output = document.createElement('div');
      output.classList.add("output");
      output.classList.add("output_" + (numOutputs + 1));
      const parent = this.container.querySelector('#node-' + id + ' .outputs');
      parent.appendChild(output);
      this.updateConnectionNodes('node-' + id);

    }
    this.drawflow.drawflow[moduleName].data[id].outputs["output_" + (numOutputs + 1)] = { "connections": [] };
  }

  removeNodeInput(id, input_class) {
    var moduleName = this.getModuleFromNodeId(id)
    const infoNode = this.getNodeFromId(id)
    if (this.module === moduleName) {
      this.container.querySelector('#node-' + id + ' .inputs .input.' + input_class).remove();
    }
    const removeInputs = [];
    Object.keys(infoNode.inputs[input_class].connections).map(function (key, index) {
      const id_output = infoNode.inputs[input_class].connections[index].node;
      const output_class = infoNode.inputs[input_class].connections[index].input;
      removeInputs.push({ id_output, id, output_class, input_class })
    })
    // Remove connections
    removeInputs.forEach((item, i) => {
      this.removeSingleConnection(item.id_output, item.id, item.output_class, item.input_class);
    });

    delete this.drawflow.drawflow[moduleName].data[id].inputs[input_class];

    // Update connection
    const connections = [];
    const connectionsInputs = this.drawflow.drawflow[moduleName].data[id].inputs
    Object.keys(connectionsInputs).map(function (key, index) {
      connections.push(connectionsInputs[key]);
    });
    this.drawflow.drawflow[moduleName].data[id].inputs = {};
    const input_class_id = input_class.slice(6);
    let nodeUpdates = [];
    connections.forEach((item, i) => {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push(itemx);
      });
      this.drawflow.drawflow[moduleName].data[id].inputs['input_' + (i + 1)] = item;
    });
    nodeUpdates = new Set(nodeUpdates.map(e => JSON.stringify(e)));
    nodeUpdates = Array.from(nodeUpdates).map(e => JSON.parse(e));

    if (this.module === moduleName) {
      const eles = this.container.querySelectorAll("#node-" + id + " .inputs .input");
      eles.forEach((item, i) => {
        const id_class = item.classList[1].slice(6);
        if (parseInt(input_class_id) < parseInt(id_class)) {
          item.classList.remove('input_' + id_class);
          item.classList.add('input_' + (id_class - 1));
        }
      });

    }

    nodeUpdates.forEach((itemx, i) => {
      this.drawflow.drawflow[moduleName].data[itemx.node].outputs[itemx.input].connections.forEach((itemz, g) => {
        if (itemz.node == id) {
          const output_id = itemz.output.slice(6);
          if (parseInt(input_class_id) < parseInt(output_id)) {
            if (this.module === moduleName) {
              const ele = this.container.querySelector(".connection.node_in_node-" + id + ".node_out_node-" + itemx.node + "." + itemx.input + ".input_" + output_id);
              ele.classList.remove('input_' + output_id);
              ele.classList.add('input_' + (output_id - 1));
            }
            if (itemz.points) {
              this.drawflow.drawflow[moduleName].data[itemx.node].outputs[itemx.input].connections[g] = { node: itemz.node, output: 'input_' + (output_id - 1), points: itemz.points }
            } else {
              this.drawflow.drawflow[moduleName].data[itemx.node].outputs[itemx.input].connections[g] = { node: itemz.node, output: 'input_' + (output_id - 1) }
            }
          }
        }
      });
    });
    this.updateConnectionNodes('node-' + id);
  }

  removeNodeOutput(id, output_class) {
    var moduleName = this.getModuleFromNodeId(id)
    const infoNode = this.getNodeFromId(id)
    if (this.module === moduleName) {
      this.container.querySelector('#node-' + id + ' .outputs .output.' + output_class).remove();
    }
    const removeOutputs = [];
    Object.keys(infoNode.outputs[output_class].connections).map(function (key, index) {
      const id_input = infoNode.outputs[output_class].connections[index].node;
      const input_class = infoNode.outputs[output_class].connections[index].output;
      removeOutputs.push({ id, id_input, output_class, input_class })
    })
    // Remove connections
    removeOutputs.forEach((item, i) => {
      this.removeSingleConnection(item.id, item.id_input, item.output_class, item.input_class);
    });

    delete this.drawflow.drawflow[moduleName].data[id].outputs[output_class];

    // Update connection
    const connections = [];
    const connectionsOuputs = this.drawflow.drawflow[moduleName].data[id].outputs
    Object.keys(connectionsOuputs).map(function (key, index) {
      connections.push(connectionsOuputs[key]);
    });
    this.drawflow.drawflow[moduleName].data[id].outputs = {};
    const output_class_id = output_class.slice(7);
    let nodeUpdates = [];
    connections.forEach((item, i) => {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push({ node: itemx.node, output: itemx.output });
      });
      this.drawflow.drawflow[moduleName].data[id].outputs['output_' + (i + 1)] = item;
    });
    nodeUpdates = new Set(nodeUpdates.map(e => JSON.stringify(e)));
    nodeUpdates = Array.from(nodeUpdates).map(e => JSON.parse(e));

    if (this.module === moduleName) {
      const eles = this.container.querySelectorAll("#node-" + id + " .outputs .output");
      eles.forEach((item, i) => {
        const id_class = item.classList[1].slice(7);
        if (parseInt(output_class_id) < parseInt(id_class)) {
          item.classList.remove('output_' + id_class);
          item.classList.add('output_' + (id_class - 1));
        }
      });

    }

    nodeUpdates.forEach((itemx, i) => {
      this.drawflow.drawflow[moduleName].data[itemx.node].inputs[itemx.output].connections.forEach((itemz, g) => {
        if (itemz.node == id) {
          const input_id = itemz.input.slice(7);
          if (parseInt(output_class_id) < parseInt(input_id)) {
            if (this.module === moduleName) {

              const ele = this.container.querySelector(".connection.node_in_node-" + itemx.node + ".node_out_node-" + id + ".output_" + input_id + "." + itemx.output);
              ele.classList.remove('output_' + input_id);
              ele.classList.remove(itemx.output);
              ele.classList.add('output_' + (input_id - 1));
              ele.classList.add(itemx.output);
            }
            if (itemz.points) {
              this.drawflow.drawflow[moduleName].data[itemx.node].inputs[itemx.output].connections[g] = { node: itemz.node, input: 'output_' + (input_id - 1), points: itemz.points }
            } else {
              this.drawflow.drawflow[moduleName].data[itemx.node].inputs[itemx.output].connections[g] = { node: itemz.node, input: 'output_' + (input_id - 1) }
            }
          }
        }
      });
    });

    this.updateConnectionNodes('node-' + id);
  }

  updateNodeAfterSavingCode(blockName_base, code_content) {
    var uuid = uuidv4();
    var blockName = blockName_base +'_'+ uuid

    let id = this.node_selected.id
    let pos_y = this.node_selected.style.top;
    let pos_x = this.node_selected.style.left;

    //Generate specs and folder using the name
    $.ajax({
      type: "POST",
      url: "/new-block",
      data: JSON.stringify({ block_user_name: blockName_base, block_name: blockName, computations_script: code_content }),
      contentType: "application/json",
      dataType: "json",
      success: function (data) {
        console.log("Response stdout: " + data.stdout);
        console.log("Response stderr: " + data.stderr);
      },
      error: function (xhr, status, error) {
        console.error("Request failed: " + status + " - " + error);
      }
    });


    this.removeConnectionNodeId(id);
    var moduleName = this.getModuleFromNodeId(id.slice(5))
    if (this.module === moduleName) {
      this.container.querySelector(`#${id}`).remove();
    }
    delete this.drawflow.drawflow[moduleName].data[id.slice(5)];
    this.dispatch('nodeRemoved', id.slice(5));


    // Load Specs
    // Wait for a few seconds before loading the files\
    const fileToLoad = ['my_blocks/' + blockName + "/specs.json"];
    let jsonDataArrayGlobal1 = [];
    setTimeout(() => {
      loadFiles(fileToLoad)
        .then((fileDataArray1) => {
          console.log("Files loaded successfully:", fileDataArray1);

          jsonDataArrayGlobal1 = fileDataArray1;

          pos_x = pos_x.slice(0, -2);
          pos_y = pos_y.slice(0, -2);
          //Add back the node with proper inputs and outputs
          editor.addNode_from_JSON(jsonDataArrayGlobal1[0].block, pos_x, pos_y);
        })
        .catch((error) => {
          console.error("Error loading files:", error);
        });
    }, 3000);  // Delay is in milliseconds
  }

  registerRemoveNode(subscriber){
    this.removeNodeSubscribers.push(subscriber);
  }

  removeNodeId(id) {
    this.removeConnectionNodeId(id);
    var moduleName = this.getModuleFromNodeId(id.slice(5))
    delete this.drawflow.drawflow[moduleName].data[id.slice(5)];
    this.dispatch('nodeRemoved', id.slice(5));
  }

  removeConnection() {
    if (this.connection_selected != null) {
      var listclass = this.connection_selected.parentElement.classList;
      this.connection_selected.parentElement.remove();
      var index_out = this.drawflow.drawflow[this.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.findIndex(function (item, i) {
        return item.node === listclass[1].slice(13) && item.output === listclass[4]
      });
      this.drawflow.drawflow[this.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.splice(index_out, 1);

      var index_in = this.drawflow.drawflow[this.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.findIndex(function (item, i) {
        return item.node === listclass[2].slice(14) && item.input === listclass[3]
      });
      this.drawflow.drawflow[this.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.splice(index_in, 1);
      this.dispatch('connectionRemoved', { output_id: listclass[2].slice(14), input_id: listclass[1].slice(13), output_class: listclass[3], input_class: listclass[4] });
      this.connection_selected = null;
    }
  }

  removeSingleConnection(id_output, id_input, output_class, input_class) {
    var nodeOneModule = this.getModuleFromNodeId(id_output);
    var nodeTwoModule = this.getModuleFromNodeId(id_input);
    if (nodeOneModule === nodeTwoModule) {
      // Check nodes in same module.

      // Check connection exist
      var exists = this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].connections.findIndex(function (item, i) {
        return item.node == id_input && item.output === input_class
      });
      if (exists > -1) {

        if (this.module === nodeOneModule) {
          // In same module with view.
          this.container.querySelector('.connection.node_in_node-' + id_input + '.node_out_node-' + id_output + '.' + output_class + '.' + input_class).remove();
        }

        var index_out = this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].connections.findIndex(function (item, i) {
          return item.node == id_input && item.output === input_class
        });
        this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].connections.splice(index_out, 1);

        var index_in = this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[input_class].connections.findIndex(function (item, i) {
          return item.node == id_output && item.input === output_class
        });
        this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[input_class].connections.splice(index_in, 1);

        this.dispatch('connectionRemoved', { output_id: id_output, input_id: id_input, output_class: output_class, input_class: input_class });
        return true;

      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  removeConnectionNodeId(id) {
    const idSearchIn = 'node_in_' + id;
    const idSearchOut = 'node_out_' + id;

    const elemsOut = this.container.querySelectorAll(`.${idSearchOut}`);
    for (var i = elemsOut.length - 1; i >= 0; i--) {
      var listclass = elemsOut[i].classList;

      var index_in = this.drawflow.drawflow[this.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.findIndex(function (item, i) {
        return item.node === listclass[2].slice(14) && item.input === listclass[3]
      });
      this.drawflow.drawflow[this.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.splice(index_in, 1);

      var index_out = this.drawflow.drawflow[this.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.findIndex(function (item, i) {
        return item.node === listclass[1].slice(13) && item.output === listclass[4]
      });
      this.drawflow.drawflow[this.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.splice(index_out, 1);

      elemsOut[i].remove();

      this.dispatch('connectionRemoved', { output_id: listclass[2].slice(14), input_id: listclass[1].slice(13), output_class: listclass[3], input_class: listclass[4] });
    }

    const elemsIn = this.container.querySelectorAll(`.${idSearchIn}`);
    for (var i = elemsIn.length - 1; i >= 0; i--) {

      var listclass = elemsIn[i].classList;

      var index_out = this.drawflow.drawflow[this.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.findIndex(function (item, i) {
        return item.node === listclass[1].slice(13) && item.output === listclass[4]
      });
      this.drawflow.drawflow[this.module].data[listclass[2].slice(14)].outputs[listclass[3]].connections.splice(index_out, 1);

      var index_in = this.drawflow.drawflow[this.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.findIndex(function (item, i) {
        return item.node === listclass[2].slice(14) && item.input === listclass[3]
      });
      this.drawflow.drawflow[this.module].data[listclass[1].slice(13)].inputs[listclass[4]].connections.splice(index_in, 1);

      elemsIn[i].remove();

      this.dispatch('connectionRemoved', { output_id: listclass[2].slice(14), input_id: listclass[1].slice(13), output_class: listclass[3], input_class: listclass[4] });
    }
  }

  getModuleFromNodeId(id) {
    var nameModule;
    const editor = this.drawflow.drawflow
    Object.keys(editor).map(function (moduleName, index) {
      Object.keys(editor[moduleName].data).map(function (node, index2) {
        if (node == id) {
          nameModule = moduleName;
        }
      })
    });
    return nameModule;
  }

  addModule(name) {
    this.drawflow.drawflow[name] = { "data": {} };
    this.dispatch('moduleCreated', name);
  }
  changeModule(name) {
    this.dispatch('moduleChanged', name);
    this.module = name;
    this.precanvas.innerHTML = "";
    this.canvas_x = 0;
    this.canvas_y = 0;
    this.pos_x = 0;
    this.pos_y = 0;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.zoom = 1;
    this.zoom_last_value = 1;
    this.precanvas.style.transform = '';
    this.import(this.drawflow, false);
  }

  removeModule(name) {
    if (this.module === name) {
      this.changeModule('Home');
    }
    delete this.drawflow.drawflow[name];
    this.dispatch('moduleRemoved', name);
  }

  clearModuleSelected() {
    this.precanvas.innerHTML = "";
    this.drawflow.drawflow[this.module] = { "data": {} };
    this.nodeId = 1;
  }

  clear() {
    this.precanvas.innerHTML = "";
    this.drawflow = { "drawflow": { "Home": { "data": {} } } };
  }

  clearDrawflowData() {
    this.drawflow = { "drawflow": { "Home": {"data": {} } } }
  }

  export() {
    const dataExport = JSON.parse(JSON.stringify(this.drawflow));
    this.dispatch('export', dataExport);
    return dataExport;
  }


  renameKey(obj, oldKey, newKey) {
    if (oldKey === newKey) {
      return obj;
    }

    if (oldKey in obj) {
      obj[newKey] = obj[oldKey];
      delete obj[oldKey];
    }

    return obj;
  }


  getChildrenAsArray(obj, parentKey) {
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

  copyChildren(sourceObj, targetObj, sourceKey, targetKey) {
    if (!(sourceKey in sourceObj) || !(targetKey in targetObj)) {
      return;
    }

    const sourceChildren = sourceObj[sourceKey];
    const targetChildren = targetObj[targetKey];

    if (Array.isArray(sourceChildren) && Array.isArray(targetChildren)) {
      // If both children are arrays, concatenate them
      targetObj[targetKey] = targetChildren.concat(sourceChildren);
    }
    // else if (typeof sourceChildren === 'object' && typeof targetChildren === 'object') {
    //   // If both children are objects, iterate and copy key-value pairs
    //   for (const childKey in sourceChildren) {
    //     if (Object.prototype.hasOwnProperty.call(sourceChildren, childKey)) {
    //       targetChildren[childKey] = sourceChildren[childKey];
    //     }
    //   }
    // } 
    else {
      console.warn('Incompatible children types. Copying operation not performed.');
    }
  }

  renameKeyInArrayOfObjects(array, oldKey, newKey) {
    // Create a deep copy of the array
    let copiedArray = JSON.parse(JSON.stringify(array));
    
    for (let obj of copiedArray) {
        if (obj.hasOwnProperty(oldKey)) {
            obj[newKey] = obj[oldKey];
            delete obj[oldKey];
        }
    }
    
    return copiedArray;
  }


  convert_drawflow_to_block(name) {
    const graph_with_connections = this.drawflow;

    const node_keys = Object.keys(graph_with_connections.drawflow.Home.data);

    let blocks = {}

    for (let i = 0; i < node_keys.length; i++) {
      const node = graph_with_connections.drawflow.Home.data[node_keys[i]]
      // deep copy
      const block = JSON.parse(JSON.stringify(node.block))

      block.views.node.pos_x = node.pos_x.toString()
      block.views.node.pos_y = node.pos_y.toString()
      
      blocks[node_keys[i]] = (block)
    }


    const newPipeline = {}
    for (let i = 0; i < node_keys.length; i++) {
      const node = graph_with_connections.drawflow.Home.data[node_keys[i]]
      const nodes_inputs = this.getChildrenAsArray(node, "inputs");
      const nodes_outputs = this.getChildrenAsArray(node, "outputs");

      const block = JSON.parse(JSON.stringify(blocks[node_keys[i]]))
      block.events = {}
      const block_variable_keys_inputs = Object.keys(block.inputs);
      for (let j = 0; j < block_variable_keys_inputs.length; j++) {
        let block_output_connections = this.renameKeyInArrayOfObjects(nodes_inputs[j].connections, 'input', 'variable');        
        block_output_connections = this.renameKeyInArrayOfObjects(block_output_connections, 'node', 'block');        
        block.inputs[block_variable_keys_inputs[j]].connections = block_output_connections;
      }
      
      const block_variable_keys_outputs = Object.keys(block.outputs);
      for (let j = 0; j < block_variable_keys_outputs.length; j++) {
        let block_input_connections = this.renameKeyInArrayOfObjects(nodes_outputs[j].connections, 'output', 'variable');        
        block_input_connections = this.renameKeyInArrayOfObjects(block_input_connections, 'node', 'block')
        block.outputs[block_variable_keys_outputs[j]].connections = block_input_connections;
      }
      
      newPipeline[node_keys[i]] = block
    }
    const pipeline = {
        id: name,
        pipeline: newPipeline,
        sink: "./history",
        build: "./my_pipelines"
    }

    return pipeline;
  }

  import_block(data, clear = true, notifi = true) {
      }

  import(data, notifi = true) {
    // this.clear();
    this.drawflow = JSON.parse(JSON.stringify(data));
    this.load();
    if (notifi) {
      this.dispatch('import', 'import');
    }
  }

  /* Events */
  on(event, callback) {
    // Check if the callback is not a function
    if (typeof callback !== 'function') {
      console.error(`The listener callback must be a function, the given type is ${typeof callback}`);
      return false;
    }
    // Check if the event is not a string
    if (typeof event !== 'string') {
      console.error(`The event name must be a string, the given type is ${typeof event}`);
      return false;
    }
    // Check if this event not exists
    if (this.events[event] === undefined) {
      this.events[event] = {
        listeners: []
      }
    }
    this.events[event].listeners.push(callback);
  }

  removeListener(event, callback) {
    // Check if this event not exists

    if (!this.events[event]) return false

    const listeners = this.events[event].listeners
    const listenerIndex = listeners.indexOf(callback)
    const hasListener = listenerIndex > -1
    if (hasListener) listeners.splice(listenerIndex, 1)
  }

  dispatch(event, details) {
    // Check if this event not exists
    if (this.events[event] === undefined) {
      // console.error(`This event: ${event} does not exist`);
      return false;
    }
    this.events[event].listeners.forEach((listener) => {
      listener(details);
    });
  }

  getUuid() {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
  }

  generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = (performance && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16;//random number between 0 and 16
      if (d > 0) {//Use timestamp until depleted
        r = (d + r) % 16 | 0;
        d = Math.floor(d / 16);
      } else {//Use microseconds since page-load if supported
        r = (d2 + r) % 16 | 0;
        d2 = Math.floor(d2 / 16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  } 
}
