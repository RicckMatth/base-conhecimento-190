/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        {key:'X-Content-Type-Options',value:'nosniff'},
        {key:'X-Frame-Options',value:'DENY'},
        {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
        {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
        {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests"}
      ]
    },{
      // Apenas a tela SADE pode ser incorporada no Chat 190 do mesmo domínio.
      // Mantemos a política DENY estrita nas demais páginas.
      source:'/copom-sade-190.html',
      headers:[
        {key:'X-Frame-Options',value:'SAMEORIGIN'},
        {key:'Content-Security-Policy',value:"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'"}
      ]
    }];
  }
};
export default nextConfig;
