// @ts-check
import * as webgazer from '../../src/index.mjs'
// Set to true if you want to save the data even if you reload the page.
const collisionSVG = 'collisionSVG'
let force = []
let nodes = []

window.onload = async function () {
  webgazer.setRegression('ridge') /* currently must set regression and tracker */
  webgazer.setTracker('TFFacemesh')
  webgazer.saveDataAcrossSessions(true)
  await webgazer.begin(() => {
    console.log('fail webgazer')
  })
  webgazer.showVideoPreview(true) /* shows all video previews */
  webgazer.showPredictionPoints(false) /* shows a square every 100 milliseconds where current prediction is */
  webgazer.applyKalmanFilter(true) // Kalman Filter defaults to on.
  // Add the SVG component on the top of everything.
  setupCollisionSystem()
  webgazer.setGazeListener(collisionEyeListener)
}

window.onbeforeunload = function () {
    webgazer.end()
}

function setupCollisionSystem () {
  const width = window.innerWidth
  const height = window.innerHeight

  const numberOfNodes = 200

  nodes = d3.range(numberOfNodes).map(function () { return { radius: Math.random() * 12 + 4 } }),
  nodes[0].radius = 0
  nodes[0].fixed = true

  force = d3.layout.force()
    .gravity(0.05)
    .charge(function (d, i) { return i ? 0 : -2000 })
    .nodes(nodes)
    .size([width, height])
    .start()

  const svg = d3.select('body').append('svg')
    .attr('id', collisionSVG)
    .attr('width', width)
    .attr('height', height)
    .style('top', '0px')
    .style('left', '0px')
    .style('margin', '0px')
    .style('position', 'absolute')
    .style('z-index', 100000)

  const color = d3.scale.category10()
  const colors = []
  for (let i = 0; i < numberOfNodes - 2; i++) {
    // colors[i] = color(i%3);
    colors[i] = color(0)
  }
  colors.push('orange')

  svg.selectAll('circle')
    .data(nodes.slice(1))
    .enter().append('circle')
    .attr('r', function (d) { return d.radius })
    .style('fill', function (d, i) { return colors[i] })

  force.on('tick', function (e) {
    const q = d3.geom.quadtree(nodes)
    let i = 0
    const n = nodes.length

    while (++i < n) q.visit(collide(nodes[i]))

    svg.selectAll('circle')
      .attr('cx', function (d) { return d.x })
      .attr('cy', function (d) { return d.y })
  })

  svg.append('line')
    .attr('id', 'eyeline1')
    .attr('stroke-width', 2)
    .attr('stroke', 'red')

  svg.append('line')
    .attr('id', 'eyeline2')
    .attr('stroke-width', 2)
    .attr('stroke', 'red')

  svg.append('rect')
    .attr('id', 'predictionSquare')
    .attr('width', 5)
    .attr('height', 5)
    .attr('fill', 'red')

  svg.on('mousemove', function () {
    const p1 = d3.mouse(this)
    nodes[0].px = p1[0]
    nodes[0].py = p1[1]
    force.resume()
  })

  function collide (node) {
    const r = node.radius + 16
    const nx1 = node.x - r
    const nx2 = node.x + r
    const ny1 = node.y - r
    const ny2 = node.y + r
    return function (quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== node)) {
        let x = node.x - quad.point.x
        let y = node.y - quad.point.y
        let l = Math.sqrt(x * x + y * y)
        const r = node.radius + quad.point.radius
        if (l < r) {
          l = (l - r) / l * 0.5
          node.x -= x *= l
          node.y -= y *= l
          quad.point.x += x
          quad.point.y += y
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1
    }
  }
}

let webgazerCanvas = null

const previewWidth = webgazer.params.videoViewerWidth

var collisionEyeListener = async function (data, clock) {
  if (!data) { return }

  nodes[0].px = data.x
  nodes[0].py = data.y
  force.resume()

  if (!webgazerCanvas) {
    webgazerCanvas = webgazer.getVideoElementCanvas()
  }

  const fmPositions = await webgazer.getTracker().getPositions()

  const whr = webgazer.getVideoPreviewToCameraResolutionRatio()

  var line = d3.select('#eyeline1')
    .attr('x1', data.x)
    .attr('y1', data.y)
    .attr('x2', previewWidth - fmPositions[145][0] * whr[0])
    .attr('y2', fmPositions[145][1] * whr[1])

  var line = d3.select('#eyeline2')
    .attr('x1', data.x)
    .attr('y1', data.y)
    .attr('x2', previewWidth - fmPositions[374][0] * whr[0])
    .attr('y2', fmPositions[374][1] * whr[1])

  const dot = d3.select('#predictionSquare')
    .attr('x', data.x)
    .attr('y', data.y)
}
