import type { Locale } from './index';

const FLAG_SVG: Record<Locale, string> = {
  tr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" aria-hidden="true" focusable="false">
    <rect width="30" height="20" fill="#E30A17"/>
    <circle cx="11.5" cy="10" r="4.6" fill="#fff"/>
    <circle cx="12.7" cy="10" r="3.7" fill="#E30A17"/>
    <path fill="#fff" d="M17.2 10l2.1 1.05-1.15-1.82 1.95-1.42-2.4-.04-1.05-2.2-1.05 2.2-2.4.04 1.95 1.42-1.15 1.82z"/>
  </svg>`,
  en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" aria-hidden="true" focusable="false">
    <rect width="30" height="20" fill="#B22234"/>
    <path fill="#fff" d="M0 1.54H30V3.08H0zm0 3.08H30v1.54H0zm0 3.08H30v1.54H0zm0 3.08H30v1.54H0zm0 3.08H30V20H0z"/>
    <rect width="12" height="10.77" fill="#3C3B6E"/>
    <g fill="#fff">
      <circle cx="1.5" cy="1.54" r="0.45"/><circle cx="4.5" cy="1.54" r="0.45"/><circle cx="7.5" cy="1.54" r="0.45"/><circle cx="10.5" cy="1.54" r="0.45"/>
      <circle cx="3" cy="3.08" r="0.45"/><circle cx="6" cy="3.08" r="0.45"/><circle cx="9" cy="3.08" r="0.45"/>
      <circle cx="1.5" cy="4.62" r="0.45"/><circle cx="4.5" cy="4.62" r="0.45"/><circle cx="7.5" cy="4.62" r="0.45"/><circle cx="10.5" cy="4.62" r="0.45"/>
      <circle cx="3" cy="6.16" r="0.45"/><circle cx="6" cy="6.16" r="0.45"/><circle cx="9" cy="6.16" r="0.45"/>
      <circle cx="1.5" cy="7.7" r="0.45"/><circle cx="4.5" cy="7.7" r="0.45"/><circle cx="7.5" cy="7.7" r="0.45"/><circle cx="10.5" cy="7.7" r="0.45"/>
      <circle cx="3" cy="9.24" r="0.45"/><circle cx="6" cy="9.24" r="0.45"/><circle cx="9" cy="9.24" r="0.45"/>
    </g>
  </svg>`,
};

export function localeFlagHtml(locale: Locale): string {
  return `<span class="page-hero-locale-flag" aria-hidden="true">${FLAG_SVG[locale]}</span>`;
}
