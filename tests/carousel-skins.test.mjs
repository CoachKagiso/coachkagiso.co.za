import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CUSTOM_SKIN_PREFIX,
  isCustomSkinValue,
  listTemplateOptions,
  resolveSkinOption,
  resolveTemplateOption,
  sanitiseFurniture,
  sanitisePalette,
} from '../lib/content/carousel-skins.ts';
import { carouselTemplateOptions } from '../lib/content/carousel-template-registry.ts';

const skin = {
  id: 'abc123',
  name: 'Midnight',
  baseTemplate: 'editorial_authority',
  palette: { background: '#101820', foreground: '#F5F3EE' },
  furniture: { wordmark: 'KAGISO' },
  createdAt: '',
  updatedAt: '',
};

test('a skin inherits everything it does not override', () => {
  const base = carouselTemplateOptions.find((option) => option.value === 'editorial_authority');
  const resolved = resolveSkinOption(skin);

  assert.equal(resolved.palette.background, '#101820', 'override applies');
  assert.equal(resolved.palette.accent, base.palette.accent, 'unset colours come from the base');
  assert.equal(resolved.furniture.wordmark, 'KAGISO');
  assert.equal(resolved.furniture.footerLeft, base.furniture.footerLeft);
  assert.equal(resolved.layoutRecipe.value, base.layoutRecipe.value, 'behaviour stays with the base');
  assert.deepEqual(resolved.promptBehavior, base.promptBehavior);
});

test('a resolved skin carries every field the renderers read', () => {
  const resolved = resolveSkinOption(skin);
  for (const key of ['background', 'foreground', 'muted', 'accent', 'panel', 'border', 'chipBackground', 'chipText']) {
    assert.equal(typeof resolved.palette[key], 'string', `${key} must be present for the PDF renderer`);
  }
  assert.ok(resolved.designDirection, 'design direction must survive');
  assert.ok(resolved.preview, 'preview must survive');
});

test('custom values are namespaced so they cannot collide with a built-in', () => {
  assert.equal(resolveSkinOption(skin).value, `${CUSTOM_SKIN_PREFIX}abc123`);
  assert.equal(isCustomSkinValue('editorial_authority'), false);
  assert.equal(isCustomSkinValue(`${CUSTOM_SKIN_PREFIX}abc123`), true);
  for (const option of carouselTemplateOptions) {
    assert.equal(isCustomSkinValue(option.value), false, `${option.value} must not look custom`);
  }
});

test('a deleted skin falls back to a built-in rather than throwing', () => {
  const resolved = resolveTemplateOption(`${CUSTOM_SKIN_PREFIX}missing`, []);
  assert.ok(resolved.palette.background, 'still renderable');
  assert.equal(isCustomSkinValue(resolved.value), false);
});

test('built-in values resolve untouched when skins exist', () => {
  const resolved = resolveTemplateOption('warm_coaching', [skin]);
  assert.equal(resolved.value, 'warm_coaching');
});

test('the picker lists built-ins first, then custom skins', () => {
  const options = listTemplateOptions([skin]);
  assert.equal(options.length, carouselTemplateOptions.length + 1);
  assert.equal(options[0].value, carouselTemplateOptions[0].value);
  assert.equal(options[options.length - 1].label, 'Midnight');
});

test('only known palette slots and primitive furniture survive', () => {
  const palette = sanitisePalette({ background: '#fff', evil: 'url(x)', accent: 42 });
  assert.deepEqual(palette, { background: '#fff' });

  const furniture = sanitiseFurniture({ wordmark: 'A', swipeCue: true, wordmarkSize: 20, nested: { a: 1 } });
  assert.deepEqual(furniture, { wordmark: 'A', swipeCue: true, wordmarkSize: 20 });
});
