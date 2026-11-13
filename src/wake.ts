type Sentinel = { release(): Promise<void> };

type WakeNavigator = Navigator & {
  wakeLock?: { request(type: "screen"): Promise<Sentinel> };
};

/** Keeps the screen on while a session is open, where the browser allows it. */
export class ScreenAwake {
  private held: Sentinel | null = null;
  private want = false;

  constructor() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.want) void this.acquire();
    });
  }

  async acquire(): Promise<boolean> {
    this.want = true;
    const nav = navigator as WakeNavigator;
    if (!nav.wakeLock) return false;
    try {
      this.held = await nav.wakeLock.request("screen");
      return true;
    } catch {
      return false;
    }
  }

  async release(): Promise<void> {
    this.want = false;
    try {
      await this.held?.release();
    } catch {
      /* The lock may already have been released. */
    }
    this.held = null;
  }
}
