import localforage from 'localforage';
import { Ridge } from './worker_scripts/regression';

export class SaveManager {
  private regression: Ridge;
  private autoSaveInterval: ReturnType<typeof setInterval> | undefined = undefined;
  saveDelay = 1000;

  /**
   * @param regression - The regression object to manage
   * @param saveDelay - The delay between auto-saves in milliseconds
   */
  constructor (regression: Ridge, saveDelay = 1000) {
    this.regression = regression;
    this.saveDelay = saveDelay;
  }

  private getStorageKey (): string {
    return `webgazerGlobalData-${this.regression.name}`;
  }

  async saveData (): Promise<void> {
    try {
      await localforage.setItem(this.getStorageKey(), this.regression.getData());
    } catch (err) {
      console.error('Error saving WebGazer data:', err);
    }
  }

  async loadData (): Promise<void> {
    try {
      const data = await localforage.getItem(this.getStorageKey());
      if (data) this.regression.setData(data as any);
    } catch (err) {
      console.error('Error loading WebGazer data:', err);
    }
  }

  async clearData (): Promise<void> {
    try {
      await localforage.removeItem(this.getStorageKey());
    } catch (err) {
      console.error('Error clearing WebGazer data:', err);
    }
  }

  /**
   * Start auto-saving data at regular intervals
   * @param interval - Optional new interval for auto-saving
   */
  startAutoSave (interval?: number): void {
    if (interval) this.saveDelay = interval;
    if (this.autoSaveInterval) return;
    this.autoSaveInterval = setInterval(() => this.saveData(), this.saveDelay);
  }

  stopAutoSave (): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  dispose (): void {
    this.stopAutoSave();
  }
}
