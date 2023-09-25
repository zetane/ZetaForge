function codeOverlay() {
document.getElementById("code_overlay").style.display = "block";
document.body.style.overflow = 'hidden'; 
}

function closeCodeOverlay() {
document.getElementById("code_overlay").style.display = "none";
document.body.style.overflow = 'auto';
}

function openCode(file_path){
const result_file_code= $.ajax({
    type: 'POST',
    url: '/get-code',
    contentType: 'application/json',
    data: JSON.stringify({ "file_path": file_path }),
    success: function(response) {
        console.log('success', response.log)
        console.log(response)
        window.requested_code = response.data

        // Update the editor value here
        window.code_editor.setValue(window.requested_code);
        var htmlString = `
        <span><b>File path: </b> ${file_path}</span>`;

        // Insert the HTML string into the overlay content.
        $('.code-overlay-content').html(htmlString);

        codeOverlay();
        window.code_editor.layout();
    },
    error: function(response) {
        alert('Error: ' + response.responseJSON.error);
    }
    });
    console.log('results file', result_file_code);
}

window.lastest_code = '';

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.30.1/min/vs' }});
require(['vs/editor/editor.main'], function() {
    window.code_editor = monaco.editor.create(document.getElementById('code_editor'), {
        value: '',
        language: 'python',
        // theme: 'vs-dark',
        theme: 'hc-black',
        fontSize: 20, // you can set the size here
        fontFamily: 'Courier New' // and the font family here
    });

    window.saveContent = function() {
    var currentContent = code_editor.getValue();

    // "Save" the content (in this case, just log it to the console)
    let temp_blockName = document.getElementById('blockName').value;
    let blockName = temp_blockName.replace(/ /g, "_");

    console.log(currentContent, blockName);

    editor.updateNodeAfterSavingCode(blockName, currentContent)
}

    document.getElementById('saveCodeButton').onclick = function() { 
    console.log('pressed saved button');
    window.saveContent(); 
};

window.changeContent = function() {
    // Get the text from the textarea
    var base_prompt = `
        Write a function that follows the following template and only return the imports and the compute function, don't give backticks and python keyword:
        compute(in1, in2, in3,...):
            '''A textual description of the compute function.

            Inputs:
                in1 (all): Textual description of in1
                in2 (all): Textual description of in2
                in3 (all): Textual description of in2
                ... 
            Outputs:
                out1 (all): Textual description of out1
                out2 (all): Textual description of out2
                ...
            '''

            #some code
            return {'out1': out1, 'out2': out2, ...}
        Now, give code that is based on the following prompt:
        `
    var newPrompt = document.getElementById('prompt').value;
    // var lastest_code = '';
    var input_prompt=''
    if (window.lastest_code == ''){
        // window.lastest_code = base_prompt;
        input_prompt = base_prompt + newPrompt;
    } else{
        input_prompt = 'based on the following code' + window.lastest_code + '\n\n ' + newPrompt + '\n\n ' + 'Remember, only respond with code compose of imports and the compute function';
    }
    console.log(input_prompt)
    $.ajax({
        type: 'POST',
        url: '/api/chat-with-gpt',
        contentType: 'application/json',
        data: JSON.stringify({ message: input_prompt
        // Prompt example: Give such that the code takes the 'in1' is the blur level, 'in2' is an image path 
        // and 'out1' is a path to an image after a flips, rotate the image by 35 degrees 
        // and add a red tint. Use opencv and save to output_image_red.jpg
        }),
        success: function(response) {
        
    
    // Set the new text in the editor
        code_editor.setValue(response.message.content);
        window.lastest_code = response.message.content
        console.log('GPT-3 response', response.message);
        },
        error: function(response) {
        alert('Error: ' + response.responseJSON.error);
        }
    });

}
    // Assign the function to the button
    document.getElementById('changeButton').onclick = function() { 
        window.changeContent(); 
    };


});
