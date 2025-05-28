// pages/_app.js
// import '../public/style.css'; // Example if you want to import global CSS here instead of <link> in pages/index.js

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
