import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LeagueProvider } from '../lib/LeagueContext';

export default function App({ Component, pageProps }) {
  return (
    <LeagueProvider>
    <ErrorBoundary context="this page">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />

        {/* Default SEO — overridden per page */}
        <title>Orange — Fantasy Football Companion</title>
        <meta name="description" content="Roster-aware draft picks, opponent matchup grades, bye week alerts, and expert consensus — all in one app." />
        <meta name="theme-color" content="#f97316" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Orange" />
        <meta property="og:title" content="Orange — Fantasy Football Companion" />
        <meta property="og:description" content="Roster-aware draft picks, opponent matchup grades, bye week alerts, and expert consensus — all in one app." />
        <meta property="og:url" content="https://orangeff.app" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Orange — Fantasy Football Companion" />
        <meta name="twitter:description" content="Roster-aware draft picks, opponent matchup grades, bye week alerts, and expert consensus — all in one app." />

        {/* Favicon */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🟠</text></svg>" />
      </Head>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #0a0a0a;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        button { font-family: inherit; }

        /* Desktop: center app like a phone in a browser */
        @media (min-width: 640px) {
          body {
            background: #050505;
          }
          #__next {
            max-width: 480px;
            margin: 0 auto;
            min-height: 100vh;
            background: #0a0a0a;
            box-shadow: 0 0 80px rgba(249, 115, 22, 0.06), 0 0 0 1px #1a1a1a;
          }
        }

        @media (min-width: 1024px) {
          #__next {
            max-width: 520px;
          }
        }
      `}</style>

      <Component {...pageProps} />
      <Analytics />
    </ErrorBoundary>
    </LeagueProvider>
  );
}
