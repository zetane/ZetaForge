const fileInput = document.getElementById('fileInput');

document.getElementById('loadButton').addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function() {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
    const data = JSON.parse(e.target.result);
    // editor.clear()
    editor.import_block(data);
    fileInput.value = null;
    };
    reader.readAsText(file);
});
