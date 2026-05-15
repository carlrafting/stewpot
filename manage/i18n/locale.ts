import type { SessionManager } from "../session/manager.ts";

export type Locale = "en" | "sv";

export type Translations = Record<string, string>;

export type I18nMethods = {
  t(key: string): Promise<string>;
  get locale(): Locale;
  set locale(locale: Locale);
};

export function detectLocale(request: Request): Locale {
  const header = request.headers.get("accept-language") ?? "";
  const preferred = header.split(",")[0].trim().toLowerCase();
  if (preferred.startsWith("sv")) return "sv";
  return "en";
}

async function loadTranslations(locale: Locale): Promise<Translations> {
  const path = `./locales/${locale}.json`;
  const json = await Deno.readTextFile(new URL(path, import.meta.url));
  return JSON.parse(json);
}

export class I18n implements I18nMethods {
  #translations: Promise<Translations>;
  #locale: Locale;
  #sessionLocale: Locale | undefined;
  constructor(
    request: Request,
    session: SessionManager,
  ) {
    this.#sessionLocale = session.get<Locale>("locale");
    this.#locale = this.#sessionLocale ?? detectLocale(request);
    this.#translations = loadTranslations(this.#locale);
  }
  async t(key: string): Promise<string> {
    const translations = await this.#translations;
    return translations[key] ?? key;
  }
  get locale(): Locale {
    return this.#locale;
  }
  set locale(locale: Locale) {
    this.#locale = locale;
  }
}
