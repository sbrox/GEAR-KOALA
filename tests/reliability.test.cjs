const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const source=readFileSync(new URL('../app.js',`file://${__filename}`),'utf8').split('$("#go").onclick=')[0];
const captured=JSON.parse(readFileSync(new URL('./catalog-regressions.json',`file://${__filename}`)));
const NOW=Date.parse('2026-09-26T15:00:00Z');
class FixedDate extends Date {static now(){return NOW;}}
function setup(catalog){
 const fields={};
 function element(){return {value:'',innerHTML:'',dataset:{},options:[],addEventListener(){},replaceChildren(...options){this.options=options;this.value='';},add(option){this.options.push(option);},classList:{toggle(){}}};}
 for(const id of ['title','price','condition','out','browseCategory','browseBrand','browseModel','suggestions','lotQty','unitWeight','totalWeight','lotFields','go','listingUrl','compStatus'])fields['#'+id]=element();
 fields['#price'].value='350';fields['#condition'].value='.93';
 const ctx=vm.createContext({console,Intl,URL,URLSearchParams,Date:FixedDate,setTimeout,Option:function(text,value){return {text,value};},location:{search:'',hash:''},document:{querySelector:s=>fields[s]||null,querySelectorAll:()=>[]}});
 vm.runInContext(source,ctx);
 ctx.rows=catalog||[{id:'r',brand:'Rogue',model:'Echo Bike',category:'air bike',current_new_price:945},{id:'d',brand:'Concept2',model:'Model D PM5',category:'rower'},{id:'row',brand:'Concept2',model:'RowErg',category:'rower'},{id:'p',brand:'Peloton',model:'Bike',category:'indoor cycle'},{id:'plus',brand:'Peloton',model:'Bike+',category:'indoor cycle'},{id:'n',brand:'NordicTrack',model:'Commercial 1750',category:'treadmill'}];
 vm.runInContext('C=rows;catalogAvailable=true;const catalogReady=Promise.resolve();',ctx);
 ctx.observationsFor=async()=>[];
 return {ctx,fields};
}
function sale(i,extra={}){return {id:String(i),equipment_id:'r',title:'Rogue Echo Bike',source:i%2?'HiBid':'GovDeals',listing_url:i%2?'https://hibid.com/lot/'+i:'https://www.govdeals.com/en/asset/'+i+'/22',normalized_price:500+i*5,currency:'USD',condition:'used good fully functional',listing_status:'sold',verification_status:'verified',is_bundle:false,transaction_type:'auction_sale',match_type:'exact_model',sold_at:i%2?'2026-08-10':'2026-08-12',...extra};}
function realSetup(){const result=setup(captured.equipment);result.ctx.observationsFor=async ids=>captured.observations.filter(c=>ids.includes(c.equipment_id));return result;}
async function run(ctx,fields,title,price='350'){fields['#title'].value=title;fields['#price'].value=price;await ctx.evaluate();return fields['#out'].innerHTML;}
const noRecommendation=html=>assert.doesNotMatch(html,/<strong class="verdict">(?:POUNCE|WORTH GRABBING)<|<small>Grab Score<\/small>/);

