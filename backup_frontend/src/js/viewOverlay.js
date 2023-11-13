function openOverlay() {
    document.getElementById("view_overlay").style.display = "block";
    document.body.style.overflow = 'hidden';
    // var iframe = document.getElementById('frameContent');
    // iframe.src = "";
}


function closeOverlay() {
    document.getElementById("view_overlay").style.display = "none";
    document.body.style.overflow = 'auto';
}


function showPreviews() {
  $.ajax({
  type: 'POST',
  url: '/get-graph-local',
  contentType: 'application/json',
  data: JSON.stringify(window.graph),
  success: function(response) {
    // TO SWITCH BETWEEN /get-graph-local and /get-graph
    var saved_graph = response.data
    // var saved_graph = response.data[0].data
    
    let iframes = document.querySelectorAll('iframe.iframe_preview');
    let baseUrl = `${window.location.protocol}//${window.location.host}`;
    iframes.forEach(iframe => {
      const id_from_iframe = parseInt(iframe.id, 10);

      var events = saved_graph[id_from_iframe].events;
      var run_id = saved_graph[id_from_iframe].information.run_id

      if (events[0].outputs.hasOwnProperty('html')) {
        html_for_view = events[0].outputs.html;
        viz = `${baseUrl}/history/${run_id}/${html_for_view}`;  
        iframe.src = viz;
      }
    });
  },
  error: function(response) {
    alert('Error: ' + response.responseJSON.error);
  }
});
}


function openView(node_id) {
    $.ajax({
    type: 'POST',
    url: '/get-graph-local',
    contentType: 'application/json',
    // data: JSON.stringify(data),
    data: JSON.stringify(window.graph),
    success: function(response) {
      display_view(response, node_id);
    },
    error: function(response) {
      alert('Error: ' + response.responseJSON.error);
    }
  });
}


function display_view(response, node_id){    
  var imagesHtml = ""

  // TO SWITCH BETWEEN /get-graph-local and /get-graph
  var saved_graph = response.data
  // var saved_graph = response.data[0].data
  
  // To display event json
  var logs = saved_graph[node_id.toString()].events[0].outputs.log;
  var logs_for_html = logs.replace(/\n/g, '<br>');
  $('#output').html(logs_for_html);

  var events = saved_graph[node_id.toString()].events;
  var run_id = saved_graph[node_id.toString()].information.run_id

  var jsonString = JSON.stringify(events, null, 2);

  var view_mode = 'modal'; // Default
  if (saved_graph[node_id.toString()].views.mode){
    view_mode = saved_graph[node_id.toString()].views.mode // Options are: new_tab, modal
  }

  let baseUrl = `${window.location.protocol}//${window.location.host}`;

if (view_mode === 'modal') {
  let html_for_view = '';
  let viz_path = '';
  // Construct the viz_path similarly to the new_tab method
  if (events[0].outputs.hasOwnProperty('html')) {
      html_for_view = events[0].outputs.html;
      viz_path = `${baseUrl}/history/${run_id}/${html_for_view}`;
  }

  const htmlString = `
    <h1>${saved_graph[node_id.toString()].information.name} Event</h1></br></br>
    <h3>JSON Data</h3>
    <details open>
      <summary>Click to close or view the block's input and output JSON data</summary>
      <div id="jsonDisplay">${jsonString}</div>
    </details></br></br>  
  `;

  // Insert the HTML string into the overlay content.
  $('.view_overlay-content').html(htmlString);

  if (viz_path) {     
      const iframe = document.getElementById('frameContent');
      iframe.src = viz_path; // Set the iframe src directly to the viz_path
      document.getElementById("frameContent").style.display = "block";
  } else {
      document.getElementById("frameContent").style.display = "none";
  }

  openOverlay();

} else if (view_mode === 'new_tab') {
    const viz_path = `${baseUrl}/history/${run_id}/${events[0].outputs.html}`;

    const divElem = document.createElement('div');
    divElem.innerHTML = `
      <h1>${saved_graph[node_id.toString()].information.name} Event</h1></br></br>
      <h3>JSON Data</h3>
      <details open>
        <summary>Click to close or view the block's input and output JSON data</summary>
        <div id="jsonDisplay">${jsonString}</div>
      </details></br></br>  
    `;

    document.body.appendChild(divElem);

    window.open(viz_path);
  }
}