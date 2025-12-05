import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/icon.png"></link>
          <meta name="theme-color" content="#fff" />
          <meta name="google-site-verification" content="CQ9VZn5qGUaXAmphy3Ft710863CYrmrPNznKwU7LOQg" />
        </Head>
        <body>
          <Main />
          <div id="note"></div>
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
