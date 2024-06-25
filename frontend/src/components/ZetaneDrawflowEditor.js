export default class Drawflow {
  constructor(container, pipeline, setPipeline, precanvas = null, connection_list, updateConnectionList, render = null, parent = null) {
    this.pipeline = pipeline;
    this.setPipeline = setPipeline;
    this.connection_list = connection_list;
    this.updateConnectionList = updateConnectionList;

    this.container = container;
    this.precanvas = precanvas;
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
    // this.drawflow = {"drawflow": {"Home": {"data": {}} } };
    // Configurable options
    this.module = 'Home';
    this.editor_mode = 'edit';
    this.zoom = 1;
    this.zoom_max = 5.6;
    this.zoom_min = 0.15;
    this.zoom_value = 0.03;
    this.zoom_last_value = 1;

    // Mobile
    this.evCache = [];
    this.prevDiff = -1;

    this.removeNodeSubscribers = [];
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
    this.container.addEventListener('dblclick', this.dblclick.bind(this));
    /* Mobile zoom */
    this.container.onpointerdown = this.pointerdown_handler.bind(this);
    this.container.onpointermove = this.pointermove_handler.bind(this);
    this.container.onpointerup = this.pointerup_handler.bind(this);
    this.container.onpointercancel = this.pointerup_handler.bind(this);
    this.container.onpointerout = this.pointerup_handler.bind(this);
    this.container.onpointerleave = this.pointerup_handler.bind(this);
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

  removeReouteConnectionSelected() {
    if (this.reroute_fix_curvature) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
        item.classList.remove("selected");
      });
    }
  }

  click(e) {
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

      if (e.target.classList[0] == "input-element") {
        this.ele_selected = e.target;
      } else if (e.target.classList[0] != "output" && e.target.closest(".drawflow-node") != null ) {
        this.ele_selected = e.target.closest(".drawflow-node");
      }
    }
    if (this.ele_selected.classList[0] === 'drawflow-node') {
      if (this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        if (this.node_selected != this.ele_selected) {
          //   this.dispatch('nodeUnselected', true);
        }
      }
      if (this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      if (this.node_selected != this.ele_selected) {
        // this.dispatch('nodeSelected', this.ele_selected.id.slice(5));
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
    } else if (this.ele_selected.classList[0] === 'output') {
      this.connection = true;
      if (this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        this.node_selected = null;
      }
      if (this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.drawConnection();
    } else if (this.ele_selected.classList[0] === 'parent-drawflow') {
      if (this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        this.node_selected = null;
      }
      if (this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.editor_selected = true;
    } else if (this.ele_selected.classList[0] === 'drawflow') {
      if (this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        this.node_selected = null;
      }
      if (this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.editor_selected = true;
    } else if (this.ele_selected.classList[0] === 'main-path') {
      if (this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        this.node_selected = null;
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
        if (this.reroute_fix_curvature) {
          this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((item) => {
            item.classList.add("selected");
          });
        }
      }
    } else if (this.ele_selected.classList[0] === 'point') {
      this.drag_point = true;
      this.ele_selected.classList.add("selected");
    } else if (this.ele_selected.classList[0] === 'drawflow-delete') {
      if (this.node_selected) {
        this.removeConnectionNodeId(this.node_selected.id);
      }

      if (this.connection_selected) {
        this.removeConnection();
      }

      if (this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        this.node_selected = null;
        // this.dispatch('nodeUnselected', true);
      }
      if (this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }

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
    if (['input', 'output'].includes(this.ele_selected.classList[0])) { // remove 'main-path' -> prevented keydown and deleting connection svg
      e.preventDefault();
    }
  }

  position(e) {
    var pos_y;
    var pos_x;
    var e_pos_y;
    var e_pos_x;
    var y;
    var x;
    if (e.type === "touchmove") {
      e_pos_x = e.touches[0].clientX;
      e_pos_y = e.touches[0].clientY;
    } else {
      e_pos_x = e.clientX;
      e_pos_y = e.clientY;
    }


    if (this.connection) {
      this.updateConnection(e_pos_x, e_pos_y);
    }
    if (this.editor_selected) {
      x = this.canvas_x + (-(this.pos_x - e_pos_x))
      y = this.canvas_y + (-(this.pos_y - e_pos_y))
      this.precanvas.style.transform = "translate(" + x + "px, " + y + "px) scale(" + this.zoom + ")";
    }
    if (this.drag) {
      e.preventDefault();
      x = (this.pos_x - e_pos_x) * this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom);
      y = (this.pos_y - e_pos_y) * this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom);
      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      this.ele_selected.style.top = (this.ele_selected.offsetTop - y) + "px";
      this.ele_selected.style.left = (this.ele_selected.offsetLeft - x) + "px";

      this.updateConnectionNodes(this.ele_selected.id)
    }

    if (this.drag_point) {

      x = (this.pos_x - e_pos_x) * this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom);
      y = (this.pos_y - e_pos_y) * this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom);
      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      pos_x = this.pos_x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)));
      pos_y = this.pos_y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)));

      this.ele_selected.setAttributeNS(null, 'cx', pos_x);
      this.ele_selected.setAttributeNS(null, 'cy', pos_y);

      const parentSelected = this.ele_selected.parentElement.classList[2].slice(9);
      this.updateConnectionNodes(parentSelected);
    }

    if (e.type === "touchmove") {
      this.mouse_x = e_pos_x;
      this.mouse_y = e_pos_y;
    }
  }

  dragEnd(e) {
    var id_output;
    var id_input;
    var output_class;
    var output_id;
    var input_class;
    var input_id;
    var e_pos_y;
    var e_pos_x;
    var ele_last;

    if (e.type === "touchend") {
      e_pos_x = this.mouse_x;
      e_pos_y = this.mouse_y;
      ele_last = document.elementFromPoint(e_pos_x, e_pos_y);
    } else {
      e_pos_x = e.clientX;
      e_pos_y = e.clientY;
      ele_last = e.target;
    }

    if (this.drag) {
      if (this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
        // review
      }
    }

    if (this.drag_point) {
      this.ele_selected.classList.remove("selected");
      if (this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
        // review
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
            input_id = ele_last.closest(".drawflow_content_node").parentElement.id;
          } else {
            input_id = ele_last.id;
          }
          if (Object.keys(this.getNodeFromId(input_id.slice(5)).inputs).length === 0) {
            input_class = false;
          } else {
            input_class = "input_1";
          }
        } else {
          // Fix connection;
          input_id = ele_last.closest('.drawflow-node').id;
          input_class = ele_last.classList[1];
        }
        output_id = this.ele_selected.closest('.drawflow-node').id;
        output_class = this.ele_selected.classList[1];

        if (output_id !== input_id && input_class !== false) {

          const svgName = '.connection.node_in_' + input_id + '.node_out_' + output_id + '.' + output_class + '.' + input_class;
          if (!this.connection_list[svgName]) {

            id_input = input_id.slice(5);
            id_output = output_id.slice(5);


            this.updateConnectionList((draft) => {
              draft[svgName] = {
                input_id: id_input,
                input_class,
                output_id: id_output,
                output_class,
                path: Array.from(this.connection_ele.children),
              }
            })

            this.connection_ele.remove();
            this.connection_ele = null;

            this.setPipeline((draft) => {
              draft.data[id_output].outputs[output_class].connections.push({variable: input_class, block: id_input});
              draft.data[id_input].inputs[input_class].connections.push({variable: output_class, block: id_output});
            })

          } else {
            this.connection_ele.remove();
          }

          this.connection_ele = null;
        } else {
          // Connection exists Remove Connection;
          this.connection_ele.remove();
          this.connection_ele = null;
        }

      } else {
        // Remove Connection;
        this.connection_ele.remove();
        this.connection_ele = null;
      }
    }

    if (this.node_selected) { // update block position in pipeline
      const nodeId = this.node_selected.id.slice(5);
      this.setPipeline((draft) => {
        draft.data[nodeId].views.node.pos_x = this.node_selected.offsetLeft;
        draft.data[nodeId].views.node.pos_y = this.node_selected.offsetTop;
      })
    }

    this.drag = false;
    this.drag_point = false;
    this.connection = false;
    this.ele_selected = null;
    this.editor_selected = false;
  }

  contextmenu(e) {
    var deletebox;
    e.preventDefault();
    if (this.editor_mode === 'fixed' || this.editor_mode === 'view') {
      return false;
    }
    if (this.precanvas.getElementsByClassName("drawflow-delete").length) {
      this.precanvas.getElementsByClassName("drawflow-delete")[0].remove()
    }
    ;
    if (this.node_selected || this.connection_selected) {
      deletebox = document.createElement('div');
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
      if (this.editor_mode === 'fixed' || this.editor_mode === 'view') {
      return false;
    }
    if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
      if (this.node_selected != null) {
        if (this.first_click.tagName !== 'INPUT' && this.first_click.tagName !== 'TEXTAREA' && this.first_click.hasAttribute('contenteditable') !== true) {
          this.removeConnectionNodeId(this.node_selected.id);
        }
      }

      if (this.connection_selected != null) {
        this.removeConnection();
      }
    }
  }

  zoom_enter(event) {
    event.preventDefault()
    if (event.deltaY > 0) {
      // Zoom Out
      this.zoom_out();
    } else {
      // Zoom In
      this.zoom_in();
    }
  }

  zoom_refresh() {
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

  createCurvature(start_pos_x, start_pos_y, end_pos_x, end_pos_y, curvature_value, type) {
    var hx2;
    var hx1;
    var line_x = start_pos_x;
    var line_y = start_pos_y;
    var x = end_pos_x;
    var y = end_pos_y;
    var curvature = curvature_value;
    //type openclose open close other
    switch (type) {
      case 'open':
        if (start_pos_x >= end_pos_x) {
          hx1 = line_x + Math.abs(x - line_x) * curvature;
          hx2 = x - Math.abs(x - line_x) * (curvature * -1);
        } else {
          hx1 = line_x + Math.abs(x - line_x) * curvature;
          hx2 = x - Math.abs(x - line_x) * curvature;
        }
         break;
      case 'close':
        if (start_pos_x >= end_pos_x) {
          hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
          hx2 = x - Math.abs(x - line_x) * curvature;
        } else {
          hx1 = line_x + Math.abs(x - line_x) * curvature;
          hx2 = x - Math.abs(x - line_x) * curvature;
        }
        break;
      case 'other':
        if (start_pos_x >= end_pos_x) {
          hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
          hx2 = x - Math.abs(x - line_x) * (curvature * -1);
        } else {
          hx1 = line_x + Math.abs(x - line_x) * curvature;
          hx2 = x - Math.abs(x - line_x) * curvature;
        }
        break;
      default:

        hx1 = line_x + Math.abs(x - line_x) * curvature;
        hx2 = x - Math.abs(x - line_x) * curvature;

        return ' M ' + line_x + ' ' + line_y + ' C ' + hx1 + ' ' + line_y + ' ' + hx2 + ' ' + y + ' ' + x + '  ' + y;
    }
  }

  drawConnection() {
    const connection = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    this.connection_ele = connection;
    const path = document.createElementNS('http://www.w3.org/2000/svg', "path");
    path.classList.add("main-path");
    path.setAttributeNS(null, 'd', '');
    connection.classList.add("connection");
    connection.appendChild(path);
    this.precanvas.appendChild(connection);
  }

  updateConnection(eX, eY) {
    var path;
    const precanvas = this.precanvas;
    const zoom = this.zoom;
    let precanvasWitdhZoom = precanvas.clientWidth / (precanvas.clientWidth * zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;
    path = this.connection_ele.children[0];

    let line_x = this.ele_selected.offsetWidth / 2 + (this.ele_selected.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
    let line_y = this.ele_selected.offsetHeight / 2 + (this.ele_selected.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

    let x = eX * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)));
    let y = eY * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)));

    let curvature = this.curvature;
    let lineCurve = this.createCurvature(line_x, line_y, x, y, curvature, 'openclose');
    path.setAttributeNS(null, 'd', lineCurve);
  }

  updateConnectionNodes(id) {

    // Aquí nos quedamos;
    const idSearch = 'node_in_' + id;
    const idSearchOut = 'node_out_' + id;
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

    const elemsOut = precanvas.querySelectorAll(`.${idSearchOut}`);

    Object.keys(elemsOut).map(function (item) {
      var y;
      var x;
      var line_y;
      var line_x;
      var eY;
      var eX;
      var id_search;
      var elemtsearchOut;
      var elemtsearch;
      var elemtsearchId;
      var elemtsearchId_out;
      if (elemsOut[item].querySelector('.point') === null) {

        elemtsearchId_out = precanvas.querySelector(`#${id}`);

        id_search = elemsOut[item].classList[1].replace('node_in_', '');
        elemtsearchId = precanvas.querySelector(`#${id_search}`);

        elemtsearch = elemtsearchId.querySelectorAll('.' + elemsOut[item].classList[4])[0];

        eX = elemtsearch.offsetWidth / 2 + (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
        eY = elemtsearch.offsetHeight / 2 + (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

        elemtsearchOut = elemtsearchId_out.querySelectorAll('.' + elemsOut[item].classList[3])[0];

        line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
        line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

        x = eX;
        y = eY;

        const lineCurve = createCurvature(line_x, line_y, x, y, curvature, 'openclose');
        elemsOut[item].children[0].setAttributeNS(null, 'd', lineCurve);
      } else {
        const points = elemsOut[item].querySelectorAll('.point');
        let linecurve = '';
        const reoute_fix = [];
        points.forEach((item, i) => {
          var lineCurveSearch;
          var elemtsearchIn;
          if (i === 0 && ((points.length - 1) === 0)) {

            elemtsearchId_out = container.querySelector(`#${id}`);
            elemtsearch = item;

            eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;

            elemtsearchOut = elemtsearchId_out.querySelectorAll('.' + item.parentElement.classList[3])[0]
            line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
            line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            elemtsearchId_out = item;
            id_search = item.parentElement.classList[1].replace('node_in_', '');
            elemtsearchId = container.querySelector(`#${id_search}`);
            elemtsearch = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]

            elemtsearchIn = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]
            eX = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
            eY = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;


            line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else if (i === 0) {

            elemtsearchId_out = container.querySelector(`#${id}`);
            elemtsearch = item;

            eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;

            elemtsearchOut = elemtsearchId_out.querySelectorAll('.' + item.parentElement.classList[3])[0]
            line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
            line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            // SECOND
            elemtsearchId_out = item;
            elemtsearch = points[i + 1];

            eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else if (i === (points.length - 1)) {

            elemtsearchId_out = item;

            id_search = item.parentElement.classList[1].replace('node_in_', '');
            elemtsearchId = container.querySelector(`#${id_search}`);
            elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]

            elemtsearchIn = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0];
            eX = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
            eY = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;
            line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) + rerouteWidth;
            line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) + rerouteWidth;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else {
            elemtsearchId_out = item;
            elemtsearch = points[i + 1];

            eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) + rerouteWidth;
            eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) + rerouteWidth;
            line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) + rerouteWidth;
            line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) + rerouteWidth;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
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
    Object.keys(elems).map(function (item) {

      var y;
      var x;
      var elemtsearchId_in;
      var line_y;
      var line_x;
      var elemtsearch;
      var elemtsearchId;
      var id_search;
      if (elems[item].querySelector('.point') === null) {
        elemtsearchId_in = container.querySelector(`#${id}`);

        id_search = elems[item].classList[2].replace('node_out_', '');
        elemtsearchId = container.querySelector(`#${id_search}`);
        elemtsearch = elemtsearchId.querySelectorAll('.' + elems[item].classList[3])[0];

        line_x = elemtsearch.offsetWidth / 2 + (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
        line_y = elemtsearch.offsetHeight / 2 + (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

        elemtsearchId_in = elemtsearchId_in.querySelectorAll('.' + elems[item].classList[4])[0];
        x = elemtsearchId_in.offsetWidth / 2 + (elemtsearchId_in.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
        y = elemtsearchId_in.offsetHeight / 2 + (elemtsearchId_in.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

        const lineCurve = createCurvature(line_x, line_y, x, y, curvature, 'openclose');
        elems[item].children[0].setAttributeNS(null, 'd', lineCurve);

      } else {
        const points = elems[item].querySelectorAll('.point');
        let linecurve = '';
        const reoute_fix = [];
        points.forEach((item, i) => {
          var lineCurveSearch;
          var eY;
          var eX;
          var elemtsearchId_out;
          var elemtsearchIn;
          var elemtsearchOut;
          if (i === 0 && ((points.length - 1) === 0)) {

            elemtsearchId_out = container.querySelector(`#${id}`);
            elemtsearch = item;

            line_x = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            line_y = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;

            elemtsearchIn = elemtsearchId_out.querySelectorAll('.' + item.parentElement.classList[4])[0]
            eX = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
            eY = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            elemtsearchId_out = item;
            id_search = item.parentElement.classList[2].replace('node_out_', '');
            elemtsearchId = container.querySelector(`#${id_search}`);
            elemtsearch = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[3])[0]

            elemtsearchOut = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[3])[0]
            line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
            line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

            eX = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            eY = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);


          } else if (i === 0) {
            // FIRST
            elemtsearchId_out = item;
            id_search = item.parentElement.classList[2].replace('node_out_', '');
            elemtsearchId = container.querySelector(`#${id_search}`);
            elemtsearch = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[3])[0]
            elemtsearchOut = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[3])[0];
            line_x = elemtsearchOut.offsetWidth / 2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
            line_y = elemtsearchOut.offsetHeight / 2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

            eX = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            eY = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            // SECOND
            elemtsearchId_out = item;
            elemtsearch = points[i + 1];

            eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else if (i === (points.length - 1)) {

            elemtsearchId_out = item;

            id_search = item.parentElement.classList[1].replace('node_in_', '');
            elemtsearchId = container.querySelector(`#${id_search}`);
            elemtsearch = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0]

            elemtsearchIn = elemtsearchId.querySelectorAll('.' + item.parentElement.classList[4])[0];
            eX = elemtsearchIn.offsetWidth / 2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom;
            eY = elemtsearchIn.offsetHeight / 2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom;

            line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else {

            elemtsearchId_out = item;
            elemtsearch = points[i + 1];

            eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x) * precanvasWitdhZoom + rerouteWidth;
            line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y) * precanvasHeightZoom + rerouteWidth;
            x = eX;
            y = eY;

            lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
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
    var path;
    var pos_y;
    var pos_x;
    this.connection_selected.classList.remove("selected");
    const nodeUpdate = this.connection_selected.parentElement.classList[2].slice(9);
    this.connection_selected = null;

    const point = document.createElementNS('http://www.w3.org/2000/svg', "circle");
    point.classList.add("point");
    pos_x = this.pos_x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x * (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)));
    pos_y = this.pos_y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y * (this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)));

    point.setAttributeNS(null, 'cx', pos_x);
    point.setAttributeNS(null, 'cy', pos_y);
    point.setAttributeNS(null, 'r', this.reroute_width);

    if (this.reroute_fix_curvature) {

      const numberPoints = ele.parentElement.querySelectorAll(".main-path").length;
      path = document.createElementNS('http://www.w3.org/2000/svg', "path");
      path.classList.add("main-path");
      path.setAttributeNS(null, 'd', '');

      ele.parentElement.insertBefore(path, ele.parentElement.children[numberPoints]);
      if (numberPoints === 1) {
        ele.parentElement.appendChild(point);
      } else {
        const search_point = Array.from(ele.parentElement.children).indexOf(ele)
        ele.parentElement.insertBefore(point, ele.parentElement.children[search_point + numberPoints + 1]);
      }

    } else {
      ele.parentElement.appendChild(point);
    }

    this.updateConnectionList((draft) => {
      const svgName = "." + ele.parentElement.classList.value.split(" ").join(".");
      draft[svgName].path = Array.from(ele.parentElement.children)
    })

    this.updateConnectionNodes(nodeUpdate);
  }

  removeReroutePoint(ele) {
    const nodeUpdate = ele.parentElement.classList[2].slice(9)
    const numberMainPath = ele.parentElement.querySelectorAll(".main-path").length
    ele.parentElement.children[numberMainPath - 1].remove();

    this.updateConnectionList((draft) => {
      const svgName = "." + ele?.parentElement?.classList?.value?.split(" ")?.join(".");
      draft[svgName].path.splice(numberMainPath - 1, 1);
      const searchPoint = draft[svgName].path.findIndex(function (item) {
        return item === ele;
      });
      draft[svgName].path.splice(searchPoint, 1);
    })

    ele.remove();
    this.updateConnectionNodes(nodeUpdate);
  }

  getNodeFromId(id) {
    return JSON.parse(JSON.stringify(this.pipeline.data[id]));
  }

  removeNodeInputConnections(id, input_class) {
    const infoNode = this.getNodeFromId(id)
    const removeInputs = [];
    Object.keys(infoNode.inputs[input_class].connections).map(function (key, index) {
      const id_output = infoNode.inputs[input_class].connections[index].block;
      const output_class = infoNode.inputs[input_class].connections[index].variable;
      removeInputs.push({ id_output, id, output_class, input_class })
    })
    // Remove connections
    removeInputs.forEach((item) => {
      this.removeSingleConnection(item.id_output, item.id, item.output_class, item.input_class);
    });
  }

  removeNodeOutputConnections(id, output_class) {
    const infoNode = this.getNodeFromId(id)
    const removeOutputs = [];
    Object.keys(infoNode.outputs[output_class].connections).map(function (key, index) {
      const id_input = infoNode.outputs[output_class].connections[index].block;
      const input_class = infoNode.outputs[output_class].connections[index].variable;
      removeOutputs.push({ id, id_input, output_class, input_class })
    })
    // Remove connections
    removeOutputs.forEach((item) => {
      this.removeSingleConnection(item.id, item.id_input, item.output_class, item.input_class);
    });

  }

  removeConnection() {
    if (this.connection_selected != null) {
      const svgName = "." + Array.from(this.connection_selected.parentElement.classList).join(".");
      const { input_id, input_class, output_id, output_class } = this.connection_list[svgName];
      this.connection_selected.parentElement.remove();
      this.connection_selected = null;
      this.updateConnectionList((draft) => {
          delete draft[svgName];
      })
      this.setPipeline((draft) => {
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

  removeSingleConnection(id_output, id_input, output_class, input_class) {
    let exists;
    exists = this.pipeline.data[id_output].outputs[output_class].connections.findIndex(function (item) {
      return item.block == id_input && item.variable === input_class
    });
    if (exists > -1) {

      const svgName = '.connection.node_in_node-' + id_input + '.node_out_node-' + id_output + '.' + output_class + '.' + input_class;
      this.container.querySelector(svgName).remove();
      this.updateConnectionList((draft) => {
        delete draft[svgName];
      })

      this.setPipeline((draft) => {
        const index_out = draft.data[id_output].outputs[output_class].connections.findIndex(function (item) {
          return item.block == id_input && item.variable === input_class
        });
        draft.data[id_output].outputs[output_class].connections.splice(index_out, 1);

        const index_in = draft.data[id_input].inputs[input_class].connections.findIndex(function (item) {
          return item.block == id_output && item.variable === output_class
        });
        draft.data[id_input].inputs[input_class].connections.splice(index_in, 1);
      })

      return true;

    } else {
      return false;
    }
  }

  removeConnectionNodeId(id) {
      // DELETE all connections associated with this id with setpipeline
    const nodeId = id.slice(5);
    this.setPipeline((draft) => {
      const connectionList = []

      for (let connection in this.connection_list) {
        if (connection.includes(nodeId)) {
          const { input_id, input_class, output_id, output_class } = this.connection_list[connection];
          connectionList.push(connection);

          // Remove connection data from output property of connecting block
          if (input_id === nodeId) {
          const index_out = draft.data[output_id].outputs[output_class].connections.findIndex(function (item) {
              return item.variable === input_class && item.block === input_id;
          });
          draft.data[output_id].outputs[output_class].connections.splice(index_out, 1);

          // Remove connection data from input property of connecting block
          } else if (output_id === nodeId) {
          const index_in = draft.data[input_id].inputs[input_class].connections.findIndex(function (item) {
              return item.variable === output_class && item.block === output_id;
          });
          draft.data[input_id].inputs[input_class].connections.splice(index_in, 1);
          }
        }
      }

      this.updateConnectionList((connectionListDraft) => {
        connectionList.forEach((connection) => {
          if (connectionListDraft[connection]) {
            this.container.querySelector(connection).remove()
            delete connectionListDraft[connection];
          }
        })
      })

      delete draft.data[nodeId]
    })
  }

  convert_drawflow_to_block(name, blockGraph) {
      const graph_with_connections = JSON.parse(JSON.stringify(blockGraph))
      const newPipeline = {}
      for (const block in graph_with_connections) {
        graph_with_connections[block].events = {};
        graph_with_connections[block].views.node.pos_x = graph_with_connections[block].views.node.pos_x.toString();
        graph_with_connections[block].views.node.pos_y = graph_with_connections[block].views.node.pos_y.toString();
        newPipeline[block] = graph_with_connections[block];
      }

      const pipeline = {
          pipeline: newPipeline,
          sink: "./history",
          build: "./my_pipelines"
      }

    return pipeline;
  }
}