test('ambiguous identities, parts and damaged equipment do not resolve to whole machines',async()=>{
 const {ctx,fields}=setup();
 for(const title of ['treadmill','rogue rack','WaterRower Classic walnut rowing machine','Concept2 replacement chain for rowing machine PM5','Concept2 Model D PM5 broken monitor not working']){
  assert.equal(ctx.exactFind(title),null,title);const html=await run(ctx,fields,title);assert.match(html,/Not scored/);noRecommendation(html);
 }
 assert.equal(ctx.exactFind('Peloton Bike').id,'p');assert.equal(ctx.exactFind('Peloton Bike+').id,'plus');
});
test('strict positive USD input',async()=>{const {ctx,fields}=setup();for(const value of ['-100','1e3','abc100','1,2','',0,'Infinity','12.345']){assert.equal(ctx.parsePrice(value),0);assert.match(await run(ctx,fields,'Rogue Echo Bike',String(value)),/CHECK THE PRICE/);}assert.equal(ctx.parsePrice('$1,250.50'),1250.5);});
test('retail anchors and service failures cannot produce purchase recommendations',async()=>{const {ctx,fields}=setup();let html=await run(ctx,fields,'Rogue Echo Bike');assert.match(html,/Reference estimate/);noRecommendation(html);ctx.observationsFor=async()=>{throw Error('offline')};html=await run(ctx,fields,'Rogue Echo Bike');assert.match(html,/could not be loaded/);noRecommendation(html);});
test('known identity and verified sales produce a value even without exact condition/date labels',()=>{
 const {ctx}=setup(),x=ctx.rows[0],rows=[1,2,3].map(i=>sale(i,{match_type:'model',condition:'Used/See Description',transaction_type:'auction_sold',sold_at:null,observed_at:'2026-08-12'}));
 const ev=ctx.reliableEvidence(rows,x,null,'good',NOW);assert.equal(ev.enough,true);assert.equal(ev.center,510);assert.equal(ev.canRecommend,false);
});
test('asking prices, damaged items, unsupported currency and wrong equipment never become comps',()=>{
 const {ctx}=setup(),x=ctx.rows[0],rows=[1,2,3,4,5].map(i=>sale(i));
 for(const extra of [{condition:'needs repair'},{condition:'broken monitor'},{listing_url:'https://maxsold.com/auction/123/bidgallery'},{currency:'EUR'},{verification_status:'asking_verified'},{transaction_type:'private_party_asking'},{title:'Rogue rack'},{title:'Rogue Echo Bike replacement pedal'},{sold_at:'2027-01-01'}])assert.equal(ctx.reliableEvidence(rows.map(c=>({...c,...extra})),x,null,'good',NOW).comps.length,0,JSON.stringify(extra));
 assert.equal(ctx.conditionClass('used like new'),'excellent');
});
test('deduplication, conflicting prices, source concentration and unknown condition constrain recommendations',()=>{
 const {ctx}=setup(),x=ctx.rows[0];const rows=[1,2].flatMap(i=>[sale(i),sale(i,{id:'duplicate'+i})]);assert.equal(ctx.reliableEvidence(rows,x,null,'good',NOW).comps.length,2);
 assert.equal(ctx.reliableEvidence([sale(1),sale(1,{normalized_price:900})],x,null,'good',NOW).comps.length,0);
 assert.equal(ctx.reliableEvidence([1,3,5,7].map(i=>sale(i)),x,null,'good',NOW).canRecommend,false);
 assert.equal(ctx.reliableEvidence([1,2,3,4].map(i=>sale(i,{condition:'used/as-is'})),x,null,'good',NOW).canRecommend,false);
});
test('adequate compatible independent known-condition sales can still produce a purchase verdict',async()=>{
 const {ctx,fields}=setup();ctx.observationsFor=async()=>[1,2,3,4,5,6].map(i=>sale(i));const html=await run(ctx,fields,'Rogue Echo Bike','100');assert.match(html,/<strong class="verdict">POUNCE<\/strong>/);assert.match(html,/<small>Grab Score<\/small>/);
});
test('edited inputs invalidate in-flight valuations',async()=>{const {ctx,fields}=setup();let finish;ctx.observationsFor=()=>new Promise(r=>finish=r);fields['#title'].value='Rogue Echo Bike';const pending=ctx.evaluate();await Promise.resolve();ctx.clearResult();finish([]);await pending;assert.equal(fields['#out'].innerHTML,'');});

