var socket;
var sessionName;

$(document).ready(function() {
  console.log("in function");
  socket = io("http://localhost:3000", {
    reconnect: true,
    transports: ["websocket", "polling"]
  });
  registerEvents();  
});

function registerEvents() {
  $("#sessionNameInput").on("input", function() {
    sessionName = $("#sessionNameInput").val();
  });

  $("#createButton").on("click", function() {
    socket.emit("create session", sessionName);
    $("#sessionNameInput").val("");
  });

  $("#joinButton").on("click", function() {
    socket.emit("join session", sessionName);
    $("#sessionNameInput").val("");
  });

  // Handle socket events
  socket.on("created", function(id) {
    console.log(id);
  });

  socket.on("joined", function(id) {
    console.log(id);
  });

  socket.on("errorMsg", function (msg) {
      console.log(msg);
  })
}
