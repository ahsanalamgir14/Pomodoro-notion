module.exports = {
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' https:; worker-src 'self'; connect-src 'self' https://api.notion.com https://www.googleapis.com https://firestore.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firebase.googleapis.com https://vitals.vercel-insights.com; frame-ancestors 'self' https://www.notion.so https://notion.so; base-uri 'self'; form-action 'self' https://api.notion.com; object-src 'none'; upgrade-insecure-requests",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' https:; worker-src 'self'; connect-src 'self' https://api.notion.com https://www.googleapis.com https://firestore.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firebase.googleapis.com https://vitals.vercel-insights.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://api.notion.com; object-src 'none'; upgrade-insecure-requests",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
