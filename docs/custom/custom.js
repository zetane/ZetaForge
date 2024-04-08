function copyCode(button) {
    var codeBlock = button.previousElementSibling.querySelector('code').textContent;
    navigator.clipboard.writeText(codeBlock).then(() => {
        alert('Code copied to clipboard!');
    });
}
{/* <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.26.0/prism.min.js" defer></script> */}
