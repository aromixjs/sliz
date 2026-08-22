import { SlizTokenizer } from "@/src";
import { Tokenizer } from "htmlparser2";
import { bench, describe } from "vitest";

const smallMarkup =
  "<!DOCTYPE html>\n" +
  '<html lang="en">\n' +
  "<head>\n" +
  '  <meta charset="utf-8" />\n' +
  "  <title>{pageTitle}</title>\n" +
  "</head>\n" +
  "<body>\n" +
  '  <nav class="top-nav">\n' +
  '    <a href="/home" data-id="{home.id}">Home</a>\n' +
  '    <a href="/about">About</a>\n' +
  "  </nav>\n" +
  '  <main class="{container}">\n' +
  "    <h1>{greeting + name}</h1>\n" +
  "    <ul>\n" +
  '      {items.map((item) => `<li class="{row}">{item}</li>`)}\n' +
  "    </ul>\n" +
  '    <button .when="{ready}">{submitLabel}</button>\n' +
  "  </main>\n" +
  "</body>\n" +
  "</html>";

function buildMarkup(itemCount: number): string {
  const parts: string[] = [];
  parts.push("<!DOCTYPE html>");
  parts.push('<html lang="en">');
  parts.push("<head>");
  parts.push('  <meta charset="utf-8" />');
  parts.push("  <title>{pageTitle}</title>");
  parts.push("</head>");
  parts.push("<body>");
  parts.push('  <nav class="top-nav">');
  for (let index = 0; index < itemCount; index++) {
    parts.push(
      `    <a href="/item/${index}" data-id="{item${index}.id}" class="{item${index}.cls}">Item ${index}</a>`,
    );
  }
  parts.push("  </nav>");
  parts.push('  <main class="{container}">');
  parts.push("    <h1>{greeting + name}</h1>");
  parts.push("    <ul>");
  parts.push('      {items.map((item) => `<li class="{row}">{item}</li>`)}');
  for (let index = 0; index < itemCount; index++) {
    parts.push(
      `      <li .when="{item${index}.visible}" data-index="${index}">{item${index}.label}</li>`,
    );
  }
  parts.push("    </ul>");
  parts.push("  </main>");
  parts.push("</body>");
  parts.push("</html>");
  return parts.join("\n");
}

const noopCallbacks = {
  onattribdata: () => {},
  onattribentity: () => {},
  onattribend: () => {},
  onattribname: () => {},
  oncdata: () => {},
  onclosetag: () => {},
  oncomment: () => {},
  ondeclaration: () => {},
  onend: () => {},
  onopentagend: () => {},
  onopentagname: () => {},
  onprocessinginstruction: () => {},
  onselfclosingtag: () => {},
  ontext: () => {},
  ontextentity: () => {},
};

function runHtmlParser2(source: string): void {
  const tokenizer = new Tokenizer(
    { xmlMode: false, decodeEntities: false, recognizeSelfClosing: true },
    noopCallbacks,
  );
  tokenizer.write(source);
  tokenizer.end();
}

describe("tokenizer benchmark: small markup (440 bytes)", () => {
  bench("sliz", () => {
    new SlizTokenizer(smallMarkup).tokenize();
  });

  bench("htmlparser2", () => {
    runHtmlParser2(smallMarkup);
  });
});

describe("tokenizer benchmark: large markup (2000 rows)", () => {
  const largeMarkup = buildMarkup(2000);

  bench("sliz", () => {
    new SlizTokenizer(largeMarkup).tokenize();
  });

  bench("htmlparser2", () => {
    runHtmlParser2(largeMarkup);
  });
});

describe("tokenizer benchmark: huge markup (10000 rows)", () => {
  const hugeMarkup = buildMarkup(10000);

  bench("sliz", () => {
    new SlizTokenizer(hugeMarkup).tokenize();
  });

  bench("htmlparser2", () => {
    runHtmlParser2(hugeMarkup);
  });
});
