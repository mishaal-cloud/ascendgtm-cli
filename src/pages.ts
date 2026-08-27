/**
 * Fetches per-page markdown from the Ascend GTM marketing site
 * (https://www.ascendgtm.net/<path>.md), and provides a static fallback
 * list of known page paths for `ascendgtm page --list`.
 *
 * Tradeoff: this list is hardcoded rather than derived live from
 * https://www.ascendgtm.net/llms.txt on every invocation. Deriving it live
 * would stay perfectly in sync but costs a network round-trip for a simple
 * `--list` call and adds a second failure mode (llms.txt itself could be
 * unreachable). The static list can drift if pages are added/removed on the
 * site; `ascendgtm page <path>` itself always hits the live site regardless,
 * so a stale list only affects the convenience `--list` output, not
 * correctness of an actual fetch.
 */

export const DEFAULT_SITE_BASE_URL = "https://www.ascendgtm.net";

export const KNOWN_PAGE_PATHS: readonly string[] = [
  "index",
  "about",
  "brand",
  "cac-payback",
  "contact",
  "faq",
  "fractional-cmo-cost",
  "fractional-cmo-for-portfolio-companies",
  "fractional-cmo-vs-gtm-engineer",
  "growth-diagnostic",
  "gtm-value-creation-private-equity",
  "how-i-work",
  "insights",
  "marketing-leader",
  "marketing-roi-measurement",
  "pe-portfolio-operations-marketing",
  "platform",
  "portfolio",
  "pricing",
  "privacy",
  "resume",
  "services",
  "shipping",
  "the-30-day-install-playbook",
  "tools",
  "what-is-a-fractional-cmo",
  "what-is-a-gtm-operator",
  "when-to-hire-a-fractional-cmo",
  "why-gtm-initiatives-fail",
  "why-we-dont-measure-mqls",
];

export class PageFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageFetchError";
  }
}

export async function fetchPageMarkdown(
  path: string,
  baseUrl: string = DEFAULT_SITE_BASE_URL,
): Promise<string> {
  const cleanPath = path.replace(/^\/+/, "").replace(/\.md$/, "");
  const url = `${baseUrl}/${cleanPath}.md`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new PageFetchError(`Could not reach ${url}: ${reason}`);
  }

  if (response.status === 404) {
    throw new PageFetchError(
      `No page found at ${url} (404). Run \`ascendgtm page --list\` for known page paths.`,
    );
  }

  if (!response.ok) {
    throw new PageFetchError(`${url} returned HTTP ${response.status}.`);
  }

  return response.text();
}
