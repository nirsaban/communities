export type HealthSample = {
  t: number;
  ok: boolean;
  db: 'ok' | 'down' | 'unknown';
  latencyMs: number;
  uptime: number | null;
};

const MAX_SAMPLES = 120;

class HealthRing {
  private samples: HealthSample[] = [];

  push(s: HealthSample): void {
    this.samples.push(s);
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
  }

  list(): HealthSample[] {
    return [...this.samples];
  }

  latest(): HealthSample | null {
    return this.samples[this.samples.length - 1] ?? null;
  }
}

export const healthRing = new HealthRing();
