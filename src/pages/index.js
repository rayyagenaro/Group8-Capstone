import Head from 'next/head'
import Image from 'next/image'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/Login/hal-login')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <>
      <Head>
        <title>BI&#39;ONE - One Ordering System By KPw BI Provinsi Jawa Timur</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="lp-root">
        {/* Background */}
        <div className="lp-bgimg" />
        <div className="lp-overlay" />
        {/* Card */}
        <div className="lp-card">
          <h1>
            <span className="lp-welcome">Selamat Datang di</span>
          </h1>

          <div className="logo-landing-wrapper">
            <Image
              src="/assets/BI.ONE.svg"
              alt="BI.ONE Logo"
              fill
              style={{ objectFit: 'contain' }}
              sizes="200px"
              priority
            />
          </div>

          <p className="lp-desc">
            <b>One Ordering System<br />By KPw BI Provinsi Jawa Timur</b>
          </p>
        </div>
      </div>
      <style jsx>{`
        .lp-root {
          min-height: 100vh;
          width: 100vw;
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .lp-bgimg {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: url('/assets/bankindonesia.png') center center/cover no-repeat;
          filter: blur(6px) brightness(0.77) saturate(1.07);
          z-index: 0;
        }
        .lp-overlay {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(115deg,rgba(47,77,142,0.11) 0%,rgba(234,241,253,0.7) 100%);
          z-index: 1;
          pointer-events: none;
        }
        .lp-card {
          position: relative;
          z-index: 3;
          text-align: center;
          background: rgba(255,255,255,0.98);
          border-radius: 22px;
          padding: 60px 80px;
          box-shadow: 0 8px 38px 0 rgba(70,90,150,0.14), 0 1.5px 6px 0 rgba(70,90,150,0.04);
          animation: popin 1.1s cubic-bezier(.39,1.53,.56,.91);
          transition: box-shadow .3s;
        }
        .logo-landing-wrapper {
          width: 200px;
          height: 100px;
          margin: 0 auto 18px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .lp-welcome {
          color: #2F4D8E;
          font-weight: 600;
          font-size: 1.6rem;
          letter-spacing: 0.02em;
          display: block;
          margin-bottom: 20px;
        }
        .lp-brand {
          color: #2F4D8E;
          font-size: 2.4rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          line-height: 1.05;
          font-family: inherit;
        }
        .lp-desc {
          margin-top: 18px;
          color: #2F4D8E;
          font-weight: 500;
          font-size: 1rem;
          letter-spacing: 0.03em;
          opacity: 0.85;
          font-family: inherit;
        }
        @keyframes popin {
          0% { opacity:0; transform: scale(0.8) translateY(60px);}
          60% { opacity:1; transform: scale(1.04) translateY(-16px);}
          90% { transform: scale(0.97) translateY(6px);}
          100% { opacity:1; transform: scale(1) translateY(0);}
        }
        @media (max-width: 800px) {
          .lp-card {
            padding: 32px 16px 24px 16px;
            border-radius: 14px;
          }
          .logo-landing-wrapper {
            width: 90px;
            max-width: 250px;
            height: 60px;
            max-height: 70px;
          }
          .lp-welcome { font-size: 1.14rem;}
          .lp-brand { font-size: 1.44rem;}
        }
      `}</style>
    </>
  )
}
