function pass_to_computation(){
    const blocks_graph = editor.convert_drawflow_to_block() 

    window.graph_from_ui = blocks_graph;
}


async function performTasks() {
    $('#run').prop('disabled', true).addClass('disabled');

$('#spinner').show();

try {
    pass_to_computation()

    const block_from_ui = window.graph_from_ui;

    const result1 = await $.ajax({
    type: 'POST',
    url: '/save-block',
    contentType: 'application/json',
    // data: JSON.stringify(window.graph),
    data: JSON.stringify(block_from_ui),
    success: function(response) {
        console.log(response.log)
    },
    error: function(response) {
        alert('Error: ' + response.responseJSON.error);
    }
    });

    let compute_backend = ''
    let k_checkbox = $('#compute_with_kubernetes');
    if(k_checkbox.is(':checked')) {
    compute_backend = 'kubernetes_docker_desktop'
    } 

    let build_images_and_containers = ''
    let b_checkbox = $('#build');
    if(b_checkbox.is(':checked')) {
    build_images_and_containers = 'true'
    } else{
    build_images_and_containers = 'false'
    }

    const dataToSend = {
    // graph: block,
    build: build_images_and_containers,
    compute: compute_backend
    };

    const result2 = await $.ajax({
    type: 'POST',
    url: '/run-computations',
    contentType: 'application/json',
    // data: JSON.stringify(window.graph),
    data: JSON.stringify(dataToSend),
    success: function(response) {
        console.log('Success run-computations')
    },
    error: function(response) {
        alert('Error: ' + response.responseJSON.error);
    }
    });

    // To use the a local postgresql database
    // const result3 = await $.ajax({
    // type: 'POST',
    // url: '/get-graph',
    // contentType: 'application/json',
    // data: JSON.stringify(window.graph),
    // success: function(response) {
    //     var console_print = response.data[0].data['1'].events[0].outputs.log;

    //     var console_print_for_html = console_print.replace(/\n/g, '<br>');

    //     const paths = response.data[0].data['1'].events[0].outputs.image_path;        
    // },
    // error: function(response) {
    //     alert('Error: ' + response.responseJSON.error);
    // }
    // });

} catch (error) {
    alert('Error: ' + error.responseJSON.error);
} finally {
    showPreviews();

    $('#spinner').hide();
    $('#run').prop('disabled', false).removeClass('disabled');

    let nodes = document.querySelectorAll('.drawflow-node');
    for (let i = 0; i < nodes.length; i++) {
        nodes[i].style.setProperty('--dfNodeBorderColor', 'green');
        nodes[i].style.setProperty('--dfNodeSelectedBorderColor', 'green');    
        nodes[i].style.setProperty('--dfNodeHoverBoxShadowColor', 'green');    
        nodes[i].style.setProperty('--dfNodeSelectedBoxShadowColor', 'green');  
        nodes[i].style.setProperty('--dfNodeHoverBorderColor', 'green');  
        var viewBtn = nodes[i].querySelector('#btn_show_view');
        if(viewBtn) {
            viewBtn.style.visibility = 'visible';
        }
    }
    }
}

$('#run').click(performTasks);
