import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './login.module.css';

export default function Login() {
  return (
    <div className={styles.background}>
      <div className={styles.bgImage}></div>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <Image
          src="/assets/Logo BI Putih.png"
          alt="Logo BI Putih"
          width={220}
          height={110}
          className={styles.logoOnly}
          priority
        />
        <div className={styles.menu}>
          <span className={styles.signIn}>
            <Link href="/Signin/hal-sign" passHref legacyBehavior>Sign In</Link>
          </span>
          <span className={styles.signUp}>
            <Link href="/SignUp/hal-signup" passHref legacyBehavior>Sign Up</Link>
          </span>
        </div>
      </div>

      {/* CARD */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          
        </div>
        <div className={styles.logoDoneWrapper}>
          <Image
            src="/assets/BI-One-Blue.svg"
            alt="Logo D'ONE"
            width={220}
            height={110}
            className={styles.logoLarge}
            priority
          />
        </div>
        <div className={styles.cardTitle}>
          One Ordering System<br />By KPw BI Provinsi Jawa Timur
        </div>
        <Link href="/Signin/hal-sign" passHref legacyBehavior>
          <button className={styles.button}>Masuk</button>
        </Link>
        <div className={styles.orSection}>
          <span className={styles.orLine}></span>
          <span className={styles.orText}>Atau</span>
          <span className={styles.orLine}></span>
        </div>
        <Link href="/Signin/hal-signAdmin" passHref legacyBehavior>
          <button className={styles.button}>Masuk Sebagai Admin</button>
        </Link>
        <div className={styles.signupText}>
          Belum Memiliki Akun?{' '}
          <Link href="/SignUp/hal-signup" passHref legacyBehavior>
            <span className={styles.signupLink}>Daftar di Sini</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
