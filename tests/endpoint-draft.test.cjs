require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { useForm } = require('react-hook-form');
const { useEndpointDraft } = require('../src/features/endpoints/use-endpoint-draft.ts');
global.IS_REACT_ACT_ENVIRONMENT = true;

async function fixture(t) {
  const previousFetch = global.fetch, previousWindow = global.window;
  global.window = new EventTarget();
  const writes = []; let finish, form, draft, renderer;
  const response = new Promise(resolve => { finish = resolve; });
  global.fetch = async (_path, init) => {
    if (!init?.method) return response;
    writes.push({ method:init.method, ...JSON.parse(init.body) });
    return Response.json({ revision:'revision' });
  };
  function Editor() {
    form = useForm({ defaultValues:{ name:'Original',baseUrl:'https://api.example.com',responses:[] } });
    draft = useEndpointDraft('project','endpoint:test',form,JSON.parse);
    return null;
  }
  await act(async()=>{ renderer=create(React.createElement(Editor)); });
  t.after(async()=>{
    await act(async()=>{renderer.unmount();});
    global.fetch=previousFetch;global.window=previousWindow;
  });
  return {
    get form(){return form;}, get draft(){return draft;}, writes,
    recover: async payload => { await act(async()=>{ finish(Response.json({payload:payload ? JSON.stringify(payload) : null,revision:'revision',writeOrder:0})); }); },
    fail: async()=>{ await act(async()=>{finish(Response.json({error:'Temporarily unavailable'},{status:503}));}); },
    edit: async (key,value) => { await act(async()=>{ form.setValue(key,value,{shouldDirty:true}); }); },
    flush: async()=>{ await act(async()=>{ window.dispatchEvent(new Event('pagehide')); }); },
    saved: { name:'Saved',baseUrl:'https://saved.example.com',responses:[{statusCode:201}] },
  };
}

test('saved draft restores automatically if the user has not started editing', async t => {
  const f=await fixture(t);assert.equal(f.draft.loading,true);
  await f.recover(f.saved);
  assert.deepEqual(f.form.getValues(),f.saved);assert.equal(f.draft.hasRecoveredDraft,false);
  await f.flush();assert.equal(f.writes.length,0);
});

test('late recovery preserves edits and waits for a choice before any draft write', async t => {
  const f=await fixture(t);
  await f.edit('name','Typed while loading');
  await f.edit('responses',[]); // Recovery must not resurrect removed rows.
  await f.recover(f.saved);
  assert.equal(f.form.getValues('name'),'Typed while loading');
  assert.deepEqual(f.form.getValues('responses'),[]);
  assert.equal(f.draft.hasRecoveredDraft,true);assert.equal(f.draft.loading,false);
  await f.flush();assert.equal(f.writes.length,0);
  await act(async()=>{f.draft.keepCurrent();});
  await f.flush();assert.equal(f.draft.hasRecoveredDraft,false);
  assert.equal(JSON.parse(f.writes.at(-1).payload).name,'Typed while loading');
});

test('explicit restoration replaces current edits with the saved draft without autosaving over it', async t => {
  const f=await fixture(t);await f.edit('name','Current edit');await f.recover(f.saved);
  await act(async()=>{f.draft.restore();});
  assert.deepEqual(f.form.getValues(),f.saved);
  await f.flush();assert.equal(f.writes.length,0);
});

test('edits made during an empty draft check are queued for autosave once it completes', async t => {
  const f=await fixture(t);await f.edit('baseUrl','https://new.example.com/v1');
  await f.recover(null);assert.equal(f.draft.hasRecoveredDraft,false);
  await f.flush();assert.equal(JSON.parse(f.writes.at(-1).payload).baseUrl,'https://new.example.com/v1');
});

test('background recovery failure preserves edits and never writes without a revision', async t => {
  const f=await fixture(t);await f.edit('name','Keep this edit');await f.fail();
  assert.equal(f.form.getValues('name'),'Keep this edit');
  assert.equal(f.draft.loading,false);assert.equal(f.draft.error,true);
  assert.equal(f.draft.token(),undefined);
  await f.flush();assert.equal(f.writes.length,0);
});

