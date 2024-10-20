import { DataWindow, Point } from './worker_scripts/util';

export class GazeTrail {
  static style: Partial<CSSStyleDeclaration> = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '99999'
  };

  private canvas: HTMLCanvasElement = document.createElement('canvas');
  private points: DataWindow<Point> = new DataWindow<Point>(50);
  private animationFrameId: number | null = null;

  constructor (maxPoints = 50) {
    document.body.appendChild(this.canvas);
    Object.assign(this.canvas.style, GazeTrail.style);
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.points = new DataWindow<Point>(maxPoints);
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.scheduleRedraw();
    });
  }

  /**
   * Add a point to the trail
   * @param x - The x coordinate of the point
   * @param y - The y coordinate of the point
   */
  addPoint (x: number, y: number): void {
    this.points.push({ x, y });
    this.scheduleRedraw();
  }

  private scheduleRedraw (): void {
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.redraw();
        this.animationFrameId = null;
      });
    }
  }

  private redraw (): void {
    const context2D = this.canvas.getContext('2d');
    if (!context2D) return;
    context2D.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.points.forEach((point, index) => {
      if (!point) console.log(index, [...this.points.data]);
      const age = this.points.data.length - index;
      const alpha = 1 - (age / this.points.data.length);
      context2D.fillStyle = `rgba(0, 0, 255, ${alpha})`;
      context2D.beginPath();
      context2D.arc(point.x, point.y, 3, 0, Math.PI * 2, true);
      context2D.fill();
    });
  }

  dispose (): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.canvas.remove();
  }
}
