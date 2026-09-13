# Calapexis SEO Optimization & Sitemap / Robots.txt Integration

Comprehensive documentation for SEO configurations implemented for Calapexis (`https://calapexis.online`).

---

## 🛠️ Components Configured

### 1. Dynamic XML Sitemap (`/sitemap.xml`)
- **Route**: `src/routes/sitemap.xml/+server.ts`
- Serves dynamic XML conforming to standard Sitemaps XML schema (`application/xml; charset=utf-8`) with `Cache-Control: max-age=0, s-maxage=3600`.
- Dynamically resolves canonical origin (defaulting to `https://calapexis.online`).
- Indexes core public routes:
  - `/` (Priority: 1.0, daily)
  - `/v` (Priority: 0.9, daily)
  - `/login` (Priority: 0.4, monthly)

### 2. Robots Access Control (`robots.txt`)
- **File**: `static/robots.txt`
- Explicitly allows public pages: `/`, `/v`, `/login`.
- Disallows private portals and internal endpoints: `/dashboard/*`, `/auth/*`, `/admin`, `/staff`, `/security`.
- Links to `Sitemap: https://calapexis.online/sitemap.xml`.

### 3. Open Graph, Twitter Cards & JSON-LD Structured Data
- **Layout**: `src/routes/+layout.svelte`
  - Canonical URL `<link rel="canonical" href="https://calapexis.online" />`.
  - Comprehensive Open Graph metadata (`og:title`, `og:description`, `og:image`, `og:site_name`, `og:url`).
  - Twitter summary card tags (`twitter:card="summary_large_image"`).
  - Schema.org JSON-LD structured data with `WebSite` and `SoftwareApplication` definitions for Google Rich Snippets.

### 4. Head & Viewport Optimizations
- **Base HTML**: `src/app.html`
  - Added theme color (`#1e3a5f`), Apple touch icons, and web manifest reference.
- **Manifest**: `static/site.webmanifest`
  - Web App Manifest providing metadata for mobile browsers and PWA indexing.

### 5. Page-Specific Directives
- **Visitor Portal**: `src/routes/v/+page.svelte` (Custom `<title>` and `<meta name="description">`)
- **Login Portal**: `src/routes/login/+page.svelte` (`<meta name="robots" content="noindex, follow">`)
- **Dashboard Portal**: `src/routes/dashboard/+layout.svelte` (`<meta name="robots" content="noindex, nofollow">`)
