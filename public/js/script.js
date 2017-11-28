var canvas = document.querySelector("#signature"); // get canvas element
var ctx    = canvas.getContext("2d"); // set canvas context in 2D
var button = document.querySelector('button[type=submit]');
var input  = document.querySelector('input[name=signature]');

var isDrawing = false;
var lastX     = 0;
var lastY     = 0;

function sign(e) {
  // if isDrawing is false the function will return immediately and wont run at all
  if(!isDrawing) return;
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.beginPath();
  //start from location
  ctx.moveTo(lastX, lastY);
  //go to location
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  lastX = e.offsetX;
  lastY = e.offsetY;
}

// Event listeners for mouseevents
canvas.addEventListener("mousemove", sign);

// mousemove will only result in drawing if isDrawing is true after mousedown
canvas.addEventListener("mousedown", function(e){
isDrawing = true;
lastX = e.offsetX;
lastY = e.offsetY;
});

canvas.addEventListener("mouseup", function(){
isDrawing = false;
});

canvas.addEventListener("mouseout", function(){
isDrawing = false;
});

button.addEventListener("click", function() {
  input.value = canvas.toDataURL();
})
