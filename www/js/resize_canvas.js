// @ts-check
/**
* This function occurs on resizing the frame
* clears the canvas & then resizes it (as plots have moved position, can't resize without clear)
*/
function resize () {
  const canvas = /** @type {HTMLCanvasElement | null} */(document.getElementById('plotting_canvas'))
  if (!canvas) return console.error('Canvas plotting_canvas not found')
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
};
window.addEventListener('resize', resize, false)
