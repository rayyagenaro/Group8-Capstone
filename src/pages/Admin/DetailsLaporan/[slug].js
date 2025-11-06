// /src/pages/Admin/DetailsLaporan/[slug].js
import React from 'react';
import DetailsLaporanView from '@/views/detailslaporan/detailsLaporan';
import { NS_RE, withNs } from '@/lib/ns';
import { getNsFromReq } from '@/lib/ns-server';
import { verifyOrNull } from '@/lib/resolve';

export default function DetailsLaporanPage(props) {
  return <DetailsLaporanView {...props} />;
}

export async function getServerSideProps(ctx) {
  const ns = getNsFromReq(ctx.req);
  const from = ctx.resolvedUrl || '/Admin/DetailsLaporan/[slug]';

  if (!ns || !NS_RE.test(ns)) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  const cookieName = `admin_session_${ns}`;
  const token = ctx.req.cookies?.[cookieName] || null;

  if (!token) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, ns))}`,
        permanent: false,
      },
    };
  }

  try {
    const payload = await verifyOrNull(token);

    if (!payload || !['super_admin', 'admin_fitur'].includes(payload?.role)) {
      return {
        redirect: {
          destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, ns))}`,
          permanent: false,
        },
      };
    }

    return { props: { initialAdminName: payload?.name || 'Admin' } };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, ns))}`,
        permanent: false,
      },
    };
  }
}
