// /src/pages/Admin/Fitur/[slug]/detail.js
import React from 'react';
import DetailsLaporan from '@/views/detailslaporan/detailsLaporan';
import { resolveAdmin, parseCookieHeader } from '@/lib/resolve';
import { NS_RE } from '@/lib/ns';

// Slug layanan yang didukung (termasuk bimeal)
const ALLOWED_SLUGS = new Set(['bidrive', 'bicare', 'bimeal', 'bimeet', 'bimail', 'bistay']);

export default function HalamanDetailLayanan({ slug, ns, id }) {
  return <DetailsLaporan slug={slug} ns={ns} id={id} />;
}

export async function getServerSideProps(ctx) {
  const { ns: nsRaw, slug: slugRaw, id: idRaw } = ctx.query || {};
  const ns = Array.isArray(nsRaw) ? nsRaw[0] : nsRaw;
  const slug = Array.isArray(slugRaw) ? slugRaw[0] : slugRaw;
  const id = Number(Array.isArray(idRaw) ? idRaw[0] : idRaw);

  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;

  // 🔑 normalize slug "dmove" jadi "bidrive"
  const normalizedSlug = typeof slug === 'string'
    ? slug.toLowerCase() === 'dmove'
      ? 'bidrive'
      : slug.toLowerCase()
    : null;

  const slugValid = ALLOWED_SLUGS.has(normalizedSlug) ? normalizedSlug : null;
  const idValid = Number.isFinite(id) && id > 0 ? id : null;

  const from = ctx.resolvedUrl || '/Admin/Fitur/[slug]/detail';

  // validasi awal
  if (!nsValid || !slugValid || !idValid) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  const cookies = parseCookieHeader(ctx.req.headers.cookie);
  const admin = await resolveAdmin(nsValid, cookies);

  if (!admin.hasToken || !['super_admin', 'admin_fitur'].includes(admin.scope)) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      slug: slugValid, 
      ns: nsValid,
      id: idValid,
    },
  };
}
