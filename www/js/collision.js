// @ts-check
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../types.d.ts" />

import { WebGazer } from '../lib/webgazer.js';

const COLLISION_SVG = 'collisionSVG';
const NUMBER_OF_NODES = 200;

/** @type {typeof import('d3')} */
const d3 = window.d3;

/** @type {d3.layout.Force<d3.layout.force.Link<d3.layout.force.Node>, d3.layout.force.Node>} */
let force;
/** @type {(d3.layout.force.Node & { radius: number })[]} */
let nodes;
const webgazer = new WebGazer({
  regression: 'ridgeReg',
  saveDataAcrossSessions: true,
  useKalmanFilter: true,
  useCalibration: true
});

window.addEventListener('load', async () => {
  try {
    // Start WebGazer
    await webgazer.start({
      gazeDot: false,
      gazeTrail: false
    });

    // Show video preview
    const videoElement = /** @type {HTMLVideoElement} */ (document.getElementById('webgazerVideo'));
    await webgazer.showVideoFeedback(videoElement, { mirrorVideo: true, faceFeedback: false }); // true for mirrored video

    // Add the SVG component on the top of everything
    setupCollisionSystem();
    webgazer.addGazeListener(collisionEyeListener);
  } catch (error) {
    console.error('Failed to start WebGazer:', error);
  }
});

window.addEventListener('beforeunload', () => {
  webgazer.destroy();
});

const setupCollisionSystem = () => {
  const { innerWidth: width, innerHeight: height } = window;

  nodes = d3.range(NUMBER_OF_NODES).map(() => ({ radius: Math.random() * 12 + 4, fixed: false }));
  nodes[0].radius = 0;
  nodes[0].fixed = true;

  force = d3.layout.force()
    .gravity(0.05)
    .charge(function (_d, i) {
      return i ? 0 : -2000;
    })
    .nodes(nodes)
    .size([width, height])
    .start();

  const svg = d3.select('body').append('svg')
    .attr('id', COLLISION_SVG)
    .attr('width', width)
    .attr('height', height)
    .style('position', 'absolute')
    .style('top', '0')
    .style('left', '0')
    .style('margin', '0')
    .style('z-index', '100000');

  const color = d3.scale.category10();
  const colors = Array(NUMBER_OF_NODES - 2).fill(color('0')).concat('orange');

  svg.selectAll('circle')
    .data(nodes.slice(1))
    .enter().append('circle')
    .attr('r', d => d.radius)
    .style('fill', (_, i) => colors[i]);

  force.on('tick', function () {
    const q = d3.geom.quadtree(nodes);
    let i = 0;
    const n = nodes.length;

    while (++i < n) q.visit(collide(nodes[i]));

    svg.selectAll('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
  });

  ['eyeline1', 'eyeline2'].forEach(id => {
    svg.append('line')
      .attr('id', id)
      .attr('stroke-width', 2)
      .attr('stroke', 'red');
  });

  svg.append('rect')
    .attr('id', 'predictionSquare')
    .attr('width', 5)
    .attr('height', 5)
    .attr('fill', 'red');

  svg.on('mousemove', function () {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /* @ts-ignore - "this" is not typed */
    const p1 = d3.mouse(this);
    nodes[0].px = p1[0];
    nodes[0].py = p1[1];
    force.resume();
  });

  const collide = (/** @type {d3.layout.force.Node & { radius: number }} */ node) => {
    const r = node.radius + 16;
    const { x = 0, y = 0 } = node;
    const nx1 = x - r;
    const nx2 = x + r;
    const ny1 = y - r;
    const ny2 = y + r;
    return function (
      /** @type {d3.geom.quadtree.Node<d3.layout.force.Node & { radius: number }>} */ quad,
      /** @type {number} */ x1,
      /** @type {number} */ y1,
      /** @type {number} */ x2,
      /** @type {number} */ y2
    ) {
      if (quad.point && (quad.point !== node)) {
        const { x: qx = 0, y: qy = 0 } = quad.point;
        const { x: nx = 0, y: ny = 0 } = node;
        let x = nx - qx;
        let y = ny - qy;
        let l = Math.sqrt(x * x + y * y);
        const r = node.radius + quad.point.radius;
        if (l < r) {
          l = (l - r) / l * 0.5;
          node.x = nx - (x *= l);
          node.y = ny - (y *= l);
          quad.point.x = qx + x;
          quad.point.y = qy + y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
  };
};

const collisionEyeListener = async (/** @type {{x: number; y: number} | undefined} */ data, /** @type {number} */ _clock) => {
  console.log('fmPositions', data);
  if (!data) return;

  nodes[0].px = data.x;
  nodes[0].py = data.y;
  force.resume();

  // I don't know why the type definition is weird, but it's because of a bug in the JSDoc when building the js file.
  const fmPositions = webgazer.tracker?.getPositions();
  if (!fmPositions) return;

  const videoElement = webgazer.videoElement;
  if (!videoElement) return;
  const { videoWidth, videoHeight, width, height } = videoElement;
  const wr = videoWidth / width;
  const hr = videoHeight / height;
  const previewWidth = videoElement.getBoundingClientRect().width;

  ['eyeline1', 'eyeline2'].forEach((id, i) => {
    const index = i === 0 ? 145 : 374;
    d3.select(`#${id}`)
      .attr('x1', data.x)
      .attr('y1', data.y)
      .attr('x2', previewWidth - fmPositions[index][0] * wr)
      .attr('y2', fmPositions[index][1] * hr);
  });

  d3.select('#predictionSquare')
    .attr('x', data.x)
    .attr('y', data.y);
};
