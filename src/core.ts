/* eslint-disable no-shadow */
/* eslint-disable indent */
import * as parser from 'html-parse-stringify';
import { TransformOptions } from '../lib/interfaces';
import trimHTML from '../lib/trim';
import framework from './framework';

function parseHTML(html: string, options?: parser.IOptions): Array<parser.IDoc> {
  return parser.parse(html, options);
}

function transform(html: string, opts?: TransformOptions) {
  opts = {
    minify: false,
    target: 'body',
    base: 'document',
    ...opts,
  };

  const n = () => {
    if (!opts.minify) return '\n';
    return '';
  };
  const t = () => {
    if (!opts.minify) return '\t';
    return '';
  };
  const nt = () => n() + t();
  const c = (comment: string) => {
    if (opts.minify) return '';
    return `/*${comment}*/`;
  };

  const documents = parseHTML(html);
  /**
   *  0: root
   */
  const transformedTarget = {};
  let declareElement = '';
  let appendElement = '';
  let countElement = 0;
  let customScripts = '';
  let customStyle = '';
  const $ = {
    useElement: false,
    elementName: null,
  };

  const parsing = (doc: Array<parser.IDoc>, parentElementIndex: number) => {
    countElement += 1;
    doc.forEach((d: parser.IDoc) => {
      let element = null;
      if (d.type === 'tag') {
        /* custom elements */
        switch (d.name) {
          case 'script':
            customScripts += (d.children || []).map((a) => a.content).join(`;${nt()}`);
            break;

          case 'style':
            customStyle += (d.children || []).map((a) => a.content).join(`;${nt()}`);
            break;

          case 'app:define':
            if (d.attrs.name) {
              $.useElement = true;
              $.elementName = d.attrs.name;
            } else {
              console.warn('app:define must have a name attribute');
            }
            break;

          default:
            element = `var e${countElement} = document.createElement('${d.name}');${nt()}`;

            if (Object.keys(d.attrs).length !== 0) {
              const attributes = [];
              Object.keys(d.attrs).forEach((attr) => {
                attributes.push(JSON.stringify({ [attr]: d.attrs[attr] }));
              });
              element += `addAttributes(e${countElement}, ${attributes.join(',')});${nt()}`;
            }

            break;
        }
      } else if (d.type === 'text') {
        if (d.content.replace('\n', '').trim() !== '') {
          element = `var e${countElement} = document.createTextNode('${trimHTML(d.content)}');${nt()}`;
        }
      }
      if (element) {
        declareElement += element;
        transformedTarget[parentElementIndex] = [...(transformedTarget[parentElementIndex] || []), countElement];
        if (d.children) parsing(d.children, countElement);
        countElement += 1;
      }
    });
  };

  parsing(documents, 0);
  console.log(transformedTarget);

  Object.keys(transformedTarget).forEach((key) => {
    console.log(key);
    const children = transformedTarget[key];

    appendElement += `applyElement(e${key}, ${children.map((c) => `e${c}`).join(', ')});${nt()}`;
  });
  return {
    dev: {
      declareElement,
      appendElement,
      transformedTarget,
    },
    js: `
/*(${$.useElement ? 'component' : 'page'})*/
${c('javascript api')}
const __pollu__ = {};${c('functions')}
let Pelement = null; ${c('shadow root')}

${$.useElement ? 'var e0 = document.createElement("div");' : ''}
__pollu__['createElements'] = function (t) {
  const applyElement = ${framework.str.applyElement}
  const addAttributes = ${framework.str.addAttributes}
  var style = document.createElement('style');
  style.innerHTML = \`${customStyle}\`; /*style*/
  ${$.useElement ? '' : `const e0 = ${opts.base}.querySelector(t || "body");`}
  ${declareElement}\n\n${appendElement}
  e0.appendChild(style);
}

__pollu__['createElements'](${opts?.target ? `"${opts.target}"` : null});

${
  $.useElement
    ? `
__pollu__['defineElement'] = function (n) {
  class E extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = e0.innerHTML;
      Pelement = this.shadowRoot;
      this["element"] = Pelement;
      /*component script*/
      window.addEventListener('load', () => {
        ${customScripts}
      });
    }
    connectedCallback() {
    }
  }
  customElements.define(n, E);
}

__pollu__['defineElement']("${$.elementName}");
// this["pollu"] = __pollu__;
`
    : customScripts
}
`,
  };
}

export { transform };
