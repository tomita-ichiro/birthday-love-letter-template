import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = resolve(repositoryRoot, "site");
const errors = [];
const textExtensions = new Set([".html", ".css", ".js", ".svg"]);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const audioExtensions = new Set([".ogg", ".wav", ".webm", ".m4a", ".aac"]);

const fail = (message) => errors.push(message);
const slash = (path) => path.split(sep).join("/");

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function isAllowed(relativePath) {
  if ([".nojekyll", "index.html", "css/styles.css", "js/content.js", "js/main.js"].includes(relativePath)) {
    return true;
  }
  if (/^assets\/placeholders\/photo-[1-4]\.svg$/.test(relativePath)) return true;
  if (relativePath === "assets/placeholders/favicon.svg") return true;
  if (/^assets\/photos\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp|avif|gif)$/.test(relativePath)) return true;
  if (/^assets\/audio\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:ogg|wav|webm|m4a|aac)$/.test(relativePath)) return true;
  return false;
}

function resolveLocalReference(fromFile, reference) {
  const clean = reference.split("#")[0].split("?")[0];
  if (!clean || clean.startsWith("#") || clean.startsWith("data:") || clean.startsWith("mailto:") || clean.startsWith("tel:")) {
    return;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(clean) || clean.startsWith("//")) return;
  if (clean.startsWith("/")) {
    fail(`${slash(relative(siteRoot, fromFile))} uses a root-relative path: ${reference}`);
    return;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    fail(`${slash(relative(siteRoot, fromFile))} contains an invalid encoded path: ${reference}`);
    return;
  }

  const target = resolve(dirname(fromFile), decoded);
  const withinSite = target === siteRoot || target.startsWith(`${siteRoot}${sep}`);
  if (!withinSite) {
    fail(`${slash(relative(siteRoot, fromFile))} points outside site/: ${reference}`);
  } else if (!existsSync(target)) {
    fail(`${slash(relative(siteRoot, fromFile))} has a broken local reference: ${reference}`);
  }
}

if (!existsSync(siteRoot)) {
  console.error("Verification failed: site/ does not exist.");
  process.exit(1);
}

const files = walk(siteRoot);
let totalBytes = 0;

for (const file of files) {
  const relativePath = slash(relative(siteRoot, file));
  const extension = extname(file).toLowerCase();
  const size = statSync(file).size;
  totalBytes += size;

  if (!isAllowed(relativePath)) fail(`Unexpected publishable file: ${relativePath}`);
  if (relativePath !== relativePath.toLowerCase()) fail(`Filename must be lowercase: ${relativePath}`);
  if (extension === ".mp3") fail(`MP3 files are not permitted: ${relativePath}`);
  if (imageExtensions.has(extension) && size > 8 * 1024 * 1024) fail(`Image exceeds 8 MiB: ${relativePath}`);
  if (audioExtensions.has(extension) && size > 15 * 1024 * 1024) fail(`Audio exceeds 15 MiB: ${relativePath}`);

  if (!textExtensions.has(extension)) continue;
  const source = readFileSync(file, "utf8");
  const privacyPatterns = [
    { pattern: /\bmp3\b/i, label: "an MP3 reference" },
    { pattern: /(?:[a-z]:\\|\/users\/|\/home\/)/i, label: "an absolute local path" },
    { pattern: /file:\/\//i, label: "a local file URL" },
    { pattern: /(?:^|[/.])\.git(?:[/?#]|$)/im, label: "a Git metadata reference" },
    { pattern: /github\.com\//i, label: "a source repository URL" },
    { pattern: /vercel/i, label: "a hosting-provider identifier" }
  ];
  for (const { pattern, label } of privacyPatterns) {
    if (pattern.test(source)) fail(`${relativePath} contains ${label}`);
  }

  if (extension === ".html") {
    for (const match of source.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      resolveLocalReference(file, match[1]);
    }
  }
  if (extension === ".css") {
    for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      resolveLocalReference(file, match[1]);
    }
  }
}

if (totalBytes > 40 * 1024 * 1024) fail("The site/ artifact exceeds 40 MiB.");

const required = [
  ".nojekyll", "index.html", "css/styles.css", "js/content.js", "js/main.js",
  "assets/placeholders/photo-1.svg", "assets/placeholders/photo-2.svg",
  "assets/placeholders/photo-3.svg", "assets/placeholders/photo-4.svg",
  "assets/placeholders/favicon.svg"
];
for (const relativePath of required) {
  if (!existsSync(resolve(siteRoot, relativePath))) fail(`Missing required file: ${relativePath}`);
}

try {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(resolve(siteRoot, "js/content.js"), "utf8"), sandbox, {
    filename: "site/js/content.js",
    timeout: 1000
  });
  const configured = sandbox.window.SITE_CONTENT;
  if (!configured || typeof configured !== "object") {
    fail("content.js must define window.SITE_CONTENT.");
  } else {
    const configuredPaths = [];
    if (Array.isArray(configured.photos)) {
      configured.photos.forEach((photo) => {
        if (photo && typeof photo.src === "string" && photo.src.trim()) configuredPaths.push(photo.src.trim());
        if (!photo || typeof photo.alt !== "string" || !photo.alt.trim()) fail("Every configured photo needs meaningful alt text.");
      });
    }
    if (configured.music && typeof configured.music.file === "string" && configured.music.file.trim()) {
      configuredPaths.push(configured.music.file.trim());
    }
    for (const configuredPath of configuredPaths) {
      resolveLocalReference(resolve(siteRoot, "index.html"), configuredPath);
    }
  }
} catch (error) {
  fail(`Could not evaluate content.js: ${error.message}`);
}

if (errors.length) {
  console.error(`Verification failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Verification passed: ${files.length} publishable files, ${(totalBytes / 1024).toFixed(1)} KiB total.`);
