/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
      // Foto profilo di chi accede con Google.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        // Le pagine riservate hanno il segreto nell'indirizzo (?secret=...):
        // qui il browser può eseguire solo gli script del sito stesso, quindi
        // né AdSense né altri script esterni possono leggere quell'indirizzo.
        // ('unsafe-eval' serve solo a `next dev`.)
        source: "/admin/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
