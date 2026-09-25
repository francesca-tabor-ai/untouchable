/**
 * Just enough XML to read a PubMed record.
 *
 * PubMed's efetch only speaks XML, and `package.json` is a single-writer file, so there is no
 * parser library to reach for. This reads well-formed XML into a tree: elements, attributes
 * and text, with entities decoded. It does not validate, does not follow the DTD, and does
 * not handle anything PubMed does not send. It is not a general-purpose parser and should not
 * become one.
 */

export interface XmlElement {
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
}

export type XmlNode = XmlElement | string;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

const TAG = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
const ATTRIBUTE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function parseXml(source: string): XmlElement {
  // Declarations, doctype, comments and processing instructions carry nothing we read.
  const xml = source
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;"),
    );

  const root: XmlElement = { name: "#root", attributes: {}, children: [] };
  const stack: XmlElement[] = [root];
  let cursor = 0;

  for (const match of xml.matchAll(TAG)) {
    const [whole, closing, name, rawAttributes, selfClosing] = match;
    const index = match.index ?? 0;
    const parent = stack[stack.length - 1];

    if (index > cursor) {
      const text = decodeEntities(xml.slice(cursor, index));
      if (text) parent.children.push(text);
    }
    cursor = index + whole.length;

    if (closing) {
      // Tolerate a stray close tag rather than throwing away the whole record.
      const at = stack.map((element) => element.name).lastIndexOf(name);
      if (at > 0) stack.length = at;
      continue;
    }

    const attributes: Record<string, string> = {};
    for (const attribute of rawAttributes.matchAll(ATTRIBUTE)) {
      attributes[attribute[1]] = decodeEntities(attribute[2] ?? attribute[3] ?? "");
    }

    const element: XmlElement = { name, attributes, children: [] };
    parent.children.push(element);
    if (!selfClosing) stack.push(element);
  }

  return root;
}

function isElement(node: XmlNode): node is XmlElement {
  return typeof node !== "string";
}

/** Direct children with this name. */
export function children(element: XmlElement | undefined, name: string): XmlElement[] {
  if (!element) return [];
  return element.children.filter(isElement).filter((child) => child.name === name);
}

/** The first direct child with this name. */
export function child(element: XmlElement | undefined, name: string): XmlElement | undefined {
  return children(element, name)[0];
}

/** Follow a path of direct children: `path(article, "Journal", "Title")`. */
export function path(element: XmlElement | undefined, ...names: string[]): XmlElement | undefined {
  let current = element;
  for (const name of names) current = child(current, name);
  return current;
}

/** Every text node underneath, joined, with whitespace collapsed. Inline markup is flattened. */
export function text(element: XmlElement | undefined): string {
  if (!element) return "";
  const parts: string[] = [];
  const walk = (node: XmlNode) => {
    if (typeof node === "string") parts.push(node);
    else node.children.forEach(walk);
  };
  walk(element);
  return parts.join("").replace(/\s+/g, " ").trim();
}
