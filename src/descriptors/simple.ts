import { Page } from 'puppeteer';
import { CMPDescriptor, CookieConsentStorageOptions, LocalStorageConsentStorageOptions } from './descriptor';

export class SimpleCMPDescriptor extends CMPDescriptor {
  constructor(
    readonly cmpName: string,
    storageOptions: LocalStorageConsentStorageOptions | CookieConsentStorageOptions,
    readonly presenceSelectors: string[],
    readonly acceptAllSelectors: string[],
    readonly acceptDefaultSelectors?: string[],
    readonly rejectAllSelectors?: string[],
    readonly cmpTimeout: number = 2000,
  ) {
    super(cmpName, storageOptions);

    if (acceptDefaultSelectors) {
      const tag = `${this.name}.acceptDefault: `;

      this.acceptDefault = async (page: Page): Promise<Page> => {
        if (await this.isCMPPresent(page) === false) {
          throw new Error(`${tag}CMP "${this.name}" not present on page.`);
        } else {
          for (const selector of acceptDefaultSelectors) {
            const acceptDefaultButton = await page.$(selector);

            if (acceptDefaultButton !== null) {
              await acceptDefaultButton.click();
              return page;
            }
          }
          
          throw new Error(`Failed to find and click acceptDefault input element. Attempted the following selectors: ${acceptDefaultSelectors.join(', ')}`);
        }
      };
    }

    const rejectAllSelector = this.rejectAllSelectors;
    if (rejectAllSelector !== undefined) this.rejectAll = async (page): Promise<Page> => {
      let timespent = 0;

      while (timespent < this.cmpTimeout) {
        const preTime = Date.now();

        for (const selector of rejectAllSelector) {
          const el = await page.$(selector);
  
          if (el !== null) {
            await el.click();
            return page;
          }
        }

        timespent += (Date.now() - preTime);
      }

      throw new Error(`Failed to click on rejection element. Tried the following: ${rejectAllSelector.join(', ')}`);
    };

    const acceptDefaultSelector = this.acceptDefaultSelectors;
    if (acceptDefaultSelector !== undefined) this.acceptDefault = async (page): Promise<Page> => {
      let timespent = 0;
      
      while (timespent < this.cmpTimeout) {
        const preTime = Date.now();

        for (const selector of acceptDefaultSelector) {
          const el = await page.$(selector);
  
          if (el !== null) {
            await el.click();
            return page;
          }
        }

        timespent += (Date.now() - preTime);
      }

      throw new Error(`Failed to click on accept element. Tried the following: ${acceptDefaultSelector.join(', ')}`);
    };
  }

  async isCMPPresent(page: Page): Promise<boolean> {
    let timespent = 0;

    // Keep trying and backing off until we succeed or we're tired of waiting.
    while (timespent < this.cmpTimeout) {
      const preTime = Date.now();

      for (const selector of this.presenceSelectors) {
        try {
          // We "micro-wait" for the selectors, so we can iterate through all
          // iterators until we might actually hit one that's displayed.
          await page.waitForSelector(selector, {
            timeout: 200,
          });

          return true;
        } catch (_err: unknown) {
          // Wasn't found. Continue.
        }
      }

      timespent += (Date.now() - preTime);
    }

    return false;
  }

  async acceptAll(page: Page): Promise<Page> {
    let timespent = 0;

    while (timespent < this.cmpTimeout) {
      const preTime = Date.now();
      for (const selector of this.acceptAllSelectors) {
        try {
          const el = await page.$(selector);

          if (el !== null) {
            await el.click();
            return page;
          }
        } catch (_err: unknown) {
          // Failed this selector. Should still try the rest.
        }
      }
      // Add the time the loop took to our time spent. We'll stop trying once
      // this time exceeds our tolerance/maximum (cmpTimeout).
      timespent += (Date.now() - preTime);
    }

    throw new Error(`Failed to click on acceptAll element. Tried the following: ${this.acceptAllSelectors.join(', ')}`);
  }

  async isCMPActive(page: Page): Promise<boolean> {
    let timespent = 0;

    // Keep trying and backing off until we succeed or we're tired of waiting.
    while (timespent < this.cmpTimeout) {
      const preTime = Date.now();

      for (const selector of this.presenceSelectors) {

        try {
          // We "micro-wait" for the selectors, so we can iterate through all
          // iterators until we might actually hit one that's displayed.
          const el = await page.waitForSelector(selector, {
            visible: true,
            timeout: 200,
          });

          return (await el?.boundingBox()) !== null;
        } catch (_err: unknown) {
          // Wasn't found. Continue.
        }
      }

      timespent += (Date.now() - preTime);
    }

    return false;
  }
}
