var isLogOverlayOpen = false;  // Flag to track if the overlay is open or not
var autoScroll = true;  // Flag to track if automatic scrolling is enabled
var isMouseDown = false;  // Flag to track if the mouse button is down

function getLog(){
    openLogOverlay();
}

function openLogOverlay() {
    document.getElementById("log_overlay").style.display = "block";
    document.body.style.overflow = 'hidden';  
    isLogOverlayOpen = true;  // Set flag to true
}

function closeLogOverlay() {
    document.getElementById("log_overlay").style.display = "none";
    document.body.style.overflow = 'auto';  
    isLogOverlayOpen = false;  // Set flag to false
}

$('#log').on('scroll', function() {
    var scrollTop = $(this).scrollTop();
    var scrollHeight = $(this)[0].scrollHeight;
    var height = $(this).height();
    
    autoScroll = Math.abs((scrollTop + height) - scrollHeight) < 50;  // Include a tolerance of 5 pixels
});

$('#log').on('mousedown', function() {
    isMouseDown = true;  // Set flag to true when mouse button is down
});

$('#log').on('mouseup', function() {
    isMouseDown = false;  // Set flag to false when mouse button is released
});

setInterval(function() {
    if (isLogOverlayOpen && !isMouseDown) {
        $.get('/log', function(data) {
            $('#log').val(data);
            if (autoScroll) {
                $('#log').scrollTop($('#log')[0].scrollHeight);
                console.log("Log file updated");
            }
        });
    }
}, 500);
