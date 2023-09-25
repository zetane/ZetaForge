var button = document.getElementById("json_button");


button.addEventListener("click", function() {
    show_pipeline();
});


function show_pipeline() {
    content = document.getElementById("json_pipeline");

    pass_to_computation();

    // NOTES
    // Drawflow UI Graph, only used for displaying the pipeline of blocks
    content.innerHTML = '<pre><code>'+JSON.stringify(window.graph_from_ui, null,4)+'</code></pre>';
}
