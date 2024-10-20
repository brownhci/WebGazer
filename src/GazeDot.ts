/**
 * This class creates a gaze dot that follows the user's gaze.
 */
export class GazeDot {
  static style: Partial<CSSStyleDeclaration> = {
    display: 'block',
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '99999',
    background: 'red',
    borderRadius: '50%',
    pointerEvents: 'none',
    opacity: '0.7'
  };

  private div: HTMLDivElement = document.createElement('div');

  /**
   * Creates a new GazeDot instance.
   * @param dotSize - The size of the gaze dot in pixels.
   */
  constructor (dotSize: number) {
    Object.assign(this.div.style, GazeDot.style, {
      width: `${dotSize}px`,
      height: `${dotSize}px`
    });
    document.body.appendChild(this.div);
  }

  /**
   * Updates the position of the gaze dot.
   * @param x - The x-coordinate of the new position.
   * @param y - The y-coordinate of the new position.
   */
  update (x: number, y: number): void {
    if (this.isShowing()) {
      this.div.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }

  /**
   * Checks if the gaze dot is currently visible.
   * @returns True if the gaze dot is visible, false otherwise.
   */
  isShowing (): boolean {
    return this.div.style.display === 'block';
  }

  /**
   * Removes the gaze dot from the DOM.
   */
  dispose (): void {
    this.div.remove();
  }
}
