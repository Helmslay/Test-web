import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pages = ["index.html", "individual.html", "groups.html", "about.html", "contacts.html", "404.html"];
const errors = [];
const checked = [];

function getAttribute(tag, name) {
  const match = tag.match(new RegExp("\\b" + name + '="([^"]*)"'));
  return match ? match[1] : null;
}

for (const page of pages) {
  const fullPath = path.join(root, page);
  if (!fs.existsSync(fullPath)) {
    errors.push(page + ": file is missing");
    continue;
  }

  const html = fs.readFileSync(fullPath, "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(page + ": duplicate IDs: " + [...new Set(duplicates)].join(", "));

  if (!/<html lang="ru">/i.test(html)) errors.push(page + ': missing lang="ru"');
  if (!/name="viewport"/i.test(html)) errors.push(page + ": missing viewport meta");
  if (!/name="robots" content="noindex, nofollow"/i.test(html)) errors.push(page + ": missing preview noindex");
  if (!/class="skip-link" href="#main-content"/i.test(html)) errors.push(page + ": missing keyboard skip link");
  if (!/\bid="main-content"/.test(html)) errors.push(page + ": missing main-content landmark");
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(page + ": missing page title");
  if ((html.match(/<main\b/gi) || []).length !== 1) errors.push(page + ": expected exactly one main landmark");
  if ((html.match(/<h1\b/gi) || []).length !== 1) errors.push(page + ": expected exactly one h1");
  if (/<nav\b/i.test(html) && !/<nav[^>]+aria-label=/i.test(html)) errors.push(page + ": navigation lacks accessible label");
  if (!/href="favicon\.svg"/.test(html)) errors.push(page + ": missing favicon reference");
  if (/<button(?![^>]*\btype=)[^>]*>/i.test(html)) errors.push(page + ": button without explicit type attribute");
  if (/<form[^>]*\saction=/i.test(html)) errors.push(page + ": unexpected form action in demo prototype");

  const allIds = new Set(ids);
  const controlledIds = [...html.matchAll(/\baria-controls="([^"]+)"/g)].map((m) => m[1]);
  for (const id of controlledIds) {
    if (!allIds.has(id)) errors.push(page + ": aria-controls target is missing: " + id);
  }

  const buttonTags = [...html.matchAll(/<button\b[^>]*>/gi)].map((m) => m[0]);
  for (const button of buttonTags) {
    if (!/\btype=/.test(button)) errors.push(page + ": button without explicit type attribute");
  }

  const inputTags = [...html.matchAll(/<input\b[^>]*>/gi)].map((m) => m[0]);
  for (const input of inputTags) {
    const idMatch = input.match(/\bid="([^"]+)"/);
    const id = idMatch ? idMatch[1] : null;
    const inputIndex = html.indexOf(input);
    const labelStart = html.lastIndexOf("<label", inputIndex);
    const labelEnd = html.lastIndexOf("</label>", inputIndex);
    const isNestedInLabel = labelStart >= 0 && labelEnd < labelStart;
    if (!id && !isNestedInLabel) errors.push(page + ": input without id is not wrapped in a label");
    if (id && !new RegExp('<label[^>]*\\bfor="' + id + '"').test(html) && !isNestedInLabel) {
      errors.push(page + ": input #" + id + " has no associated label");
    }
  }

  const stack = [];
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const markupTags = [...html.matchAll(/<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g)].map((m) => ({
    name: m[1].toLowerCase(),
    raw: m[0],
    closing: m[0].startsWith("</"),
    selfClosing: m[0].endsWith("/>")
  }));
  for (const tag of markupTags) {
    if (tag.closing) {
      const open = stack.pop();
      if (open !== tag.name) errors.push(page + ": mismatched closing tag </" + tag.name + "> (expected </" + (open || "none") + ">)");
    } else if (!tag.selfClosing && !voidTags.has(tag.name)) {
      stack.push(tag.name);
    }
  }
  if (stack.length) errors.push(page + ": unclosed tags: " + stack.join(", "));

  const tags = [...html.matchAll(/<(?:a|link|script)[^>]+>/gi)].map((m) => m[0]);
  for (const tag of tags) {
    const target = getAttribute(tag, "href") || getAttribute(tag, "src");
    if (!target || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(target)) continue;

    const parts = target.split("#");
    const filePart = parts[0];
    const hash = parts[1];
    if (filePart) {
      const resolved = path.resolve(root, decodeURIComponent(filePart));
      if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        errors.push(page + ": local link escapes prototype folder: " + target);
        continue;
      }
      if (!fs.existsSync(resolved)) {
        errors.push(page + ": local target does not exist: " + target);
        continue;
      }
      if (hash && filePart.endsWith(".html")) {
        const targetHtml = fs.readFileSync(resolved, "utf8");
        const targetIds = new Set([...targetHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
        if (!targetIds.has(decodeURIComponent(hash))) errors.push(page + ": missing anchor: " + target);
      }
    } else if (hash && !ids.includes(decodeURIComponent(hash))) {
      errors.push(page + ": missing in-page anchor: " + target);
    }
  }

  checked.push(page);
}

const appJsPath = path.join(root, "assets", "app.js");
const cssPath = path.join(root, "assets", "styles.css");
const faviconPath = path.join(root, "favicon.svg");
for (const file of [appJsPath, cssPath, faviconPath]) {
  if (!fs.existsSync(file)) errors.push(path.relative(root, file) + ": required asset is missing");
}

if (fs.existsSync(appJsPath)) {
  const js = fs.readFileSync(appJsPath, "utf8");
  if (/\b(?:fetch\s*\(|XMLHttpRequest|sendBeacon\s*\()/i.test(js)) {
    errors.push("app.js: unexpected network submission found in demo prototype");
  }
  try {
    new Function(js);
  } catch (error) {
    errors.push("app.js: JavaScript syntax error: " + error.message);
  }
}

if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, "utf8");
  let depth = 0;
  for (const char of css) {
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth < 0) break;
  }
  if (depth !== 0) errors.push("styles.css: brace balance is " + depth + ", expected 0");
}

if (errors.length) {
  console.error("Prototype validation failed:");
  for (const error of errors) console.error(" - " + error);
  process.exitCode = 1;
} else {
  console.log("Prototype validation passed (" + checked.length + " HTML pages).");
  console.log("Checked: page metadata, tag nesting, one H1/main, unique IDs, local links and anchors, keyboard skip links, accessible navigation/labels, button types, ARIA targets, demo form boundaries, CSS structure and JavaScript syntax.");
  console.log("This is a static check; it does not replace browser/device or accessibility testing.");
}
