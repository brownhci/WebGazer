var canvas = document.querySelector("#canvas");
canvas.addEventListener("click", getPosition, false);

var pointSize = 3;

function getPosition(event){
  var rect = canvas.getBoundingClientRect();
  var x = event.clientX - rect.left;
  var y = event.clientY - rect.top;
  drawCoordinates(x,y);
}

function drawCoordinates(x,y){
    var ctx = document.getElementById("canvas").getContext("2d");
    ctx.fillStyle = "#ff2626"; // Red color
    ctx.beginPath();
    ctx.arc(x, y, pointSize, 0, Math.PI * 2, true);
    ctx.fill();
}
