require('./register.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {create,act}=require('react-test-renderer');
const {useForm}=require('react-hook-form');
const {bodyFieldsToJson}=require('../src/lib/body-field-json.ts');
const {useBodyFieldJson}=require('../src/features/endpoints/use-body-field-json.ts');
global.IS_REACT_ACT_ENVIRONMENT=true;
const field={key:'email',type:'string',value:'jamie@example.com',required:true,description:'Account email',format:'email',min:'',max:'',default:'',enumValues:[]};

test('body fields produce an ordered schema and typed example with constraints',()=>{
  const result=bodyFieldsToJson([field,{...field,key:'count',type:'integer',value:'0',min:'0',max:'100',format:'',required:false},{...field,key:'enabled',type:'boolean',value:'false',format:''},{...field,key:'roles',type:'array',value:'["member"]',format:''}]);
  const schema=JSON.parse(result.requestSchema),example=JSON.parse(result.requestExample);
  assert.deepEqual(Object.keys(schema.properties),['email','count','enabled','roles']);
  assert.deepEqual(schema.required,['email','enabled','roles']);
  assert.equal(schema.properties.email.format,'email');
  assert.equal(schema.properties.count.minimum,0);
  assert.equal(schema.properties.count.maximum,100);
  assert.deepEqual(example,{email:'jamie@example.com',count:0,enabled:false,roles:['member']});
});
test('generation handles empty rows, enums, defaults, explicit examples, and prototype-like names',()=>{
  assert.deepEqual(bodyFieldsToJson([{...field,key:' '}]),{requestSchema:'',requestExample:''});
  const generated=bodyFieldsToJson([{...field,key:'__proto__',value:'safe'},{...field,key:'kind',value:'',enumValues:['member','admin']},{...field,key:'count',type:'integer',value:'',default:'2'}]);
  const example=JSON.parse(generated.requestExample);
  assert.equal(example.__proto__,'safe');assert.equal(example.kind,'member');assert.equal(example.count,2);
  assert.deepEqual(JSON.parse(generated.requestSchema).properties.kind.enum,['member','admin']);
});

async function setup(t,defaults={},paused=false){
 let form,sync,renderer;
 function Editor({pause}){
  form=useForm({defaultValues:{bodyFormat:'application/json',bodyFields:[field],requestSchema:'',requestExample:'',...defaults}});
  sync=useBodyFieldJson(form,pause);return null;
 }
 await act(async()=>{renderer=create(React.createElement(Editor,{pause:paused}));});
 t.after(async()=>{await act(async()=>renderer.unmount());});
 return {get form(){return form;},get sync(){return sync;},resume:()=>act(async()=>renderer.update(React.createElement(Editor,{pause:false})))};
}
test('generated documents follow edits, but custom JSON stays untouched until regeneration',async t=>{
 const state=await setup(t);
 assert.equal(JSON.parse(state.form.getValues('requestExample')).email,field.value);
 await act(async()=>state.form.setValue('bodyFields.0.value','new@example.com'));
 assert.equal(JSON.parse(state.form.getValues('requestExample')).email,'new@example.com');
 await act(async()=>{state.sync.trackEdit('requestExample','{"custom":true}');state.form.setValue('requestExample','{"custom":true}');});
 await act(async()=>state.form.setValue('bodyFields.0.key','address'));
 assert.equal(state.form.getValues('requestExample'),'{"custom":true}');
 assert.ok(JSON.parse(state.form.getValues('requestSchema')).properties.address);
 await act(async()=>state.sync.regenerate());
 assert.equal(JSON.parse(state.form.getValues('requestExample')).address,'new@example.com');
});
test('saved custom JSON and draft restoration remain intact, including while recovery is pending',async t=>{
 const state=await setup(t,{requestSchema:'{"type":"object","additionalProperties":false}',requestExample:'{"manual":true}'},true);
 assert.equal(state.form.getValues('requestExample'),'{"manual":true}');
 await state.resume();
 await act(async()=>state.form.setValue('bodyFields.0.value','new@example.com'));
 assert.equal(state.form.getValues('requestExample'),'{"manual":true}');
 await act(async()=>state.form.reset({...state.form.getValues(),requestExample:'{"restored":true}'}));
 await act(async()=>state.form.setValue('bodyFields.0.value','other@example.com'));
 assert.equal(state.form.getValues('requestExample'),'{"restored":true}');
});
test('deleting all linked body fields clears generated JSON; plain text is excluded',async t=>{
 const state=await setup(t);
 await act(async()=>state.form.setValue('bodyFields',[]));
 assert.equal(state.form.getValues('requestSchema'),'');assert.equal(state.form.getValues('requestExample'),'');
 const plain=await setup(t,{bodyFormat:'text/plain'});
 assert.equal(plain.form.getValues('requestSchema'),'');
});
test('empty documents wait for draft recovery, formatting stays linked, and manual clearing is respected',async t=>{
 const state=await setup(t,{},true);
 assert.equal(state.form.getValues('requestExample'),'');
 await state.resume();
 await act(async()=>{
  const formatted=JSON.stringify(JSON.parse(state.form.getValues('requestExample')));
  state.sync.trackEdit('requestExample',formatted);state.form.setValue('requestExample',formatted);
 });
 await act(async()=>state.form.setValue('bodyFields.0.value','linked@example.com'));
 assert.equal(JSON.parse(state.form.getValues('requestExample')).email,'linked@example.com');
 await act(async()=>{state.sync.trackEdit('requestExample','');state.form.setValue('requestExample','');});
 await act(async()=>state.form.setValue('bodyFields.0.value','other@example.com'));
 assert.equal(state.form.getValues('requestExample'),'');
});
