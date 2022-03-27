import { Page } from 'puppeteer';
import { CMPDescriptor } from './descriptor';

/**
 * The "null" descriptor immediately always returns positive results. Useful as
 * a descriptor to handle pages that have no CMPs.
 */
export default class NullDescriptor extends CMPDescriptor {
  constructor() {
    super(NullDescriptor.name, {
      cookies: [],
    });
  }

  async acceptAll(page: Page): Promise<Page> {
    return page;
  }

  async isCMPActive(_page: Page): Promise<boolean> {
    return true;
  }

  async isCMPPresent(_page: Page): Promise<boolean> {
    return true;
  }
}