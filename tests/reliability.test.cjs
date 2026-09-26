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
 for(const id of ['title','price','condition','out','browseCategory','browseBrand','browseModel','suggestions','lotQty','unitWeight','totalWeight','lotFields','go','listingUrl','compStatus','dealForm'])fields['#'+id]=element();
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

test('REAL POSITIVE: Rogue Echo Bike at $400 returns a cautious direction from two credible sales',async()=>{
 const {ctx,fields}=realSetup();const html=await run(ctx,fields,'Rogue Echo Bike','400');assert.match(html,/POTENTIALLY GOOD PRICE/);assert.match(html,/LIMITED MARKET SIGNAL/);assert.match(html,/20% below/);assert.match(html,/2 eligible sold observations/);assert.match(html,/\$400–\$600/);assert.match(html,/MEDIAN SOLD PRICE<\/span><b>\$500/);assert.match(html,/BUYER-ATTESTED TRANSACTION/);assert.match(html,/PUBLIC AUCTION RESULT/);assert.match(html,/Not independently source-verifiable/);assert.doesNotMatch(html,/I can’t value/);noRecommendation(html);
});
test('REAL POSITIVE: Model D PM5 and RowErg PM5 retrieve compatible identities and return useful values',async()=>{
 const {ctx,fields}=realSetup();for(const title of ['Concept2 Model D PM5','Concept2 RowErg PM5','Concept2 RowErg','Concept2 commercial rowing machine PM5 used']){
  const html=await run(ctx,fields,title,'200');assert.match(html,/5 eligible sold observations/,title);assert.match(html,/\$320–\$461/,title);assert.match(html,/MEDIAN SOLD PRICE<\/span><b>\$424/,title);assert.match(html,/GOOD MARKET SIGNAL/,title);assert.match(html,/<strong class="verdict">POUNCE<\/strong>/,title);assert.match(html,/89 <small>Grab Score<\/small>/,title);assert.doesNotMatch(html,/I can’t value/,title);
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

test('small credible pools permit direction without enabling POUNCE; weak evidence still abstains',()=>{
 const {ctx}=setup(),x=ctx.rows[0],rows=[sale(1),sale(2)];
 const ev=ctx.reliableEvidence(rows,x,null,'good',NOW);assert.equal(ev.directional,true);assert.equal(ev.canRecommend,false);
 for(const data of [[sale(1)],rows.map(c=>({...c,condition:'unknown'})),rows.map(c=>({...c,condition:'fair'})),rows.map(c=>({...c,sold_at:'2020-01-01'})),rows.map(c=>({...c,verification_status:'asking_verified'})),[sale(1),sale(3)]])assert.equal(ctx.reliableEvidence(data,x,null,'excellent',NOW).directional,false);
 const wide=ctx.reliableEvidence([sale(1),sale(2,{normalized_price:5000})],x,null,'good',NOW);assert.equal(wide.directional,false);
 assert.equal(ctx.directionalAssessment(400,{low:400,high:600,center:500}).verdict,'POTENTIALLY GOOD PRICE');
 assert.equal(ctx.directionalAssessment(500,{low:400,high:600,center:500}).verdict,'WITHIN OBSERVED RANGE');
 assert.equal(ctx.directionalAssessment(700,{low:400,high:600,center:500}).verdict,'LOOKS HIGH VS SALES');
});
test('Grab Score is monotonic and numerically agrees with the verdict boundaries',()=>{
 const {ctx}=setup(),x=ctx.rows[0],ev=ctx.reliableEvidence([1,2,3,4,5].map(i=>sale(i)),x,null,'good',NOW);
 for(const [ratio,verdict,min,max] of [
  [0,'POUNCE',99,99],[.47,'POUNCE',89,90],[.67,'POUNCE',85,85],
  [.82,'WORTH GRABBING',70,70],[1,'FAIR',57,59],[1.02,'FAIR',50,50],
  [1.25,'PASS / NEGOTIATE',31,33]
 ]){
  const d=ctx.valuationDecision(x,ev.center*ratio,ev,'good');
  assert.equal(d.verdict,verdict,`ratio ${ratio}`);assert.ok(d.score>=min&&d.score<=max,`ratio ${ratio}: ${d.score}`);
 }
});
test('asking evidence stays separate from verified sales and preserves audited Echo context',()=>{
 const {ctx}=realSetup(),x=ctx.rows.find(x=>x.model==='Echo Bike');
 const ev=ctx.reliableEvidence(captured.observations,x,null,'good',NOW);
 assert.deepEqual(Array.from(ev.comps,c=>c.id).sort(),['830288b8-0d47-4f87-9b02-82e2e89c489e','c858883f-ac74-43d7-9fca-23b2c9199f19']);
 assert.equal(ev.center,500);assert.equal(ev.asking.count,6);assert.equal(ev.asking.low,500);assert.equal(ev.asking.high,750);assert.equal(ev.asking.median,650);
 assert.equal(ev.asking.active,2);assert.equal(ev.asking.ended,4);
 const duplicate={...ev.asking.items[0],id:'duplicate-asking'};
 const accessory={...ev.asking.items[0],id:'accessory-asking',source_listing_id:'accessory',title:'Rogue Echo Bike replacement pedal'};
 const again=ctx.reliableEvidence([...captured.observations,duplicate,accessory],x,null,'good',NOW);
 assert.equal(again.asking.count,6);assert.deepEqual(Array.from(again.comps,c=>c.id).sort(),Array.from(ev.comps,c=>c.id).sort());
});
test('Echo generation requests cannot inherit unconfirmed-generation comps or V3 retail value',async()=>{
 const {ctx,fields}=realSetup();for(const title of ['Rogue Echo Bike V2','Rogue Echo Bike V3']){const html=await run(ctx,fields,title,'400');assert.match(html,/No sold evidence confirms the requested generation/);assert.doesNotMatch(html,/POTENTIALLY GOOD PRICE|Reference estimate/);}
});
test('buyer attestation requires matching transaction price and cannot stand in for two independent sales',()=>{
 const {ctx}=realSetup(),x=ctx.rows.find(x=>x.model==='Echo Bike'),row=captured.observations.find(c=>c.transaction_type==='private_party_sale');
 assert.equal(ctx.usableSale({...row,raw_payload:{...row.raw_payload,actual_transaction_price:1}}),false);
 const ev=ctx.reliableEvidence([row,{...row,id:'another'}],x,null,'good',NOW);assert.equal(ev.directional,false);assert.equal(ev.canRecommend,false);
});

test('FULL LIVE AUDIT: all 41 linked and unlinked Echo observations yield only two completed-sale comps',()=>{
 const {ctx}=realSetup(),x=ctx.rows.find(x=>x.model==='Echo Bike');
 const all=JSON.parse(readFileSync(new URL('./echo-observations.json',`file://${__filename}`)));
 assert.equal(all.length,41);assert.equal(all.filter(c=>c.listing_status==='sold').length,7);
 const ev=ctx.reliableEvidence(all,x,null,'good',NOW);
 assert.deepEqual(Array.from(ev.comps,c=>c.id).sort(),['830288b8-0d47-4f87-9b02-82e2e89c489e','c858883f-ac74-43d7-9fca-23b2c9199f19']);
 assert.equal(ev.directional,true);assert.equal(ev.canRecommend,false);assert.equal(ev.center,500);
});
