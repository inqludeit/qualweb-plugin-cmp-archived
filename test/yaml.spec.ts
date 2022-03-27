import 'mocha';
import { expect, assert } from 'chai';
import { YamlDescriptor } from '../src/descriptors/yaml';
import { fixturePath, readFixtureFile, withBrowserPage, withStaticServer } from './util';

async function readBadYaml(): Promise<string> {
  return readFixtureFile('baddescriptor.yaml');
}

async function readSingleCookieYaml(): Promise<string> {
  return readFixtureFile('single-cookie.yaml');
}

async function readMultipleCookieYaml(): Promise<string> {
  return readFixtureFile('multiple-cookie.yaml');
}

async function readLocalStorageYaml(): Promise<string> {
  return readFixtureFile('gooddescriptor.localStorage.yaml');
}

const tests: [string, () => Promise<string>][] = [
  ['single', readSingleCookieYaml],
  ['multiple', readMultipleCookieYaml],
];

tests.forEach(v => {
  const testType = v[0];
  const readFn = v[1];

  describe(`${YamlDescriptor.name} (cookies, ${testType})`, function () {
    this.timeout('30s');
  
    it('Should correctly detect a cookie banner on a page', async () => {
      const desc = new YamlDescriptor(await readFn());
  
      await withStaticServer(async (host) => {
        await withBrowserPage(async page => {
          await page.goto(`http://${host}/cookiesite.html`);
  
          expect(await desc.isCMPPresent(page)).to.be.true;
          expect(() => desc.acceptAll(page)).to.not.throw;
        });
      });
    });
  
    it('Should correctly detect an active cookie banner on a page', async () => {
      const desc = new YamlDescriptor(await readFn());
  
      await withStaticServer(async (host) => {
        await withBrowserPage(async page => {
          await page.goto(`http://${host}/cookiesite.html`);
  
          expect(await desc.isCMPPresent(page)).to.be.true;
          expect(await desc.isCMPActive(page)).to.be.true;
        });
      });
    });

    it('Should fail to detect an inactive (but present) cookie banner on a page', async () => {
      const desc = new YamlDescriptor(await readFn());
  
      await withStaticServer(async (host) => {
        await withBrowserPage(async page => {
          await page.goto(`http://${host}/cookiesite_inactive.html`);
  
          expect(await desc.isCMPPresent(page)).to.be.true;
          expect(await desc.isCMPActive(page)).to.be.false;
        });
      });
    });

    it('Should correctly wait for a slow cookie banner to become active', async () => {
      const desc = new YamlDescriptor(await readFn());
  
      await withStaticServer(async (host) => {
        await withBrowserPage(async page => {
          await page.goto(`http://${host}/cookiesite_lateactive.html`);
  
          expect(await desc.isCMPPresent(page)).to.be.true;
          expect(await desc.isCMPActive(page)).to.be.true;
        });
      });
    });

    it('Should correctly fail to detect a cookie banner on a page without any', async () => {
      const desc = new YamlDescriptor(await readFn());
  
      await withStaticServer(async (host) => {
        await withBrowserPage(async page => {
          await page.goto(`http://${host}/nocookiesite.html`);
  
          expect(await desc.isCMPPresent(page)).to.be.false;
        });
      });
    });
  
    it('Should correctly parse a properly formatted descriptor file', async () => {
      expect(async () => await YamlDescriptor.createFromPath(fixturePath('single-cookie.yaml'))).to.not.throw();
    });
  
    it('Should correctly parse a properly formatted descriptor file (sync)', () => {
      expect(() => YamlDescriptor.createFromPathSync(fixturePath('single-cookie.yaml'))).to.not.throw();
    });
  
    it('Should correctly fail to parse a badly formatted descriptor file', async () => {
      try {
        await YamlDescriptor.createFromPath(fixturePath('baddescriptor.yaml'));
  
        expect.fail();
      } catch (_err: unknown) {
        // Yaaay
      }
    });
  
    it('Should correctly fail to parse a badly formatted descriptor file (sync)', () => {
      expect(() => YamlDescriptor.createFromPathSync(fixturePath('baddescriptor.yaml'))).to.throw();
    });
  
    it('Should correctly fail to parse a non-existent file', async () => {
      try {
        await YamlDescriptor.createFromPath(fixturePath('sdfjiopasfp'));
  
        assert.fail();
      } catch (_err: unknown) {
        // Yaaay
      }
    });
  
    it('Should correctly fail to parse a non-existent file (sync)', () => {
      expect(() => YamlDescriptor.createFromPathSync('SPOIJ ASJPIURHWP ASP AJK')).to.throw();
    });
  
    it('Should correctly detect its cookie in a page (single)', async () => {
      const desc = new YamlDescriptor(await readFn());
  
      await withStaticServer(async (host) => {
        await withBrowserPage(async page => {
          await page.goto(`http://${host}/cookiesite.html`);
  
          expect(await desc.isCMPPresent(page)).to.be.true;
          await desc.acceptAll(page);
  
          const cookies = await desc.getConsentData(page);
  
          expect(cookies).to.not.be.null;
          expect(cookies).to.have.length(desc.consentKeys.length);
        });
      });
    });
  });
});
