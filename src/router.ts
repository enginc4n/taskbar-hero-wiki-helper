export type AppSection = 'dashboard' | 'build' | 'guides' | 'utils' | 'about';

export interface ParsedRoute {
  section: AppSection;
  /** build: forge | prepared · utils: gear | build-author · guides: guide id */
  sub?: string;
  query: URLSearchParams;
}

const SECTIONS = new Set<AppSection>(['dashboard', 'build', 'guides', 'utils', 'about']);

function normalizeHash(raw: string): string {
  const trimmed = raw.replace(/^#/, '').trim();
  if (!trimmed || trimmed === '/') return '/dashboard';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Map legacy hash routes to the new structure. */
function legacyRedirect(normalized: string): string {
  if (normalized === '/helper' || normalized === 'helper') return '/utils/build-author';
  if (normalized === '/panel-runes' || normalized === 'panel-runes') return '/build/forge?runes=1';
  if (normalized === '/utils/about') return '/about';
  return normalized;
}

export function parseRoute(hash = window.location.hash): ParsedRoute {
  const normalized = legacyRedirect(normalizeHash(hash));
  const [pathPart, queryPart = ''] = normalized.split('?');
  const query = new URLSearchParams(queryPart);
  const segments = pathPart.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { section: 'dashboard', query };
  }

  const first = segments[0];
  if (!SECTIONS.has(first as AppSection)) {
    return { section: 'dashboard', query };
  }

  const section = first as AppSection;
  const sub = segments[1] || undefined;

  return { section, sub, query };
}

export function navHref(
  section: AppSection,
  sub?: string,
  query?: Record<string, string>,
): string {
  let path = `#/${section}`;
  if (sub) path += `/${sub}`;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    path += `?${params.toString()}`;
  }
  return path;
}

export function isNavActive(route: ParsedRoute, section: AppSection, sub?: string): boolean {
  if (route.section !== section) return false;
  if (sub === undefined) return true;
  return route.sub === sub || (!route.sub && sub === 'forge' && section === 'build');
}

export function syncHash(path: string, replace = true): void {
  const next = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
  if (window.location.hash === next) return;
  if (replace) {
    history.replaceState(null, '', next);
  } else {
    window.location.hash = next.slice(1);
  }
}