test('edits entered before recovery completes autosave after its normal debounce', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const f=await fixture(t);await f.edit('name','New endpoint');await f.recover(null);
  await act(async()=>{t.mock.timers.tick(600);});
  assert.equal(f.writes.length,1);assert.equal(f.writes[0].method,'PUT');
  assert.equal(JSON.parse(f.writes[0].payload).name,'New endpoint');
  assert.equal(f.draft.status,'Draft saved');
  assert.equal(f.draft.isCurrentSaved(), true);
  await f.edit('name', 'More edits');
  assert.equal(f.draft.isCurrentSaved(), false);
});

test('discard clears the leave warning baseline and subsequent edits are unsaved again', async t => {
  const f = await fixture(t); await f.recover(null);
  await f.edit('name', 'Discard this');
  assert.equal(f.draft.isCurrentSaved(), false);
  const baseline = { name: 'Original', baseUrl: 'https://api.example.com', responses: [] };
  await act(async () => { await f.draft.discard(baseline); });
  assert.equal(f.draft.isCurrentSaved(), true);
  assert.deepEqual(f.form.getValues(), baseline);
  await f.flush(); assert.equal(f.writes.filter(write => write.method === 'PUT').length, 0);
  await f.edit('name', 'New change'); assert.equal(f.draft.isCurrentSaved(), false);
});

test('restored drafts are safe to leave, but recovery errors and failed saves still warn', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = await fixture(t); await f.recover(f.saved);
  assert.equal(f.draft.isCurrentSaved(), true);
  global.fetch = async () => Response.json({ error: 'Unavailable' }, { status: 503 });
  await f.edit('name', 'Not persisted');
  await act(async () => { t.mock.timers.tick(600); });
  assert.equal(f.draft.error, true); assert.equal(f.draft.isCurrentSaved(), false);
});

// Two mounted editors use the same server record, matching two tabs for one user.
async function twoTabs(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const previousFetch = global.fetch, previousWindow = global.window;
  global.window = new EventTarget();
  const record = { revision: 'initial', writeOrder: 0, payload: null };
  const tabs = [], writes = [];
  let renderer, nextRevision = 0;
  global.fetch = async (_path, init) => {
    if (!init?.method) return Response.json(record);
    const input = JSON.parse(init.body); writes.push({ method: init.method, ...input });
    if (input.revision !== record.revision || (init.method === 'PUT' && input.writeOrder <= record.writeOrder)) {
      return Response.json({ error: 'This draft changed in another tab.' }, { status: 409 });
    }
    if (init.method === 'DELETE') Object.assign(record, { revision: `next-${++nextRevision}`, writeOrder: 0, payload: null });
    else Object.assign(record, { writeOrder: input.writeOrder, payload: input.payload });
    return Response.json({ revision: record.revision });
  };
  function Editor({ index }) {
    const form = useForm({ defaultValues: { name: 'Original' } });
    const draft = useEndpointDraft('project', 'endpoint:existing', form, JSON.parse);
    tabs[index] = { form, draft };
    return null;
  }
  await act(async () => { renderer = create(React.createElement(React.Fragment, null, React.createElement(Editor, { index: 0 }), React.createElement(Editor, { index: 1 }))); });
  t.after(async () => {
    await act(async () => { renderer.unmount(); });
    global.fetch = previousFetch; global.window = previousWindow;
  });
  return {
    tabs, record, writes,
    edit: async (index, name) => { await act(async () => { tabs[index].form.setValue('name', name, { shouldDirty: true }); }); },
    save: async () => { await act(async () => { t.mock.timers.tick(600); }); },
  };
}

test('competing tab autosaves preserve both forms and offer explicit recovery instead of an unavailable error', async t => {
  const f = await twoTabs(t);
  await f.edit(0, 'First tab'); await f.edit(1, 'Second tab'); await f.save();
  const second = () => f.tabs[1];
  assert.equal(JSON.parse(f.record.payload).name, 'First tab');
  assert.equal(second().form.getValues('name'), 'Second tab');
  assert.equal(second().draft.error, false); assert.equal(second().draft.hasRecoveredDraft, true);
  assert.match(second().draft.status, /Draft changed in another tab/);
  assert.equal(second().draft.isCurrentSaved(), false); assert.equal(second().draft.token(), undefined);
  const count = f.writes.length;
  await f.edit(1, 'Still editing'); await f.save();
  assert.equal(f.writes.length, count);
  await act(async () => { second().draft.keepCurrent(); }); await f.save();
  assert.equal(JSON.parse(f.record.payload).name, 'Still editing');
  assert.equal(second().draft.hasRecoveredDraft, false); assert.equal(second().draft.isCurrentSaved(), true);
});

