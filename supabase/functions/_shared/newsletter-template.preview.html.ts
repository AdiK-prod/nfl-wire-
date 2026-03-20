import { buildPreviewNewsletterHtml } from "./newsletter-template.preview.ts";

// Convenience helper: run with `deno run --allow-net --allow-env <file>`
// in an environment that supports Deno. It prints HTML to stdout.
console.log(buildPreviewNewsletterHtml());

