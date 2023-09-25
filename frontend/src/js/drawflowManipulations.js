/* DRAG EVENT */
/* Mouse and Touch Actions */
var elements = document.getElementsByClassName('drag-drawflow');
window.onload = function() {
  for (var i = 0; i < elements.length; i++) {
    elements[i].addEventListener('touchend', drop, false);
    elements[i].addEventListener('touchmove', positionMobile, false);
    elements[i].addEventListener('touchstart', drag, false );
  }
};

var mobile_item_selec = '';
var mobile_last_move = null;
function positionMobile(ev) {
 mobile_last_move = ev;
}

function allowDrop(ev) {
    ev.preventDefault();
  }

function drag(ev) {
    console.log('touchstart0')
    if (ev.type === "touchstart") {
    console.log('touchstart')
    mobile_item_selec = ev.target.closest(".drag-drawflow").getAttribute('data-node');
    } else {
    ev.dataTransfer.setData("node", ev.target.getAttribute('data-node'));
    }
}

function drop(ev) {
    console.log('touchend0')
    if (ev.type === "touchend") {
    console.log('touchend')
    var parentdrawflow = document.elementFromPoint( mobile_last_move.touches[0].clientX, mobile_last_move.touches[0].clientY).closest("#drawflow");
    if(parentdrawflow != null) {
        addNodeToDrawFlow(mobile_item_selec, mobile_last_move.touches[0].clientX, mobile_last_move.touches[0].clientY);
    }
    mobile_item_selec = '';
    } else {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("node");
    addNodeToDrawFlow(data, ev.clientX, ev.clientY);
    }

}

function addNodeToDrawFlow(name, pos_x, pos_y) {
    if(editor.editor_mode === 'fixed') {
    return false;
    }
    pos_x = pos_x * ( editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)) - (editor.precanvas.getBoundingClientRect().x * ( editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)));
    pos_y = pos_y * ( editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)) - (editor.precanvas.getBoundingClientRect().y * ( editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)));
    console.log('position', pos_x, pos_y)

    editor.addNode_from_JSON(block_library[name].block, pos_x, pos_y)

}

var transform = '';
function showpopup(e) {
    e.target.closest(".drawflow-node").style.zIndex = "9999";
    e.target.children[0].style.display = "block";
    //document.getElementById("modalfix").style.display = "block";
    //e.target.children[0].style.transform = 'translate('+translate.x+'px, '+translate.y+'px)';
    transform = editor.precanvas.style.transform;
    editor.precanvas.style.transform = '';
    editor.precanvas.style.left = editor.canvas_x +'px';
    editor.precanvas.style.top = editor.canvas_y +'px';
    console.log(transform);
    //e.target.children[0].style.top  =  -editor.canvas_y - editor.container.offsetTop +'px';
    //e.target.children[0].style.left  =  -editor.canvas_x  - editor.container.offsetLeft +'px';
    editor.editor_mode = "fixed";
}

function closemodal(e) {
    e.target.closest(".drawflow-node").style.zIndex = "2";
    e.target.parentElement.parentElement.style.display  ="none";
    //document.getElementById("modalfix").style.display = "none";
    editor.precanvas.style.transform = transform;
    editor.precanvas.style.left = '0px';
    editor.precanvas.style.top = '0px';
    editor.editor_mode = "edit";
}

function changeModule(event) {
    var all = document.querySelectorAll(".menu ul li");
    for (var i = 0; i < all.length; i++) {
        all[i].classList.remove('selected');
    }
    event.target.classList.add('selected');
}

function changeMode(option) {

    if(option == 'lock') {
    lock.style.display = 'none';
    unlock.style.display = 'block';
    } else {
    lock.style.display = 'block';
    unlock.style.display = 'none';
    }

}