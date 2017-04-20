var canvas = document.querySelector("#canvas");

var pointSize = 3;

function getClickPosition(event){
  var rect = canvas.getBoundingClientRect();
  var x = event.clientX - rect.left;
  var y = event.clientY - rect.top;
  drawCoordinates(x,y);
}

function drawCoordinates(x,y){
    var ctx = document.getElementById("canvas").getContext("2d");
    ctx.fillStyle = "blue"; // Red color
    ctx.beginPath();
    ctx.arc(x, y, pointSize, 0, Math.PI * 2, true);
    ctx.fill();
}

canvas.addEventListener("click", getClickPosition, false);
