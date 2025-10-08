import Link from 'next/link';
import { useRouter } from 'next/router';

export default function NsLink({ href = '/', children, ...props }) {
  const router = useRouter();
  const asPath = router.asPath || '';

  // --- deteksi area/ns dari PATH (mode lama: /u/:ns/... atau /admin/:ns/...) ---
  const pathOnly = asPath.split('?')[0];
  const seg = pathOnly.split('/').filter(Boolean);
  const pathArea = seg[0]?.toLowerCase();
  const pathNs = seg[1];

  const hasPathNs = (pathArea === 'u' || pathArea === 'admin') && !!pathNs;

  // --- deteksi ns dari QUERY (mode baru: /User/... dan /Admin/... + ?ns=xxx) ---
  const queryNs = router.query?.ns ? String(router.query.ns) : null;

  // --- kalau link external, jangan utak-atik ---
  const isExternal = typeof href === 'string' && /^(https?:|mailto:|tel:)/i.test(href);
  if (isExternal) return <Link href={href} {...props}>{children}</Link>;

  // --- MODE 1: PATH-BASED (kompat lama) ---
  if (hasPathNs) {
    const target = href.startsWith('/') ? href : `/${href}`;
    const prefixed = `/${pathArea}/${pathNs}${target}`;
    return <Link href={prefixed} {...props}>{children}</Link>;
  }

  // --- MODE 2: QUERY-BASED (yang kamu pakai sekarang) ---
  // Jika sudah ada ns di href, biarkan; kalau belum dan `queryNs` ada, tempelkan.
  let finalHref = href;
  if (typeof href === 'string') {
    const hasNsAlready = /[?&]ns=/.test(href);
    if (queryNs && !hasNsAlready) {
      const sep = href.includes('?') ? '&' : '?';
      finalHref = `${href}${sep}ns=${encodeURIComponent(queryNs)}`;
    }
  }

  return <Link href={finalHref} {...props}>{children}</Link>;
}

