# @inqludeit/qualweb-plugin-cmp

CMP management plugin for [QualWeb](https://www.github.com/qualweb/core).

CMPs are software solutions for websites, managing user consent. This is
necessary for the website to be compliant with GDPR. Often, they are simply
referred to as "cookie banners". In our work of monitoring the websites of
Danish authorities, we've found that pages with good accessibility may have
results that skewer into the negative, exclusively because of the
CMP present on the website.

This package is an effort to try and yield results that better represent a page
in use rather than "first impressions". It's a plugin for the QualWeb web
accessibility evaluation engine. Its purpose is to suppress or dismiss cookie
banners on a page prior to QualWeb's evaluation, so the evaluation can yield a
result that reflects a page "in use".

## Usage

Install alongside `@qualweb/core` with your package manager of choice:

```bash
npm install @inqludeit/qualweb-plugin-cmp
```

```bash
yarn add @inqludeit/qualweb-plugin-cmp
```

```bash
pnpm add @inqludeit/qualweb-plugin-cmp
```

Add it as a plugin prior to running your evaluations:

```typescript
import CmpPlugin from '@inqludeit/qualweb-plugin-cmp';
import QualWeb from '@qualweb/core';

const cmpPlugin = await CmpPlugin.create();

const qw = new QualWeb();

await qw.start();

qw.use(cmpPlugin);

await qw.evaluate({
  url: 'https://www.github.com',
});
```

If the plugin fails to detect a CMP (either because none of the descriptors
match - or because there isn't a CMP), the plugin will throw an error.

## Descriptors

We call the notion of "something that can detect and dismiss a CMP" a
"*descriptor*". The simplest form of a descriptor uses CSS selectors to find the
HTML elements of a CMP in a page, and simulates a mouse click on the appropriate
elements to accept/dismiss it.

The package comes bundled with a bunch of simple descriptors defined in YAML
files that can handle a number of known CMPs that we've come across in our work.
You can add any custom descriptors by passing their paths along to a
`CMPManager`, either by instantiating one yourself or adding descriptors to it
after construction:

```typescript
const manager = await CMPManager.create();

class MyDescriptor extends CMPDescriptor {
  /* Your implementation goes here */
}

manager.addDescriptors([ new MyDescriptor() ]);

qw.use(new CmpPlugin(manager));
```

A `CMPManager` in the plugin manages all known descriptors, and takes care of
trying them all out when a page is loaded.

## API (work-in-progress)

A few notes on stuff you can do with the library.

### Storing and re-using cookies

`CMPManager.parsePage()` returns the data necessary to suppress CMP banners in
future page loads (as long as the matching CMPDescriptor fetches it on request).

If you're testing `https://domain.com/news` and later intend on testing
`https://domain.com/about`, you can re-use the data from
`CMPManager.parsePage()` to avoid having to re-detect the CMP:

```typescript
// Type annotations have been omitted for brevity.
const manager = await CMPManager.create();

// A simple plugin that uses the CMPManager directly.
const simpleCookiePlugin: QualwebPlugin {
  cookies: [],

  async afterPageLoad(page) {
    const result = await manager.parsePage(page);

    // Assuming success, store the relevant cookies locally.
    if (result !== null) {
      cookies.push(result.push(... result.cookies));
    }
  }

  async beforePageLoad(page) {
    // Inject known cookies into the page before it loads target URL.
    await page.setCookie(... this.cookies);
  }
}
```

The following version instead stores the name of the successful descriptor, and
hints at it in following calls.

```typescript
// Type annotations have been omitted for brevity.
const manager = await CMPManager.create();

// A simple plugin that uses the CMPManager directly.
const simpleCookiePlugin: QualwebPlugin {
  descriptor: null,

  async afterPageLoad(page) {
    if (this.descriptor !== null) {
      // Use the name of an existing descriptor if it's set.
      await manager.parsePage(page, { descriptor: this.descriptor });
    } else {
      // Otherwise, go through all the descriptors.
      const result = await manager.parsePage(page);

      // If we found a match, store the name of the descriptor for future use.
      if (result !== null) {
        this.descriptor = result?.descriptor;
      }
    }
  }
}
```

## Known issues

This first version of the plugin is somewhat barebones, pretty much just a copy
of our code torn out from the rest of the system. Generally, this just means
that the current code makes a some assumptions about use cases that fit how we
deal with CMPs. If you write your own plugin and use `CMPManager` directly, I
think a lot of use cases will be covered.

## Contributing

We're still trying to settle into a development flow for the package, so while
any interest is certainly welcome, I only have the resources to take on bugs or
pull in new descriptors that fit within the library as-is.
