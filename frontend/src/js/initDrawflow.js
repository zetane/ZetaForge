var id = document.getElementById("drawflow");
const editor = new Drawflow(id);
editor.reroute = true;
editor.reroute_fix_curvature = true;
editor.force_first_input = false;

// Start the editor
const init_object = {
  "drawflow":{
      "Home":{
        "data":{

        }
      },
      "Tab1":{
        "data":{

        }
      }
  }
};
editor.start();
editor.import(init_object);
window.graph = init_object;