document.getElementById('saveButton').addEventListener('click', function() {
const blocks_graph = editor.convert_drawflow_to_block() 
const jsonString = JSON.stringify(blocks_graph);

const blob = new Blob([jsonString], {type: "application/json"});
const url = URL.createObjectURL(blob);

const link = document.createElement('a');
link.download = 'my-graph.json';
link.href = url;
link.click();
});
