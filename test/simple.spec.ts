import 'mocha';
import { expect, assert } from 'chai';
import { SimpleCMPDescriptor } from '../src/descriptors/simple';
import { withBrowserPage, withStaticServer } from './util';

function minimalFixture(): SimpleCMPDescriptor {
  return new SimpleCMPDescriptor('successful-descriptor', { cookies: ['cookie-name'] }, ['#cookie-banner-div'], ['#cookie-banner-accept-all']);
}

function fullFixture(): SimpleCMPDescriptor {
  return new SimpleCMPDescriptor(
    'successful-descriptor',
    { cookies: ['cookie-name'] },
    ['#cookie-banner-div'],
    ['#cookie-banner-accept-all'],
    ['#cookie-banner-accept-default'],
  );
}

describe(SimpleCMPDescriptor.name, function () {
  this.timeout('10s');

  it('Should detect a cookie banner on a page (minimal)', async () => {
    const desc = minimalFixture();

    await withStaticServer(async (host) => {
      await withBrowserPage(async page => {
        await page.goto(`http://${host}/cookiesite.html`);

        expect(await desc.isCMPPresent(page)).to.be.true;
        expect(() => desc.acceptAll(page)).to.not.throw;
      });
    });
  });

  it('Should fail to detect a cookie banner on a page without any (minimal)', async () => {
    const desc = minimalFixture();

    await withStaticServer(async (host) => {
      await withBrowserPage(async page => {
        await page.goto(`http://${host}/nocookiesite.html`);

        expect(await desc.isCMPPresent(page)).to.be.false;
      });
    });
  });

  it('Should fail to accept a cookie banner on a page without any (minimal)', async () => {
    const desc = minimalFixture();

    await withStaticServer(async (host) => {
      await withBrowserPage(async page => {
        await page.goto(`http://${host}/nocookiesite.html`);

        expect(() => desc.acceptAll(page)).to.throw;
      });
    });
  });
});