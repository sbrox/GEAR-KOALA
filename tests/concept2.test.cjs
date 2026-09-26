const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const code=readFileSync(new URL('../app.js',`file://${__filename}`),'utf8').split('$("#go").onclick=')[0];
const context=vm.createContext({console,Intl,URL,document:{querySelector:()=>null}});
vm.runInContext(code,context);
const rows=[
 {id:'d5',brand:'Concept2',model:'Model D PM5',category:'Rower'},
 {id:'d3',brand:'Concept2',model:'Model D PM3',category:'rower'},
 {id:'r',brand:'Concept2',model:'RowErg',category:'rower'},
 {id:'pseudo',brand:'Concept2',model:'commercial rowing machine PM5 used',category:'rower',valuation_mode:'family'},
 {id:'ski',brand:'Concept2',model:'SkiErg',category:'ski erg',equipment_family:'Concept2 Ergs'},
 {id:'bike',brand:'Concept2',model:'BikeErg',category:'bike erg',equipment_family:'Concept2 Ergs'},
 {id:'e',brand:'Concept2',model:'Model E PM5',category:'rower'},
 {id:'dynamic',brand:'Concept2',model:'Dynamic PM5',category:'rower'}
];
context.rows=rows;vm.runInContext('C=rows',context);
const match=t=>context.concept2Match(t);
const sale=(id,equipment_id,title,extra={})=>({id,equipment_id,title,observed_price:400,listing_status:'sold',verification_status:'verified',is_bundle:false,match_type:'exact_model',condition:'used',currency:'USD',...extra});
const d=[1,2,3].map(i=>sale('d'+i,'d5','Concept2 Model D PM5'));
const r=[1,2,3].map(i=>sale('r'+i,'r','Concept2 RowErg PM5'));
test('free-form listing resolves to canonical rower family, not pseudo-model',()=>{
 const m=match('Concept2 commercial rowing machine PM5 used');assert.equal(m.x.id,'r');assert.match(m.label,/model unconfirmed/);
 const out=context.concept2Comps(m,[...d,...r]);assert.equal(out.comps.length,6);assert.match(out.level,/family/);
});
test('exact compatible model wins before broader evidence',()=>{
 const out=context.concept2Comps(match('Concept 2 Model D PM5'),[...d,...r]);assert.equal(out.comps.length,3);assert.match(out.level,/exact/);
});
test('sparse exact evidence falls back to compatible D / RowErg generation',()=>{
 const out=context.concept2Comps(match('Concept2 Model D PM5'),[d[0],...r]);assert.equal(out.comps.length,4);assert.match(out.level,/compatible Model D/);
});
test('compatible pool falls back to same-monitor rower family',()=>{
 const out=context.concept2Comps(match('Concept2 Model D PM5'),[d[0],r[0],sale('f','pseudo','Concept2 rowing machine PM5',{match_type:'model_family'})]);assert.equal(out.comps.length,3);assert.match(out.level,/family/);
});
test('sale title overrides broad catalog: PM3/PM4/unknown/E/Dynamic/SkiErg excluded',()=>{
 const bad=['Concept2 Model D PM3','Concept2 Model D PM4','Concept2 Model D','Concept2 Model E PM5','Concept2 Dynamic PM5','Concept2 SkiErg PM5','Concept2 BikeErg PM5','Concept2 RowErg tall legs PM5','Concept2 Model D PM5 monitor only'];
 const out=context.concept2Comps(match('Concept2 rower PM5'),bad.map((t,i)=>sale('bad'+i,'r',t)));assert.equal(out.comps.length,0);
 for(const t of ['Concept2 SkiErg PM5','Concept2 BikeErg PM5','Concept2 Model C PM5','Concept2 Model E PM5','Concept2 Dynamic rower PM5'])assert.equal(match(t),null);
});
test('reject asking/unverified/bundle/new/invalid prices and currencies',()=>{
 const invalid=[{listing_status:'active'},{verification_status:'asking_verified'},{is_bundle:true},{condition:'new'},{observed_price:0},{normalized_price:-5},{observed_price:'NaN'},{currency:'EUR'},{match_type:null}];
 assert.equal(context.concept2Comps(match('Concept2 Model D PM5'),invalid.map((x,i)=>sale('bad'+i,'d5','Concept2 Model D PM5',x))).comps.length,0);
});
test('deduplicates identical listings across records but keeps distinct auction lots',()=>{
 const a=sale('a','r','Concept2 Model D PM5',{listing_url:'https://govdeals.com/en/asset/44208/7484'});
 const b={...a,id:'b',equipment_id:'d5',listing_url:'https://prod-seo.govdeals.com/en/asset/44208/7484'};
 const out=context.concept2Comps(match('Concept2 rower PM5'),[a,b]);assert.equal(out.comps.length,1);
 const c=sale('c','d5','Concept2 Model D PM5',{listing_url:'https://hibid.com/catalog/123',source_listing_id:'123-lot-1'});
 assert.equal(context.concept2Comps(match('Concept2 rower PM5'),[c,{...c,id:'d',source_listing_id:'123-lot-2'}]).comps.length,2);
});
test('unknown monitor does not silently mix PM3 and PM5',()=>{
 assert.equal(context.concept2Comps(match('Concept2 Model D'),[...d,...r]).comps.length,0);
});
test('excluded equipment cannot fall through to rower token matching',()=>{
 assert.equal(context.exactFind('Concept2 SkiErg PM5').id,'ski');
 assert.equal(context.exactFind('Concept2 BikeErg PM5').id,'bike');
 assert.equal(context.exactFind('Concept2 Model C PM5'),null);
 assert.equal(context.exactFind('Concept2 PM5 monitor only'),null);
});
