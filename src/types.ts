import type { Page } from 'puppeteer';

export type Cookie = Awaited<ReturnType<Page['cookies']>>[0];

/**
 * Just an alias for Record<string, string>, but it makes reading the code
 * a tad easier.
 */
export type LocalStorageData = { key: string, value: string };

export interface DescriptorConsentData {
  cookies?: Cookie[];
  localStorage?: LocalStorageData[];
  descriptor: string;
}
