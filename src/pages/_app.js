// /src/pages/_app.js
import "@/styles/globals.css";
import * as React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Quicksand } from "next/font/google";

const theme = createTheme(); // bisa kamu kustom nanti

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <main className={quicksand.className}>
        <Component {...pageProps} />
      </main>
    </ThemeProvider>
  );
}
