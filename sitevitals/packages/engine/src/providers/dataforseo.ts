import type { SerpProvider, SerpRank } from './serp.js';

const ENDPOINT = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
const TIMEOUT_MS = 30_000;
const DEPTH = 50;

interface DfsItem {
  type?: string;
  rank_group?: number;
  domain?: string;
}

interface DfsTask {
  status_code?: number;
  status_message?: string;
  cost?: number;
  result?: { items?: DfsItem[] }[];
}

interface DfsResponse {
  status_code?: number;
  status_message?: string;
  cost?: number;
  tasks?: DfsTask[];
}

function stripWww(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

function domainsEqual(a: string | undefined, b: string): boolean {
  return !!a && stripWww(a) === stripWww(b);
}

export class DataForSeoProvider implements SerpProvider {
  readonly name = 'dataforseo';
  private spentUsd = 0;

  constructor(
    private readonly login: string,
    private readonly password: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  costUsd(): number {
    return Math.round(this.spentUsd * 10_000) / 10_000;
  }

  async rank(keyword: string, domain: string, location: string): Promise<SerpRank> {
    let task = await this.query(keyword, location);
    if (task.status_code !== 20000 && location !== 'United States') {
      // DataForSEO requires canonical location names ("Austin,Texas,United
      // States"); retry country-wide rather than failing the whole keyword.
      task = await this.query(keyword, 'United States');
    }
    if (task.status_code !== 20000) {
      throw new Error(`DataForSEO task failed: ${task.status_message ?? 'unknown error'}`);
    }

    const items = task.result?.[0]?.items ?? [];
    const organic = items.filter((i) => i.type === 'organic');

    const position = organic.find((i) => domainsEqual(i.domain, domain))?.rank_group ?? null;
    const topCompetitors = [
      ...new Set(
        organic
          .map((i) => i.domain)
          .filter((d): d is string => !!d && !domainsEqual(d, domain))
          .map(stripWww),
      ),
    ].slice(0, 3);
    const mapPack = items.some(
      (i) => (i.type === 'local_pack' || i.type === 'map') && domainsEqual(i.domain, domain),
    );

    return { position, mapPack, topCompetitors };
  }

  private async query(keyword: string, location: string): Promise<DfsTask> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.fetchFn(ENDPOINT, {
        method: 'POST',
        headers: {
          authorization:
            'Basic ' + Buffer.from(`${this.login}:${this.password}`).toString('base64'),
          'content-type': 'application/json',
        },
        body: JSON.stringify([
          { keyword, location_name: location, language_code: 'en', depth: DEPTH },
        ]),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`DataForSEO responded ${response.status}`);
      }
      const data = (await response.json()) as DfsResponse;
      const task = data.tasks?.[0];
      if (!task) {
        throw new Error(`DataForSEO returned no task: ${data.status_message ?? 'empty response'}`);
      }
      this.spentUsd += task.cost ?? data.cost ?? 0;
      return task;
    } finally {
      clearTimeout(timer);
    }
  }
}
