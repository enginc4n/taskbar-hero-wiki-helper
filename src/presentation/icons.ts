const ICON_BASE = 'https://www.taskbarherowiki.com/icons';

export function itemIconUrl(icon?: string | null): string | null {
  if (!icon) return null;
  return `${ICON_BASE}/${icon}.png`;
}

export function itemIconHtml(icon: string | null | undefined, alt: string, className = 'item-icon'): string {
  const url = itemIconUrl(icon);
  if (!url) return '';
  return `<img class="${className}" src="${url}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" />`;
}

export function runeIconUrl(icon?: string | null): string | null {
  return itemIconUrl(icon);
}
