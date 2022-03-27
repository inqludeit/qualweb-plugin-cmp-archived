import 'mocha';
import { expect } from 'chai';
import * as path from 'path';

import { CMPManager } from '../src';
import { isCMPDescriptor, SimpleCMPDescriptor } from '../src/descriptors';

describe(CMPManager.name, () => {
  it('Should properly initialize (tests tag set-up)', () => {
    expect(async () => CMPManager.createManager()).to.not.throw();
  });

  it('Should properly initialize with a descriptor from file', async () => {
    const manager = await CMPManager.createManager('test/fixtures/descriptor.ts', false);

    expect(manager.descriptorNames).to.have.length(1);
    expect(manager.descriptorNames[0]).to.equal('descriptor.ts');
  });

  it('Should properly initialize with descriptors from array', async () => {
    const manager = await CMPManager.createManager(['test/fixtures/descriptor.ts'], false);

    expect(manager.descriptorNames).to.have.length(1);
    expect(manager.descriptorNames[0]).to.equal('descriptor.ts');
  });

  it('Should properly load a descriptor from a file', async () => {
    const manager = await CMPManager.createManager(undefined, false);

    await manager.addDescriptors(path.join(process.cwd(), 'test/fixtures/descriptor.ts'));

    expect(manager.descriptorNames).to.have.length(1);
    expect(manager.descriptorNames[0]).to.equal('descriptor.ts');
  });

  it('Should properly load an already instantiated descriptor', async () => {
    const manager = await CMPManager.createManager(undefined, false);

    const newDescriptor = new SimpleCMPDescriptor('simple_test', { cookies: ['aCookieName'] }, [''], ['']);

    await manager.addDescriptors([ newDescriptor ]);

    const names = manager.descriptorNames;

    expect(names).to.have.length(1);
    expect(names[0]).to.equal('simple_test');
  });

  it('Should properly load several already instantiated descriptors', async () => {
    const manager = await CMPManager.createManager(undefined, false);

    const newDescriptors = [
      new SimpleCMPDescriptor('simple_test', { cookies: ['aCookieName'] }, [''], ['']),
      new SimpleCMPDescriptor('basic_test', { cookies: ['aCookieName'] }, [''], ['']),
    ];

    await manager.addDescriptors(newDescriptors);

    const names = manager.descriptorNames;

    expect(names).to.have.length(newDescriptors.length);
    
    for (const descriptor of newDescriptors) {
      expect(names).to.contain(descriptor.name);
    }
  });

  it('Should properly load several descriptors via glob', async () => {
    const manager = await CMPManager.createManager(undefined, false);

    await manager.addDescriptors(path.join(process.cwd(), 'test/fixtures/*.ts'));

    expect(manager.descriptorNames).to.have.length(1);
    expect(manager.descriptorNames[0]).to.equal('descriptor.ts');
  });
});

describe(isCMPDescriptor.name, () => {
  it(`Should correctly recognize a ${SimpleCMPDescriptor.name}`, () => {
    expect(isCMPDescriptor(new SimpleCMPDescriptor('Test descriptor', { cookies: ['aCookieName'] }, [''], ['']))).to.be.true;
  });

  it('Should correctly fail to recognize an empty object.', () => {
    expect(isCMPDescriptor({})).to.be.false;
  });
});