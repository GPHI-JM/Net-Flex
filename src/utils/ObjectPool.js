export class ObjectPool {
  constructor(scene, createFn, size = 20) {
    this.scene = scene;
    this.createFn = createFn;
    this.pool = [];
    this.inUse = new Set();

    const initialSize = Math.max(0, Math.floor(size));
    for (let i = 0; i < initialSize; i++) {
      const item = this.createFn();
      if (item) {
        this.release(item);
      }
    }
  }

  get() {
    let item = this.pool.pop();
    if (!item) {
      item = this.createFn();
    }
    if (!item) {
      return null;
    }

    this.inUse.add(item);
    if (typeof item.setActive === "function") item.setActive(true);
    if (typeof item.setVisible === "function") item.setVisible(true);
    return item;
  }

  release(item) {
    if (!item) return;
    if (this.inUse.has(item)) {
      this.inUse.delete(item);
    }

    if (typeof item.setVelocity === "function") {
      item.setVelocity(0, 0);
    }
    if (typeof item.setAlpha === "function") {
      item.setAlpha(0);
    }
    if (typeof item.setActive === "function") item.setActive(false);
    if (typeof item.setVisible === "function") item.setVisible(false);

    if (!this.pool.includes(item)) {
      this.pool.push(item);
    }
  }

  destroy() {
    for (const item of [...this.pool, ...this.inUse]) {
      if (item && typeof item.destroy === "function") {
        item.destroy();
      }
    }
    this.pool.length = 0;
    this.inUse.clear();
  }
}