test('restoring after a tab conflict replaces local edits with the saved draft without another write', async t => {
  const f = await twoTabs(t);
  await f.edit(0, 'Saved elsewhere'); await f.edit(1, 'Local edit'); await f.save();
  const count = f.writes.length;
  await act(async () => { f.tabs[1].draft.restore(); }); await f.save();
  assert.equal(f.tabs[1].form.getValues('name'), 'Saved elsewhere');
  assert.equal(f.tabs[1].draft.isCurrentSaved(), true); assert.equal(f.writes.length, count);
});

test('discard on an existing endpoint resets the typed name after another tab replaces the draft revision', async t => {
  const f = await twoTabs(t);
  await act(async () => { await f.tabs[0].draft.discard({ name: 'Original' }); });
  await f.edit(0, 'Replacement draft'); await f.save();
  await f.edit(1, 'Discard this name');
  await act(async () => { await f.tabs[1].draft.discard({ name: 'Original' }); });
  assert.equal(f.tabs[1].form.getValues('name'), 'Original');
  assert.equal(f.tabs[1].draft.isCurrentSaved(), true); assert.equal(f.tabs[1].draft.error, false);
  assert.equal(f.tabs[1].draft.status, 'Draft discarded');
  assert.equal(JSON.parse(f.record.payload).name, 'Replacement draft');
  await f.edit(1, 'New local edit'); await f.save();
  assert.equal(f.tabs[1].draft.hasRecoveredDraft, true);
  assert.equal(JSON.parse(f.record.payload).name, 'Replacement draft');
  await act(async () => { f.tabs[1].draft.keepCurrent(); }); await f.save();
  assert.equal(JSON.parse(f.record.payload).name, 'New local edit');
});

test('a tab whose draft was cleared can keep its current edits without a nonexistent Restore action', async t => {
  const f = await twoTabs(t);
  await act(async () => { await f.tabs[0].draft.discard({ name: 'Original' }); });
  await f.edit(1, 'Keep after clear'); await f.save();
  assert.equal(f.tabs[1].draft.hasRecoveredDraft, true); assert.equal(f.tabs[1].draft.canRestore, false);
  assert.equal(f.tabs[1].form.getValues('name'), 'Keep after clear');
  await act(async () => { f.tabs[1].draft.keepCurrent(); }); await f.save();
  assert.equal(JSON.parse(f.record.payload).name, 'Keep after clear');
});

test('discard resets an autosaved existing endpoint and ignores a late conflict recovery response', async t => {
  const f = await twoTabs(t);
  await f.edit(0, 'Autosaved name'); await f.save();
  assert.equal(f.tabs[0].draft.isCurrentSaved(), true);
  await act(async () => { await f.tabs[0].draft.discard({ name: 'Original' }); });
  assert.equal(f.tabs[0].form.getValues('name'), 'Original');
  assert.equal(f.record.payload, null);
  const backend = global.fetch;
  let finishRecovery;
  global.fetch = async (path, init) => {
    if (!init?.method) return new Promise(resolve => { finishRecovery = resolve; });
    return backend(path, init);
  };
  await f.edit(1, 'Discard while checking'); await f.save();
  assert.equal(f.tabs[1].draft.hasRecoveredDraft, true);
  await act(async () => { await f.tabs[1].draft.discard({ name: 'Original' }); });
  await act(async () => { finishRecovery(Response.json({ revision: 'old', writeOrder: 1, payload: '{"name":"Late draft"}' })); });
  assert.equal(f.tabs[1].form.getValues('name'), 'Original');
  assert.equal(f.tabs[1].draft.hasRecoveredDraft, false);
  assert.equal(f.tabs[1].draft.status, 'Draft discarded');
  assert.equal(f.tabs[1].draft.isCurrentSaved(), true);
});
