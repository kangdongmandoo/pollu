declare var htmlParseStringify: htmlParseStringify.htmlParseStringify;

declare module htmlParseStringify {
  export interface htmlParseStringify {
    new (): htmlParseStringify;
    parse_tag(tag: string): IDoc;
    parse(html: string, options?: IOptions): Array<IDoc>;
    stringify(doc: IDoc): string;
  }

  export interface IDoc {
    type: string;
    content?: string;
    voidElement: boolean;
    name: string;
    attrs: Record<string, string>;
    children: IDoc[];
  }

  export interface IOptions {
    components: string[];
  }
}

declare module 'html-parse-stringify' {
  export = htmlParseStringify;
}
