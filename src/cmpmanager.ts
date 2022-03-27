import { Page } from 'puppeteer';
import * as Descriptors from './descriptors';
import glob from 'glob';
import { DescriptorConsentData } from './types';
import * as path from 'path';
import YamlDescriptor from './descriptors/yaml';
import _ from 'lodash';
import { LocalStorageData } from '.';
import NullDescriptor from './descriptors/null';

export interface ParsePageOptions {
  /**
   * If true (the default), parsePage will throw an error if the expected
   * number of cookies or localStorage items can't be found.
   */
  failOnMissing?: boolean;

  /**
   * If set, CMPManager will *only* use this CMPDescriptor to parse the page.
   * Use this to save processing time if you know specifically which descriptor
   * to look for.
   */
  descriptor?: string;
}

const defaultParsePageOptions: ParsePageOptions = {
  failOnMissing: true,
};

/**
 * General management class. The CMP manager imports any number of CMP
 * descriptions and handles running through a puppeteer Page to handle the
 * banner. You can subscribe to an event to be notified when/if the manager
 * finds and handles a cookie banner, that also contains the cookie that was
 * stored as a result.
 */
export class CMPManager {
  /**
   * Internal list of known descriptors.
   * TODO: should this be a list of constructors, for injection, or instances?
   */
  protected descriptors: Descriptors.CMPDescriptor[] = [];

  /**
   * Get the names of all currently loaded CMP descriptors.
   */
  get descriptorNames(): string[] {
    return this.descriptors.map(descriptor => descriptor.name);
  }

  /**
   * Add new descriptors to the manager. You can either pass in globs/paths to
   * files containing the descriptors, or instances of CMPDescriptor. A file
   * that contains a descriptor must export a default function that constructs
   * an instance of the CMPDescriptor to use.
   * @param source Source path(s) for the descriptors to add, or instances of
   * existing descriptors.
   * @returns The manager itself.
   */
  async addDescriptors(source: string | string[] | Descriptors.CMPDescriptor[]): Promise<this> {
    if (Array.isArray(source) === false && typeof source === 'string') {
      // Single file/glob. Import.

      await this.addFrom(source);
    } else if (source.length > 0) {
      if (typeof source[0] === 'string') {
        // Multiple files/globs. import.

        await this.addFrom(source as string[]);
      } else {
        // Multiple descriptor objects.
        const sources = source as Descriptors.CMPDescriptor[];

        this.descriptors.push(... sources);
      }
    }

    return this;
  }

  /**
   * Tries to import a CMPDescriptor from the given path, by running the default
   * exported function.
   * @param importPath Absolute path to the file to import. This method does *not*
   * adjust extensions in case you're running pure Node instead of ts-node or
   * similar - so make sure this points to a .js file if necessary.
   * @returns The new CMPDescriptor if successful, null otherwise.
   */
  async #importSingle(importPath: string): Promise<Descriptors.CMPDescriptor | null> {
    const extension = path.extname(importPath).toLowerCase();

