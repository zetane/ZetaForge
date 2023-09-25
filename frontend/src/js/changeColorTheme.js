document.getElementById('theme-button').onclick = function() {
    var linkTag = document.getElementById('theme-link');
    var linkTagFrame = document.getElementById('theme-menus-link');
    var currentHref = linkTag.getAttribute('href');

    if (currentHref === './src/css/theme.css') {
        linkTag.setAttribute('href', './src/css/theme2.css');
        linkTagFrame.setAttribute('href', './src/css/theme2_menus.css');
    // } else if (currentHref === 'css/theme2.css') {
    //     linkTag.setAttribute('href', 'css/theme3.css');
    } else {
        linkTag.setAttribute('href', './src/css/theme.css');
        linkTagFrame.setAttribute('href', './src/css/theme_menus.css');
    }
};