test('REAL POSITIVE: Rogue Echo Bike returns two verified sales and $400–$600 value reference',async()=>{
 const {ctx,fields}=realSetup();const html=await run(ctx,fields,'Rogue Echo Bike');assert.match(html,/2 eligible sold observations/);assert.match(html,/\$400–\$600/);assert.match(html,/MEDIAN SOLD PRICE<\/span><b>\$500/);assert.match(html,/buyer-attested/);assert.doesNotMatch(html,/I can’t value/);noRecommendation(html);
});
test('REAL POSITIVE: Model D PM5 and RowErg PM5 retrieve compatible identities and return useful values',async()=>{
 const {ctx,fields}=realSetup();for(const title of ['Concept2 Model D PM5','Concept2 RowErg PM5','Concept2 RowErg','Concept2 commercial rowing machine PM5 used']){
  const html=await run(ctx,fields,title);assert.match(html,/5 eligible sold observations/,title);assert.match(html,/\$320–\$461/,title);assert.match(html,/MEDIAN SOLD PRICE<\/span><b>\$424/,title);assert.doesNotMatch(html,/I can’t value/,title);noRecommendation(html);
 }
});
test('REAL POSITIVE: missing Concept2 monitor offers separate actionable ranges instead of mixing generations',async()=>{
 const {ctx,fields}=realSetup();const html=await run(ctx,fields,'Concept2 Model D');assert.match(html,/Confirm the monitor/);assert.match(html,/data-model="Concept2 Model D PM5"/);assert.match(html,/data-model="Concept2 Model D PM3"/);assert.match(html,/\$320–\$461/);noRecommendation(html);
});
test('Concept2 comparisons reject incompatible monitor, Model E, Dynamic, SkiErg and accessories',()=>{
 const {ctx}=realSetup(),m=ctx.concept2Match('Concept2 Model D PM5');
 for(const title of ['Concept2 Model D PM3','Concept2 Model E PM5','Concept2 Dynamic PM5','Concept2 SkiErg PM5','Concept2 replacement chain PM5']){
  const row=sale(1,{equipment_id:m.x.id,title});assert.equal(ctx.reliableEvidence([row],m.x,m,'good',NOW).comps.length,0,title);
 }
});
test('REAL POSITIVE: Browse Rogue + Power Rack selects fresh catalog identity and evaluates it',async()=>{
 const {ctx,fields}=realSetup();vm.runInContext(readFileSync(new URL('../checker-ui.js',`file://${__filename}`),'utf8'),ctx);await Promise.resolve();
 await run(ctx,fields,'Concept2 Model D PM5');ctx.setMode('browse');fields['#browseBrand'].value='Rogue';fields['#browseCategory'].value='power rack';fields['#browseCategory'].onchange();
 const rack=captured.equipment.find(x=>x.brand==='Rogue'&&x.category==='power rack');assert.equal(fields['#browseModel'].value,rack.id);assert.equal(fields['#title'].value,'Rogue '+rack.model);
 await ctx.evaluate();const html=fields['#out'].innerHTML;assert.match(html,/RML-3WC/);assert.match(html,/\$378–\$462/);assert.match(html,/0 eligible sold observations/);assert.doesNotMatch(html,/Concept2/);noRecommendation(html);
 fields['#browseCategory'].value='air bike';fields['#browseCategory'].onchange();await ctx.evaluate();assert.match(fields['#out'].innerHTML,/Echo Bike/);assert.match(fields['#out'].innerHTML,/2 eligible sold observations/);assert.doesNotMatch(fields['#out'].innerHTML,/RML-3WC/);
});
test('Browse with multiple matching models does not silently select or reuse a previous identity',async()=>{
 const {ctx,fields}=realSetup();vm.runInContext(readFileSync(new URL('../checker-ui.js',`file://${__filename}`),'utf8'),ctx);await Promise.resolve();ctx.setMode('browse');fields['#browseBrand'].value='Concept2';fields['#browseCategory'].value='rower';ctx.updateModels();assert.equal(fields['#title'].value,'');assert.equal(fields['#browseModel'].value,'');await ctx.evaluate();assert.match(fields['#out'].innerHTML,/IDENTIFICATION NEEDED/);
});
