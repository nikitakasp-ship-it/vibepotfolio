import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {scanPortfolio, serializeCatalog} from './catalog.mjs';

test('catalog discovers videos, requires frame covers, and validates metadata and stable ids', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'midnight-catalog-'));
  try {
    assert.equal((await scanPortfolio(root)).projects.length, 0);

    const dir = path.join(root, 'AI', 'avatars', 'studio');
    await mkdir(dir, {recursive: true});
    await writeFile(path.join(dir, 'Лицо #1.MP4'), 'fixture');
    await writeFile(path.join(dir, 'Лицо #1.jpg'), 'poster');
    await writeFile(path.join(dir, 'Лицо #1.json'), JSON.stringify({
      title: {ru: 'Аватар <studio>', en: 'Avatar'},
      description: 'Description',
    }));

    const first = await scanPortfolio(root);
    const video = first.projects[0];
    assert.equal(video.category, 'avatars');
    assert.equal(video.copy.title.en, 'Avatar');
    assert.match(video.video, /%23/);
    assert.match(video.poster, /\.jpg$/);
    const sandbox = {window: {}};
    vm.runInNewContext(serializeCatalog(first), sandbox);
    assert.equal(sandbox.window.PORTFOLIO_CATALOG.projects[0].copy.title.ru, 'Аватар <studio>');

    const secondDir = path.join(root, 'Motion', 'crypto');
    await mkdir(secondDir, {recursive: true});
    await writeFile(path.join(secondDir, 'Лицо #1.MP4'), 'fixture');
    await assert.rejects(scanPortfolio(root), /Missing poster/);
    await writeFile(path.join(secondDir, 'Лицо #1.jpg'), 'poster');
    assert.equal((await scanPortfolio(root)).projects[0].id, video.id);

    await writeFile(path.join(dir, 'Лицо #1.json'), '{bad');
    await assert.rejects(scanPortfolio(root), /Invalid metadata/);
    await rm(path.join(dir, 'Лицо #1.json'));
    await writeFile(path.join(dir, 'Лицо #1.MP4'), '');
    await assert.rejects(scanPortfolio(root), /Empty video/);
  } finally {
    if (path.dirname(root) !== os.tmpdir() || !path.basename(root).startsWith('midnight-catalog-')) {
      throw new Error('Unsafe test cleanup');
    }
    await rm(root, {recursive: true, force: true});
  }
});
