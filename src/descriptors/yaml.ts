import fsSync, { promises as fs } from 'fs';
import yaml from 'js-yaml';
import { toArray } from './util';

// Import directly from the source file, not the index. Doing otherwise might
// cause TypeErrors because of load order.
import { SimpleCMPDescriptor } from './simple';

export interface CreateFromPathOptions {
  encoding?: BufferEncoding;
}

export interface YamlDescriptorFile {
  name: string;
  
  /**
   * Name(s) of the cookies that are set by this CMP. Mutually exclusive with
   * localStorage setting.
   */
  cookieName: string | string[];

  /**
   * If the CMP stores consent data in localStorage instead of cookies, set
   * the name(s) of the relevant values here. Each value in the array should
   * either be the key of the value in localStorage, or an object with the key
   * and optionally a value or pattern that must match for the consent data to
   * validate.
   */
  localStorage: (
    string | {
      /**
       * Key of the object to check for in localStorage.
       */
      key: string;

      /**
       * If set, either an exact value to look for, or a regular expression that
       * will be matched against the value. To use a regular expression, format
       * the string as a regular expression in JavaScript (e.g. /myPattern/i).
       */
      value?: string;
    }
  )[];

  /**
   * If set, a timeout (waiting period) that will be enforced before
   * looking for CMP presence and after clicking a button (to ensure 
   * storage has happened). Defaults to 2000ms.
   */
  timeout?: number;

  selectors: {
    presence: string[];
    acceptAll: string[];
    rejectAll?: string[];
    acceptDefault?: string[];
  };
}

/**
 * Descriptor that loads its cookie description from a yaml file. The expected
 * structure of the yaml file is given in @see YamlDescriptorFile .
 */
export class YamlDescriptor extends SimpleCMPDescriptor {
  public get tag(): string {
    return `${YamlDescriptor.name} (for "${this.name}")`;
  }

  constructor(yamlSource: string | YamlDescriptorFile) {
    // Coerce to YamlDescriptorFile, if necessary.
    const yamlData: YamlDescriptorFile = typeof yamlSource === 'string'
      ? yaml.load(yamlSource) as YamlDescriptorFile
      : yamlSource;

    if (!yamlData.name || !yamlData.cookieName || !yamlData.selectors.presence || !yamlData.selectors.acceptAll) {
      throw new Error(`One or more fields are missing from passed object. Required fields are "name", "cookieName", "selectors.presence", "selectors.acceptAll".`);
    }

    super(yamlData.name, {
        cookies: yamlData.cookieName,
        localStorage: yamlData.localStorage,
      },
      toArray(yamlData.selectors.presence),
      toArray(yamlData.selectors.acceptAll),
      yamlData.selectors.acceptDefault ? toArray(yamlData.selectors.acceptDefault) : undefined,
      yamlData.selectors.rejectAll ? toArray(yamlData.selectors.rejectAll) : undefined,
      yamlData.timeout,
    );
  }

  static async createFromPath(path: string, options?: CreateFromPathOptions): Promise<YamlDescriptor> {
    const encoding = options?.encoding || 'utf-8';

    const fileContents = await fs.readFile(path, { encoding });

    const cmpData = yaml.load(fileContents, {
      filename: path,
      onWarning(e) {
        throw e;
      },
    }) as YamlDescriptorFile;

    return new YamlDescriptor(cmpData);
  }

  static createFromPathSync(path: string, options?: CreateFromPathOptions): YamlDescriptor {
    const encoding = options?.encoding || 'utf-8';

    const fileContents = fsSync.readFileSync(path, { encoding });

    const cmpData = yaml.load(fileContents, {
      filename: path,
      onWarning(e) {
        throw e;
      },
    }) as YamlDescriptorFile;

    return new YamlDescriptor(cmpData);
  }
}

export default YamlDescriptor;