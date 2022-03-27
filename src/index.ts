import { CMPManager } from './cmpmanager';
import { QualwebPlugin } from '@qualweb/core';
import { Page } from 'puppeteer';

export * from './cmpmanager';
export * from './types';
export * from './descriptors';

export default class CmpPlugin implements QualwebPlugin {
  constructor(readonly cmpManager: CMPManager) {}

  /**
   * Helper function to create a plugin with default CMP settings.
   * @returns 
   */
  public static async create(srcGlobs?: string[], includeBuiltIn?: boolean): Promise<CmpPlugin> {
    return new CmpPlugin(await CMPManager.createManager(srcGlobs, includeBuiltIn));
  }

  async afterPageLoad(page: Page, _url: string): Promise<void> {
    await this.cmpManager.parsePage(page, { failOnMissing: true });
  };
}