    if (['.yaml', '.yml'].includes(extension)) {
      // Attempt YAML import.
      return YamlDescriptor.createFromPath(importPath, { encoding: 'utf-8' });
    } else {
      if (['.ts', '.js'].includes(extension) === false) {
        console.warn(`Unknown file extension "${extension}". Attempting to import as module from "${importPath}".`);
      }

      try {
        const module = await import(importPath);
  
        const newDescriptor = module.default();
  
        if (Descriptors.isCMPDescriptor(newDescriptor)) {
          return newDescriptor;
        } else {
          throw new Error(`Failed to import from "${importPath}".`);
        }
      } catch (_err: unknown) {
        throw _err;
        // throw new Error(`Failed to add descriptor from path "${importPath}"`);
      }
    }
  }

  /**
   * Tries to add CMPDescriptors from all files found in the glob/path given as
   * parameter. Imports that fail will simply be ignored. Any discovered
   * CMPDescriptors are automatically added to the manager.
   * @param path Glob or single path of descriptors to import.
   * @returns The manager itself.
   */
  async addFrom(path: string | string[]): Promise<this> {
    if (typeof path === 'string') path = [path];

    const paths: Set<string> = new Set();
    for (const p of path) {
      glob.sync(p).forEach((p) => paths.add(p));
    }

    const newDescriptors = (await Promise.all(Array.from(paths).map(p => this.#importSingle(p)))).filter(d => d !== null) as Descriptors.CMPDescriptor[];

    this.descriptors.push(...newDescriptors);

    return this;
  }

  /**
   * Creates a new CMPManager. Since the list of CMPDescriptors is imported on
   * construction, this async factory method is necessary to ensure that all
   * descriptors have been imported before first use.
   * @param srcGlobs Optional list of additional files/directories to scan for
   * CMPDescriptors. Each file's default export must be a function that returns
   * a CMPDescriptor object, or a YAML file describing the details.
   * @param includeBuiltIn If false, will *not* include the default/built-in
   * descriptors in "contrib" and "yaml".
   * @see YamlDescriptorFile
   */
  static async createManager(srcGlobs?: string | string[], includeBuiltIn: boolean = true): Promise<CMPManager> {
    const manager = new CMPManager();

    if (srcGlobs)
      await manager.addDescriptors(srcGlobs);

    if (includeBuiltIn === true) {
      // Add complex/manually implemented descriptors.
      await manager.addFrom(path.join(__dirname, 'descriptors/contrib/*.ts'));
  
      // Add YAML-defined simple descriptors.
      await manager.addFrom(path.join(__dirname, 'descriptors/yaml/*.yaml'));
      await manager.addFrom(path.join(__dirname, 'descriptors/yaml/*.yml'));
    }

    return manager;
  }

  getDescriptor(descriptor: string): Descriptors.CMPDescriptor | undefined {
    switch (descriptor) {
      case 'NullDescriptor': return new NullDescriptor();
      default: return this.descriptors.find(d => d.name === descriptor);
    }
  }

  /**
   * Iterates over all known CMPDescriptors, trying to detect the presence of
   * a CMP solution on the page object. If a CMP presence is detected, the
   * "accept all" function is invoked. If no CMPDescriptors match the page, a
   * null result is returned. This does *not* mean that no CMP was present,
   * only that none of the descriptors could find it.
   * @param page The page to detect CMP presence in.
   * @returns The results of going over the page with all descriptors. The may
   * be a null result if @see CookieResult.cookie is null. In that case, no
   * CMP presence was detected.
   */
  async parsePage(page: Page, options?: ParsePageOptions): Promise<DescriptorConsentData | null> {
    const actualOptions = _.merge(defaultParsePageOptions, options);

    const descriptors: Descriptors.CMPDescriptor[] = [];

    if (actualOptions.descriptor) {
      const descriptor = this.getDescriptor(actualOptions.descriptor);
      if (descriptor) {
        descriptors.push(descriptor);
      } else {
        throw new Error(`Unknown descriptor "${actualOptions.descriptor}".`);
      }
    }

    for (const descriptor of descriptors.length > 0 ? descriptors : this.descriptors) {
      if (await descriptor.isCMPActive(page) === true) {
        // const oldCookies = await page.cookies();

        await descriptor.acceptAll(page);

        let cookies = await page.cookies();

        let timeSpent = 0;
        const timeout = 2000;

        while (!cookies.find(c => descriptor.consentKeys.includes(c.name)) && timeSpent < timeout) {
          // As long as no CMP cookies are present...

          const timeThen = Date.now();

          cookies = await page.cookies();

          timeSpent += (Date.now() - timeThen);
        }

        let localStorageData;
        try {
          await page.evaluate(async function () {
            const localStorageValues: LocalStorageData[] = [];

            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);

              if (k) {
                const v = localStorage.getItem(k);

                if (v) {
                  localStorageValues.push({
                    key: k,
                    value: v,
                  });
                } else {
                  throw new Error(`Value for key ${k} is null!`);
                }
              } else {
                throw new Error(`No key for index ${i} exists!`);
              }
            }

            return localStorageValues;
          });
        } catch (_err: unknown) {
          // Failed to load from localStorage. Not an error yet, since we don't
          // have dependable support for localStorage, anyway.
        }

        return {
          descriptor: descriptor.name,
          cookies,
          localStorage: localStorageData,
        };
      }
    }

    // No CMP descriptors matched.
    return null;
  }

  /**
   * Checks to see if a CMP is *present* (but not necessarily visible) on a
   * page. Note that some CMPs will not be present in the DOM if the page was
   * loaded using matching consent cookies.
   * Note that some CMP descriptors can't clearly establish whether they are
   * present if the page was loaded with consent data already injected. For
   * example, some instances of the CookieBot CMP will simply not be present
   * in the DOM if a page was loaded with consent cookies already present. See
   * the documentation for individual CMPDescriptors for more information.
   * @param page The page (post-navigation, post-load) to find CMP in.
   * @param descriptor If given, the specific descriptor to use for the check.
   * The method will only apply this single descriptor instead of testing all
   * loaded descriptors.
   */
  async cmpPresent(page: Page): Promise<Descriptors.CMPDescriptor | null>;
  async cmpPresent(page: Page, descriptor: string): Promise<boolean>;
  async cmpPresent(page: Page, descriptor?: string): Promise<boolean | (Descriptors.CMPDescriptor | null)> {
    if (typeof descriptor === 'string') {
      // Use specific descriptor for action.
      const descriptorInstance = this.getDescriptor(descriptor);
  
      if (!descriptorInstance) {
        throw new Error(`Descriptor "${descriptor}" is not present.`);
      }
  
      return descriptorInstance.isCMPPresent(page);
    } else if (typeof descriptor === 'undefined') {
      const detectedCmp = await this.detectCMP(page);

      if (detectedCmp !== null && await detectedCmp.isCMPPresent(page) === true)
        return detectedCmp;
      else
        return false;
    } else throw new Error(`Invalid argument passed as descriptor ("${descriptor}", type: ${typeof descriptor})`);
  }

  async detectCMP(page: Page): Promise<Descriptors.CMPDescriptor | null> {
    for (const descriptor of this.descriptors) {
      if (await descriptor.isCMPPresent(page))
        return descriptor;
    }

    return null;
  }

  /**
   * Tests to see if a given CMP descriptor is present AND visible (i.e. active)
   * on a page.
   * Note that some CMP descriptors can't clearly establish whether they are
   * present if the page was loaded with consent data already injected. For
   * example, some instances of the CookieBot CMP will simply not be present
   * in the DOM if a page was loaded with consent cookies already present. See
   * the documentation for individual CMPDescriptors for more information.
   * @param page The page (post-navigation, post-load) to find a CMP in.
   * @param descriptor If given, the specific descriptor to use for the check.
   * The method will only apply this single descriptor instead of testing all
   * loaded descriptors.
   */
   async cmpActive(page: Page): Promise<Descriptors.CMPDescriptor | null>;
   async cmpActive(page: Page, descriptor: string): Promise<boolean>;
   async cmpActive(page: Page, descriptor?: string): Promise<boolean | (Descriptors.CMPDescriptor | null)> {
     if (typeof descriptor === 'string') {
       // Use specific descriptor for action.
       const descriptorInstance = this.getDescriptor(descriptor);
   
       if (!descriptorInstance) {
         throw new Error(`No such descriptor: ${descriptor}`);
       }
   
       return descriptorInstance.isCMPActive(page);
     } else if (typeof descriptor === 'undefined') {
       const detectedCmp = await this.detectCMP(page);
 
       if (detectedCmp !== null && await detectedCmp.isCMPActive(page) === true)
         return detectedCmp;
       else
         return false;
     } else throw new Error(`Invalid argument passed as descriptor ("${descriptor}", type: ${typeof descriptor})`);
   }
}