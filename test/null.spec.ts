import 'mocha';
import { expect, assert } from 'chai';
import NullDescriptor from '../src/descriptors/null';
import { CMPManager } from '../src/cmpmanager';
import { withBrowserPage } from './util';

describe(NullDescriptor.name, async () => {
  const nullDescriptor = new NullDescriptor();

  it('Should immediately return true for isCMPActive()', async () => {
    withBrowserPage(async page => {
      expect(await nullDescriptor.isCMPActive(page)).to.be.true;
    });
  });

  it('Should immediately return true for isCMPPresent()', async () => {
    withBrowserPage(async page => {
      expect(await nullDescriptor.isCMPPresent(page)).to.be.true;
    });
  });

  it('Should immediately return for acceptAll()', async () => {
    withBrowserPage(async page => {
      expect(await nullDescriptor.acceptAll(page)).to.be.true;
    });
  });

  it('Should have no consent keys', async () => {
    expect(nullDescriptor.consentKeys).to.have.length(0);
  });

  it('Should yield no new cookies when "accepting" them on a page', async () => {
    withBrowserPage(async page => {
      const preCookies = await page.cookies();

      await nullDescriptor.acceptAll(page);

      const postCookies = await page.cookies();

      expect(postCookies).to.have.length(preCookies.length);
    });
  });

  it(`With default ${CMPManager.name}, should be able to retrieve a NullDescriptor`, async () => {
    const manager = await CMPManager.createManager();
    
    const descriptor = manager.getDescriptor(NullDescriptor.name);

    if (descriptor) {
      expect(descriptor.name).to.equal(NullDescriptor.name);
      expect(descriptor.consentKeys).to.be.empty;
    } else {
      assert.fail(`No descriptor was returned for ${NullDescriptor.name}`);
    }
  });
});