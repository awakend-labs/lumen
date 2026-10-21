require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  restrictToReorderArea,
  restrictToVerticalReorder,
} = require('../src/lib/reorder.ts');

function rect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function dragArgs(x = 0, y = 0) {
  return {
    containerNodeRect: rect(100, 200, 400, 500),
    draggingNodeRect: rect(150, 250, 100, 80),
    transform: { x, y, scaleX: 1, scaleY: 1 },
  };
}

test('grid dragging follows both axes freely inside its own layout', () => {
  for (const [x, y] of [[0, 0], [180, 310], [-35, 28], [250, 370], [-50, -50]]) {
    const args = dragArgs(x, y);
    assert.deepEqual(restrictToReorderArea(args), args.transform);
  }
});

test('each layout edge resists extreme movement with at most 8px of give', () => {
  const cases = [
    { x: -1e6, y: 0, axis: 'x', lower: -58, upper: -50 },
    { x: 1e6, y: 0, axis: 'x', lower: 250, upper: 258 },
    { x: 0, y: -1e6, axis: 'y', lower: -58, upper: -50 },
    { x: 0, y: 1e6, axis: 'y', lower: 370, upper: 378 },
  ];
  for (const { x, y, axis, lower, upper } of cases) {
    const result = restrictToReorderArea(dragArgs(x, y));
    assert.ok(result[axis] > lower && result[axis] < upper);
    assert.equal(result[axis === 'x' ? 'y' : 'x'], 0);
  }
});

test('edge resistance is gradual and increases less than the pointer movement', () => {
  const near = restrictToReorderArea(dragArgs(251, 371));
  const farther = restrictToReorderArea(dragArgs(254, 374));
  assert.ok(near.x > 250 && near.x < 251);
  assert.ok(near.y > 370 && near.y < 371);
  assert.ok(farther.x > near.x && farther.x < 254);
  assert.ok(farther.y > near.y && farther.y < 374);
  assert.ok(farther.x - near.x < 3);
  assert.ok(farther.y - near.y < 3);
});

test('diagonal dragging stays within the allowed give at both edges', () => {
  for (const [x, y] of [[-1e6, -1e6], [1e6, 1e6], [-1e6, 1e6], [1e6, -1e6]]) {
    const result = restrictToReorderArea(dragArgs(x, y));
    assert.ok(result.x >= -58 && result.x <= 258);
    assert.ok(result.y >= -58 && result.y <= 378);
  }
});

test('list and stash dragging stays vertical while retaining normal y movement', () => {
  assert.deepEqual(restrictToVerticalReorder(dragArgs(180, 310)), {
    x: 0, y: 310, scaleX: 1, scaleY: 1,
  });
  const beyondEnd = restrictToVerticalReorder(dragArgs(1e6, 1e6));
  assert.equal(beyondEnd.x, 0);
  assert.ok(beyondEnd.y > 370 && beyondEnd.y < 378);
});

test('missing measurements leave grid movement intact without throwing', () => {
  for (const missing of ['containerNodeRect', 'draggingNodeRect']) {
    const args = { ...dragArgs(25, 45), [missing]: null };
    assert.strictEqual(restrictToReorderArea(args), args.transform);
    assert.deepEqual(restrictToVerticalReorder(args), {
      ...args.transform, x: 0,
    });
  }
});

test('an item wider than its parent cannot jump sideways but can still move vertically', () => {
  const args = dragArgs(300, 120);
  args.draggingNodeRect = rect(90, 250, 450, 80);
  assert.deepEqual(restrictToReorderArea(args), {
    x: 0, y: 120, scaleX: 1, scaleY: 1,
  });
});

test('an item taller than its parent cannot jump vertically but can still move horizontally', () => {
  const args = dragArgs(120, 300);
  args.draggingNodeRect = rect(150, 190, 100, 550);
  assert.deepEqual(restrictToReorderArea(args), {
    x: 120, y: 0, scaleX: 1, scaleY: 1,
  });
});

test('current scroll-adjusted measurements retain the same layout bounds', () => {
  const initial = dragArgs(1e6, -1e6);
  const scrolled = {
    ...initial,
    containerNodeRect: rect(65, -220, 400, 500),
    draggingNodeRect: rect(115, -170, 100, 80),
  };
  assert.deepEqual(restrictToReorderArea(scrolled), restrictToReorderArea(initial));
});

test('scroll-aware parent bounds constrain the initial dragged-item measurement', () => {
  const args = dragArgs(1e6, 1e6);
  // Core keeps the initial item measurement while the parent rect follows
  // scrolling, then compensates the rendered item's scroll offset separately.
  args.containerNodeRect = rect(65, -220, 400, 500);
  const result = restrictToReorderArea(args);
  const right = args.draggingNodeRect.right + result.x;
  const bottom = args.draggingNodeRect.bottom + result.y;
  assert.ok(right > args.containerNodeRect.right);
  assert.ok(right < args.containerNodeRect.right + 8);
  assert.ok(bottom > args.containerNodeRect.bottom);
  assert.ok(bottom < args.containerNodeRect.bottom + 8);
});

test('constraints preserve transform metadata and never mutate their inputs', () => {
  const args = dragArgs(1e6, -1e6);
  args.transform.scaleX = 1.15;
  args.transform.scaleY = 0.9;
  const snapshot = structuredClone(args);
  Object.freeze(args.transform);
  Object.freeze(args.containerNodeRect);
  Object.freeze(args.draggingNodeRect);
  Object.freeze(args);
  for (const modifier of [restrictToReorderArea, restrictToVerticalReorder]) {
    const result = modifier(args);
    assert.equal(result.scaleX, 1.15);
    assert.equal(result.scaleY, 0.9);
    assert.notStrictEqual(result, args.transform);
    assert.deepEqual(args, snapshot);
  }
});
