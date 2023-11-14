function openHistoryOverlay() {
    document.getElementById("history_overlay").style.display = "block";
    document.body.style.overflow = 'hidden';
}

function closeHistoryOverlay() {
    document.getElementById("history_overlay").style.display = "none";
    document.body.style.overflow = 'auto';
}

function displayPrettyJSON(data) {
  // Helper function to escape HTML content
  function escapeHTML(content) {
      const entityMap = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
          '/': '&#x2F;',
          '`': '&#x60;',
          '=': '&#x3D;'
      };
      return String(content).replace(/[&<>"'`=\/]/g, s => entityMap[s]);
  }

  // Convert JSON data to pretty string format
  const prettyData = JSON.stringify(data, null, 4);

  const divElement = document.getElementById('history-local-content');
  divElement.innerHTML = `<pre>${escapeHTML(prettyData)}</pre>`;
}


function getHistoryLocal() {
  function fetchJSONFile(callback) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/get-history-local', true);
      xhr.responseType = 'json';
      xhr.onload = function() {
          if (xhr.status === 200) {
              callback(null, xhr.response);
          } else {
              callback(xhr.statusText, null);
          }
      };
      xhr.onerror = function() {
          callback(xhr.statusText, null);
      };
      xhr.send();
  }

  fetchJSONFile(function(err, data) {
      if (err) {
          console.error("There was an error fetching the JSON file:", err);
      } else {
          displayPrettyJSON(data);
          openHistoryOverlay();  
      }
  });
}


function getHistory(){
  console.log('Getting history')

  var tableHeaders = $("#tableHeaders");
  var tableBody = $("#tableBody");
  var prevPageButton = $("#prevPage");
  var nextPageButton = $("#nextPage");
  var currentPageSpan = $("#currentPage");

  var currentPage = 0;
  var itemsPerPage = 5;
  var data = [];

  // Data to send in the POST request
  var postData = {
    table_name: 'my_table',
  };

  $.ajax({
    type: 'POST',
    url: '/get-table',
    contentType: 'application/json',
    data: JSON.stringify(postData),
    success: function(fetchedData) {
      // Store the fetched data
      data = fetchedData;

      tableHeaders.empty();
      // Add table headers
      for (var key in data[0]) {
        var th = $("<th>").text(key);
        tableHeaders.append(th);
      }

      // Update the table with the fetched data
      updateTable();
    },
    error: function(response) {
      alert('Error: ' + response.responseJSON.error);
    }
  });      

  function updateTable() {
  // Clear table body
  tableBody.empty();

  // Calculate start and end indices for the current page
  var start = currentPage * itemsPerPage;
  var end = start + itemsPerPage;

  // Sort the data by the ID column in descending order
  data.sort(function(a, b) {
    return b.id - a.id;
  });

  // Add table rows
  data.slice(start, end).forEach(item => {
  var tr = $("<tr>");
  for (var key in item) {
    var td = $("<td>");
    // Use JSON.stringify to convert JSONB data to string
    td.html(typeof item[key] === 'object' ? `<pre>${JSON.stringify(item[key], null, 2)}</pre>` : item[key]);
    tr.append(td);
  }
  tableBody.append(tr);
});

  // Update current page text
  currentPageSpan.text('Page ' + (currentPage + 1) + ' of ' + Math.ceil(data.length / itemsPerPage));

  // Enable or disable previous/next page buttons
  prevPageButton.prop('disabled', currentPage === 0);
  nextPageButton.prop('disabled', currentPage >= Math.ceil(data.length / itemsPerPage) - 1);
}

  // Handle click events for previous/next page buttons
  prevPageButton.on('click', function() {
    if (currentPage > 0) {
      currentPage--;
      updateTable();
    }
  });

  nextPageButton.on('click', function() {
    if (currentPage < Math.ceil(data.length / itemsPerPage) - 1) {
      currentPage++;
      updateTable();
    }
  });
      openHistoryOverlay();    
}
