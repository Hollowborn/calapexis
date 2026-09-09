import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
	const origin =
		url.origin && !url.origin.includes("localhost")
			? url.origin
			: "https://calapexis.online";
	const lastMod = new Date().toISOString().split("T")[0];

	const staticPages = [
		{
			loc: `${origin}/`,
			changefreq: "daily",
			priority: "1.0",
			lastmod: lastMod
		},
		{
			loc: `${origin}/v`,
			changefreq: "daily",
			priority: "0.9",
			lastmod: lastMod
		},
		{
			loc: `${origin}/login`,
			changefreq: "monthly",
			priority: "0.4",
			lastmod: lastMod
		}
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
	.map(
		(page) => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
	)
	.join("\n")}
</urlset>`;

	return new Response(xml.trim(), {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "max-age=0, s-maxage=3600"
		}
	});
};
