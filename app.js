const U="https://dyvzrboshanctbjiukvh.supabase.co",K="sb_publishable_ZKuyrkd9Rv7L-4HUXv_v-g_Ka5l9hSD";let C=[];const $=s=>document.querySelector(s),num=v=>parsePrice(v),money=n=>n?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n):"—";
async function api(path){let r=await fetch(U+"/rest/v1/"+path,{headers:{apikey:K,Authorization:"Bearer "+K}});if(!r.ok)throw Error(r.status);return r.json()}
let catalogAvailable=false,evaluationVersion=0,selectedEquipmentId=null;
async function load(){try{C=await api("equipment?select=*");catalogAvailable=true;$("#compStatus").textContent="Catalog ready · sold evidence is checked per item";}catch(e){console.warn("GearKoala: catalog unavailable");$("#compStatus").textContent="Catalog unavailable. Please try again later.";}}
function parsePrice(value){const s=String(value??"").trim().replace(/^\$\s*/,"");if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s))return 0;const n=Number(s.replace(/,/g,""));return Number.isFinite(n)&&n>0&&n<=10000000?n:0;}
function normalized(s){return String(s||"").toLowerCase().replace(/concept\s*[- ]?2/g,"concept2").replace(/[^a-z0-9+]+/g," ").trim();}
function containsPhrase(text,phrase){return (" "+normalized(text)+" ").includes(" "+normalized(phrase)+" ");}
function unsafeItem(t){return /\b(replacement|spare|parts?|repair|broken|damaged|untested|bundle|lot of|versus|vs|replica|knockoff|compatible|fits)\b|not working|needs work|monitor only|chain only|seat only|handle only/i.test(t);}
function modelFits(t,x){
 if(!containsPhrase(t,x.brand)||!containsPhrase(t,x.model))return false;
 // Bike and Bike+ (and unmentioned generations) must not collapse together.
 if(/\bbike\b/i.test(x.model)&&!/\+|plus/i.test(x.model)&&/bike\s*(?:\+|plus)/i.test(t))return false;
 const categories=[[/\b(treadmill|tredmill)\b/i,/treadmill|walking pad/i],[/\b(rower|rowing|waterrower)\b/i,/rower/i],[/\b(rack)\b/i,/rack|stand/i],[/\b(elliptical)\b/i,/elliptical|motion trainer|arc trainer/i]];
 return !categories.some(([query,category])=>query.test(t)&&!category.test(x.category||""));
}
function exactFind(t){
 if(unsafeItem(t))return null;
 const c2=concept2Match(t);if(c2)return c2.x;
 const matches=C.filter(x=>!x.generic_match&&modelFits(t,x));
 const keys=new Set(matches.map(x=>normalized(x.brand+" "+x.model)));
 return keys.size===1?matches[0]||null:null;
}
function median(a){a=[...a].sort((x,y)=>x-y);let n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2}
function arr(v){return Array.isArray(v)?v:[]}
function esc(s){return String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function airdyneAmbiguous(t){return /air\s*dyne|airdyne/i.test(t)&&!/ad\s*[24567]|pro.?comp|evolution/i.test(t)}
function lotLike(t,x){return /dumbbell|plate|bumper/i.test(t)||x?.valuation_mode==="lot_weight"||x?.valuation_mode==="hybrid"}
function selectEquipment(id){selectedEquipmentId=id||null;const x=C.find(x=>x.id===id);$("#title").value=x?x.brand+" "+x.model:"";clearResult();return x;}
function clearResult(){evaluationVersion++;globalThis.GearKoalaValuation=undefined;let o=$("#out");if(o){delete o.dataset.valuation;o.innerHTML=""}}
// Both entry pages use this one catalog picker. Selecting a suggestion records
// the catalog ID; typing remains deliberately non-authoritative until it can
// resolve to exactly one compatible model during evaluation.
function bindCatalogSuggestions(containerSelector,onSelection){
 const input=$("#title"),list=$(containerSelector);if(!input||!list)return;
 const clear=()=>list.replaceChildren();
 const render=(invalidate=true)=>{
  selectedEquipmentId=null;if(invalidate)clearResult();clear();
  const text=input.value.trim().toLowerCase();if(text.length<3)return;
  for(const x of C.filter(x=>(x.brand+" "+x.model).toLowerCase().includes(text)).slice(0,7)){
   const b=document.createElement("button");b.type="button";b.textContent=x.brand+" "+x.model;
   b.onclick=()=>{selectEquipment(x.id);clear();onSelection?.(x);};list.append(b);
  }
 };
 input.addEventListener("input",render);
 input.addEventListener("keydown",e=>{if(e.key==="Escape")clear();});
 input.addEventListener("blur",()=>setTimeout(()=>{if(!list.contains(document.activeElement))clear();},0));
 // A user can begin typing before the asynchronous catalog arrives. Re-run the
 // same renderer once it is ready instead of requiring a second keystroke.
 // Do not invalidate an evaluation that is already awaiting the catalog: it
 // can resolve a sufficiently specific direct entry without a suggestion.
 catalogReady.then(()=>{if(input.value.trim().length>=3)render(false);});
 return {clear,render};
}
// Model D was renamed RowErg; PM5 is a monitor, not proof of a frame model.
// https://www.concept2.com/blog/the-rowerg-a-new-name-for-the-model-d-and-model-e
function concept2Identity(text) {
 const t=String(text||"").toLowerCase().replace(/concept\s*[- ]?2/g,"concept2");
 if(!/\bconcept2\b/.test(t)) return null;
 const monitor=(t.match(/\bpm\s*([1-5])\b/)||[])[1]||null;
 const model=(t.match(/\bmodel\s*([a-e])\b/)||[])[1]||null;
 const other=/ski\s*erg|bike\s*erg|dynamic|\bmodel\s*[abce]\b|\bd\s*\/\s*e\b|tall\s*(leg|seat)|20\s*(inch|in\b|["″])/.test(t);
 const rower=/row\s*erg|rower|rowing|\bmodel\s*[a-e]\b/.test(t);
 const accessory=unsafeItem(t)||/\b(monitor|seat|chain|handle|parts?|replacement)\s*(only|replacement)\b|\b(monitor only|pm\s*5 only)\b/.test(t);
 return {rower:rower&&!other&&!accessory,excluded:other||accessory,model:model==="d"?"model-d":/row\s*erg/.test(t)?"rowerg":null,monitor};
}
function concept2Record(x) {
 // Do not use aliases or the broad "Concept2 Ergs" family to infer compatibility.
 return concept2Identity(`${x.brand} ${x.model} ${x.generation||""} ${x.category||""}`);
}
function concept2Match(raw) {
 const identity=concept2Identity(raw);
 // Current RowErg ships with PM5; a generic Model D/rower does not identify its monitor.
 if(identity?.model==="rowerg"&&!identity.monitor)identity.monitor="5";
 if(!identity?.rower) return null;
 const rows=C.filter(x=>concept2Record(x)?.rower);
 const preferred=identity.model==="model-d" ? `model d${identity.monitor?" pm"+identity.monitor:""}` : "rowerg";
 const x=rows.find(x=>x.model.toLowerCase()===preferred)||rows.find(x=>x.model.toLowerCase()==="rowerg");
 if(!x) return null;
 const label=identity.model ? `Concept2 · ${identity.model==="model-d"?"Model D":"RowErg"}${identity.monitor?" · PM"+identity.monitor:""}` : `Concept2 · rowing-machine family${identity.monitor?" · PM"+identity.monitor:""} (model unconfirmed)`;
 return {identity,x,rows,label};
}
function soldPrice(c) {
 const p=Number(c.normalized_price ?? c.observed_price);
 return Number.isFinite(p)&&p>0?p:0;
}
function verifiedSale(c) {
 return c.listing_status==="sold"&&c.verification_status==="verified"&&c.is_bundle===false&&
  !/\bnew\b|unused|parts only|not working|broken/i.test(`${c.condition||""} ${c.title||""}`.replace(/like[ -]new/gi,"used"))&&
  ["exact_model","model_family","exact","family","model"].includes(c.match_type)&&
  (!c.currency||c.currency==="USD")&&soldPrice(c)>0;
}
function saleKey(c) {
 // A catalog URL can contain multiple lots: never deduplicate on that URL alone.
 const url=String(c.listing_url||"").toLowerCase().split(/[?#]/)[0].replace(/\/$/,"");
 const lot=url.match(/\/lot\/(\d+)/),asset=url.match(/\/asset\/(\d+\/\d+)/);
 if(lot) return `${c.source}:lot:${lot[1]}`;
 if(asset) return `${c.source}:asset:${asset[1]}`;
 if(c.source_listing_id) return `${c.source}:id:${String(c.source_listing_id).replace(/-lot-?/i,"-")}`;
 return c.id;
}
function concept2Comps(match, observations) {
 const records=new Map(match.rows.map(x=>[x.id,x]));
 const tiers=[[],[],[]],seen=new Set(),wanted=match.identity;
 for(const c of observations) {
  if(!verifiedSale(c)) continue;
  const record=records.get(c.equipment_id);
  if(!record) continue;
  const fromTitle=concept2Identity(`Concept2 ${c.title||""}`),fromRecord=concept2Record(record);
  if(fromTitle?.excluded) continue;
  // Specific sale titles override catalog metadata (some RowErg rows contain PM3 sales).
  const titleHasFrame=/model\s*[a-e]|row\s*erg/i.test(c.title||"");
  const model=titleHasFrame ? fromTitle?.model : fromRecord.model;
  const monitor=(String(c.title||"").match(/\bPM\s*([1-5])\b/i)||[])[1]||
   (record.model.toLowerCase()==="rowerg" ? null : fromRecord.monitor);
  if(wanted.monitor ? monitor!==wanted.monitor : monitor!==null) continue;
  const level=wanted.model&&model===wanted.model&&["exact_model","exact"].includes(c.match_type)?0:
   wanted.model&&model&&["model-d","rowerg"].includes(model)&&wanted.monitor?1:2;
  tiers[level].push(c);
 }
 const selected=[];
 for(let i=0;i<tiers.length;i++) {
  for(const c of tiers[i]) {const key=saleKey(c);if(!key||!seen.has(key)){if(key)seen.add(key);selected.push(c);}}
  if(selected.length>=3) return {comps:selected,level:["exact compatible model","compatible Model D / RowErg generation","Concept2 rowing-machine family"][i]};
 }
 return {comps:selected,level:"Concept2 rowing-machine family"};
}
async function concept2Evidence(match) {
 const ids=match.rows.map(x=>x.id).join(","),all=[];
 // Filter eligibility on the server before paging so asking listings cannot hide sold evidence.
 const query=`market_observations?equipment_id=in.(${ids})&listing_status=eq.sold&verification_status=eq.verified&select=id,equipment_id,title,observed_price,normalized_price,listing_status,observed_at,sold_at,condition,source,source_listing_id,listing_url,match_type,is_bundle,verification_status,currency&order=observed_at.desc,id.asc`;
 for(let offset=0;;) {
  const page=await api(`${query}&limit=500&offset=${offset}`);all.push(...page);
  if(!page.length) break;
  offset+=page.length;
 }
 return concept2Comps(match,all);
}

function conditionClass(text){
 const t=String(text||"").toLowerCase();
 if(!t||/unknown|not tested|untested|as.is|needs|broken|damage|not working|does not|sticks|parts|unusable/i.test(t))return null;
 if(/like[ -]new|excellent|barely used|gently used/.test(t))return "excellent";
 if(/\bnew\b|unused|open box/.test(t))return null;
 if(/fair|heavy wear/.test(t))return "fair";
 if(/good|normal wear|tested.*working|fully functional/.test(t))return "good";
 return null;
}
// Sale provenance can be an individual URL, a catalog plus explicit lot ID,
// or a verified buyer attestation. A URL whitelist is not a verification status.
function saleIdentity(c){
 let u;try{u=new URL(c.listing_url);if(u.protocol!=="https:"||u.username||u.password)return null;}catch{}
 const source=String(c.source||"Unknown source"),host=u?.hostname.replace(/^www\./,"").replace(/^prod-seo\./,"");
 if(u){
  const lot=u.pathname.match(/\/lot\/(\d+)/),asset=u.pathname.match(/\/asset\/(\d+\/\d+)/);
  const catalog=/catalog|bidgallery/i.test(u.pathname);
  if(catalog&&!c.source_listing_id)return null;
  const key=asset?host+":asset:"+asset[1]:lot?host+":lot:"+lot[1]:catalog?host+":id:"+String(c.source_listing_id).replace(/-lot-?/i,"-"):u.origin+u.pathname.replace(/\/$/,"");
  return {key,source,url:u.href,catalog,attested:false};
 }
 const raw=c.raw_payload;
 if(c.transaction_type==="private_party_sale"&&raw?.evidence_type==="buyer_attestation_plus_marketplace_sold_screenshot"&&Number(raw.actual_transaction_price)===soldPrice(c))return {key:"attestation:"+c.id,source,url:null,attested:true};
 return null;
}
function saleDate(c){return Date.parse(c.sold_at||c.observed_at);}
function saleCondition(c){return conditionClass(c.condition);}
function usableSale(c){
 return verifiedSale(c)&&c.currency==="USD"&&["auction_sale","auction_sold","auction","completed_sale","private_party_sale"].includes(c.transaction_type)&&
  !unsafeItem(c.title||"")&&!/untested|not tested|inoperative|broken|damaged|not working|does not work|needs (work|repair)|parts only/i.test(c.condition||"")&&!!saleIdentity(c);
}
function uniqueSales(rows){
 const byKey=new Map(),conflicts=new Set();
 // Prefer an individual lot over a catalog copy of the same sale.
 const ordered=[...rows].sort((a,b)=>Number(saleIdentity(a).catalog)-Number(saleIdentity(b).catalog));
 for(const c of ordered){
  const id=saleIdentity(c),prev=byKey.get(id.key);
  if(prev&&soldPrice(prev)!==soldPrice(c)){conflicts.add(id.key);continue;}
  if(prev){if(!prev.sold_at&&c.sold_at)byKey.set(id.key,{...prev,sold_at:c.sold_at});continue;}
  const duplicate=[...byKey.values()].some(p=>{
   const other=saleIdentity(p),sameDay=Math.abs(saleDate(p)-saleDate(c))<=36*3600000;
   // A catalog copy can have a different ID/date from its individual lot page.
   const title=t=>normalized(t).replace(/\blot \d+\b/g,"").trim();
   return id.source===other.source&&(id.catalog||other.catalog)&&sameDay&&soldPrice(p)===soldPrice(c)&&title(p.title)===title(c.title);
  });
  if(!duplicate)byKey.set(id.key,c);
 }
 return [...byKey.entries()].filter(([key])=>!conflicts.has(key)).map(([,c])=>c);
}
function reliableEvidence(rows,x,match,condition,now=Date.now(),query=""){
 const usable=uniqueSales(rows.filter(c=>usableSale(c)&&(!Number.isFinite(saleDate(c))||saleDate(c)<=now)));
 let candidates,level="same catalog model";
 if(match){const selected=concept2Comps(match,usable);candidates=selected.comps;level=selected.level;}
 else candidates=usable.filter(c=>modelFits(c.title,x));
 // A catalog record can represent a product line, not proof of a generation.
 const requestedGeneration=(query.match(/\bv(?:ersion)?\s*(\d+(?:\.\d+)?)\b/i)||[])[1];
 if(requestedGeneration)candidates=candidates.filter(c=>Number((c.title.match(/\bv(?:ersion)?\s*(\d+(?:\.\d+)?)\b/i)||[])[1])===Number(requestedGeneration));
 const generationUnconfirmed=!match&&/^v\d/i.test(x.generation||"")&&candidates.some(c=>! /\bv(?:ersion)?\s*\d/i.test(c.title));
 if(generationUnconfirmed)level="same named product · generation unconfirmed";
 // Recent evidence is preferred when sufficient, but missing a sale date or a
 // condition adjective does not turn verified sale evidence into no evidence.
 const recent=candidates.filter(c=>Number.isFinite(saleDate(c))&&now-saleDate(c)<=365*86400000);
 const comps=recent.length>=3?recent:candidates;
 const prices=comps.map(soldPrice).sort((a,b)=>a-b),center=prices.length?median(prices):0;
 const low=prices[Math.floor((prices.length-1)*.25)],high=prices[Math.ceil((prices.length-1)*.75)];
 const sources=new Set(comps.map(c=>saleIdentity(c).source));
 const dated=comps.every(c=>c.sold_at&&now-Date.parse(c.sold_at)<=365*86400000);
 const conditionKnown=comps.every(c=>saleCondition(c)===condition);
 const exactIdentity=!match||(!!match.identity.model&&!!match.identity.monitor);
 // Valuation and a purchase recommendation are separate decisions. Limited,
 // historical or mixed-condition evidence still gives useful labeled context.
 const enough=comps.length>=3&&low>0&&high/low<=2;
 const canRecommend=enough&&sources.size>=2&&dated&&conditionKnown&&exactIdentity&&!generationUnconfirmed&&comps.every(c=>!saleIdentity(c).attested);
 // A small credible sample can support direction without a Grab Score or POUNCE.
 // Preserve identity/provenance gates; only allow a bounded, recent sample with
 // known working conditions no more than one grade from the user's selection.
 const grades={fair:0,good:1,excellent:2};
 const nearCondition=comps.every(c=>saleCondition(c)&&Math.abs(grades[saleCondition(c)]-grades[condition])<=1);
 const recentContext=comps.every(c=>Number.isFinite(saleDate(c))&&now-saleDate(c)<=365*86400000);
 const publicSale=comps.some(c=>!saleIdentity(c).attested&&c.sold_at);
 const directional=comps.length>=2&&sources.size>=2&&prices.at(-1)/prices[0]<=2&&exactIdentity&&nearCondition&&recentContext&&publicSale;
 return {comps,enough,canRecommend,directional,generationUnconfirmed,low,high,center,level,conditionKnown,dated,sources:sources.size};
}
function evidenceList(ev){return `<ul class="sale-evidence">${ev.comps.map(c=>{
 const id=saleIdentity(c),date=c.sold_at?"sold "+c.sold_at.slice(0,10):c.observed_at?"recorded "+c.observed_at.slice(0,10)+" · sale date unknown":"sale date unknown";
 const kind=id.attested?"BUYER-ATTESTED TRANSACTION":/auction/.test(c.transaction_type)?"PUBLIC AUCTION RESULT":"PUBLIC SALE RECORD";
 const detail=id.attested?"Buyer-reported paid price + sold screenshot; no public listing. Not independently source-verifiable.":/auction/.test(c.transaction_type)?"Published final bid; buyer premium, tax and transport may be additional.":"Public listing source recorded with this sale.";
 const text=esc(id.source)+" · "+esc(date)+" · "+money(soldPrice(c));
 return `<li class="${id.attested?"attested-sale":"public-sale"}"><strong class="provenance-label">${kind}</strong>${id.url?`<a href="${esc(id.url)}" target="_blank" rel="noopener noreferrer">${text}</a>`:text}<span class="provenance-detail">${detail}</span><span>${esc(c.condition||"condition not recorded")}</span></li>`;
 }).join("")}</ul>`;}
function directionalAssessment(p,ev){
 const verdict=p<=ev.low?"POTENTIALLY GOOD PRICE":p<=ev.high?"WITHIN OBSERVED RANGE":"LOOKS HIGH VS SALES";
 const difference=Math.round(Math.abs(p/ev.center-1)*100);
 return {verdict,explanation:`${money(p)} is ${difference?difference+"% "+(p<ev.center?"below":"above"):"equal to"} the ${money(ev.center)} sample median${p===ev.low?" and matches the lowest recorded sale":""}. This is a directional comparison, not a reliable discount or savings estimate.`};
}
// This is the sole valuation decision used by both the homepage and Deal
// Checker. Surface scripts may choose where to place the returned markup, but
// never re-filter sales or recompute a price/score.
function valuationDecision(x,p,ev,condition){
 if(!ev.comps.length)return {confidence:"low",verdict:"NO DEAL VERDICT",headline:"Reference estimate",direction:null};
 let headline=ev.enough?"Market estimate":"Limited sales reference",verdict="NO DEAL VERDICT";
 const direction=!ev.canRecommend&&ev.directional?directionalAssessment(p,ev):null;
 if(direction){headline="Low-confidence assessment";verdict=direction.verdict;}
 if(ev.canRecommend){const ratio=p/ev.center,score=Math.round(Math.max(20,Math.min(99,120-ratio*70)));headline=score+' <small>Grab Score</small>';verdict=p<ev.low*.67?"POUNCE":p<ev.low*.82?"WORTH GRABBING":p<=ev.high?"WITHIN OBSERVED RANGE":"ABOVE OBSERVED RANGE";}
 return {confidence:ev.canRecommend?"high":direction?"low":"limited",verdict,headline,direction};
}
function valuationSnapshot(label,x,p,ev,decision){
 return {productId:x.id,label,asking:p,transactionIds:ev.comps.map(c=>c.id),compCount:ev.comps.length,range:[ev.low,ev.high],median:ev.center,confidence:decision.confidence,verdict:decision.verdict};
}
function publishValuation(snapshot){
 globalThis.GearKoalaValuation=Object.freeze(snapshot);
 const out=$("#out");if(out)out.dataset.valuation=JSON.stringify(snapshot);
}
function renderValuation(label,x,p,ev,condition,decision=valuationDecision(x,p,ev,condition)){
 const hasSales=ev.comps.length>0;
 if(!hasSales){
  const retail=Number(x.current_new_price||x.msrp),rates={"air bike":.66,rower:.68,"power rack":.64,"squat stand":.65};
  const rate=rates[String(x.category).toLowerCase()];
  if(!retail||!rate)return abstain(label,"Product identified. No compatible verified sold observations are available yet.",x);
  const factor={excellent:1,good:.93,fair:.82}[condition]||1,center=retail*rate*factor;
  return `<div class="resulttop unscored"><div><span class="result-kicker">${esc(label)}</span><h3>Reference estimate</h3></div><strong class="verdict">NO DEAL VERDICT</strong></div><div class="price-strip"><div><span>ASKING</span><b>${money(p)}</b></div><div><span>RETAIL-BASED REFERENCE · NOT SOLD VALUE</span><b>${money(center*.9)}–${money(center*1.1)}</b></div><div><span>CATALOG NEW PRICE</span><b>${money(retail)}</b></div></div><div class="evidence"><b>0 eligible sold observations · low confidence</b><p>This rough reference uses the catalog new price × ${Math.round(rate*100)}% category factor × ${factor} condition factor. It is not a verified market valuation and cannot justify a purchase recommendation. Confirm the exact configuration and compare actual sales before buying.</p><p>${esc(x.gear_brief||x.short_description||"")}</p></div>`;
 }
 const {headline,verdict,direction}=decision;
 return `<div class="resulttop ${ev.canRecommend?"":"unscored"}"><div><span class="result-kicker">${esc(label)}</span><h3>${headline}</h3></div><strong class="verdict">${verdict}</strong></div><div class="price-strip"><div><span>ASKING</span><b>${money(p)}</b></div><div><span>${ev.enough?"MIDDLE HALF OF OBSERVED SALES":"OBSERVED SALE RANGE"}</span><b>${money(ev.low)}–${money(ev.high)}</b></div><div><span>MEDIAN SOLD PRICE</span><b>${money(ev.center)}</b></div></div><div class="evidence"><b>${ev.comps.length} eligible sold observations · ${esc(ev.level)} · USD${direction?" · LOW CONFIDENCE":""}</b><p>${ev.canRecommend?"Matched condition and recent independent sales support this comparison.":(direction?direction.explanation+" Confirm condition and configuration before acting. ":"Value evidence, not a purchase recommendation. ")+(ev.comps.length<3?"Small sample. ":"")+(ev.conditionKnown?"":"Reported conditions vary or are incomplete; this is not a condition-adjusted valuation. ")+(ev.dated?"":"Some sale dates are unavailable or historical. ")+(matchFamilyLabel(ev)?"Confirm the frame/configuration before applying this range. ":"")}</p><p>Inspect the equipment and account for auction fees, transport and local market differences.</p>${evidenceList(ev)}</div>`;
}
function matchFamilyLabel(ev){return /family/.test(ev.level);}
async function observationsFor(ids){let all=[];for(let offset=0;offset<10000;){const page=await api(`market_observations?equipment_id=in.(${ids.join(",")})&listing_status=eq.sold&verification_status=eq.verified&select=*&order=sold_at.desc,id.asc&limit=500&offset=${offset}`);all.push(...page);if(!page.length)return all;offset+=page.length;}throw Error("Evidence limit reached");}
function abstain(label,reason,x){return `<div class="resulttop unscored"><div><span class="result-kicker">${esc(label)}</span><h3>Not scored</h3></div><strong class="verdict">MORE INFORMATION NEEDED</strong></div><div class="evidence"><b>I can’t value this reliably.</b><p>${esc(reason)}</p>${x?`<p>${esc(x.gear_brief||x.short_description||"")}</p>`:""}${+x?.current_new_price?`<p>Catalog retail reference: ${money(+x.current_new_price)}. This is not a used-value estimate or purchase recommendation.</p>`:""}</div>`;}
async function evaluate(){
 const version=++evaluationVersion;await catalogReady;if(version!==evaluationVersion)return;
 const raw=$("#title").value.trim(),p=parsePrice($("#price").value),out=$("#out");
 if(!raw){out.innerHTML=abstain("IDENTIFICATION NEEDED","Enter the brand and model, or choose a model in Browse.");return;}
 if(!p){out.innerHTML=abstain("CHECK THE PRICE","Enter a positive USD price, such as 350 or 1,250.50. Negative values and shorthand are not accepted.");return;}
 if(!catalogAvailable){out.innerHTML=abstain("DATA UNAVAILABLE","The catalog could not be loaded. Please try again later.");return;}
 if(unsafeItem(raw)){out.innerHTML=abstain("ITEM NEEDS REVIEW","Parts, accessories, bundles, damaged or untested equipment need separate identification and evidence. No complete-machine recommendation is generated.");return;}
 const selected=C.find(x=>x.id===selectedEquipmentId&&raw===x.brand+" "+x.model);
 const match=concept2Match(raw),x=selected||exactFind(raw);
 if(!x){out.innerHTML=abstain("IDENTIFICATION UNCERTAIN","I can’t identify this reliably. Confirm the brand, exact model and equipment type, or select the model in Browse. Similar words are not enough to establish compatibility.");return;}
 const label=match?.label||x.brand+" · "+x.model;
 if(match&&!match.identity.monitor){
  out.innerHTML='<div class="needs-data">Checking monitor-specific sale ranges…</div>';
  let rows;try{rows=await observationsFor(match.rows.map(x=>x.id));}catch{if(version===evaluationVersion)out.innerHTML=abstain(label,"Sold evidence could not be loaded.",x);return;}
  if(version!==evaluationVersion)return;
  const options=["3","4","5"].map(pm=>{const m=concept2Match("Concept2 Model D PM"+pm),ev=reliableEvidence(rows,m.x,m,"good");return {pm,ev};}).filter(o=>o.ev.comps.length);
  out.innerHTML=`<div class="identify"><span class="result-kicker">${esc(label)}</span><h3>Confirm the monitor</h3><p>Model D and RowErg identity is recognized. Different monitor generations have different values. These separate sale references are not a valuation of your unidentified configuration.</p><div class="idgrid">${options.map(({pm,ev})=>`<button type="button" class="idchoice" data-model="Concept2 Model D PM${pm}"><b>Model D / PM${pm}</b><span>${ev.comps.length} eligible sales · ${money(ev.low)}–${money(ev.high)} · median ${money(ev.center)}</span></button>`).join("")}</div><p>Read the PM number on the monitor and select it above, or add it to your search. No purchase verdict has been generated.</p></div>`;
  document.querySelectorAll(".idchoice").forEach(b=>b.onclick=()=>{selectedEquipmentId=null;$("#title").value=b.dataset.model;evaluate();});return;
 }
 if(lotLike(raw,x)){const total=parsePrice($("#totalWeight")?.value);out.innerHTML=abstain(label,"Confirm pair/set configuration and total weight. Comparable lot evidence is not sufficiently validated to score this item.",x)+(total?`<div class="price-strip"><div><span>PRICE / LB · arithmetic only</span><b>$${(p/total).toFixed(2)}</b></div></div>`:"");return;}
 out.innerHTML='<div class="needs-data">Checking compatible sold evidence…</div>';
 let rows;try{const ids=match?match.rows.map(r=>r.id):C.filter(r=>normalized(r.brand+" "+r.model)===normalized(x.brand+" "+x.model)).map(r=>r.id);rows=await observationsFor(ids);}catch(e){if(version===evaluationVersion){console.warn("GearKoala: sold evidence unavailable");out.innerHTML=abstain(label,"Sold evidence could not be loaded. This is a data-availability failure, not an estimate.",x);}return;}
 if(version!==evaluationVersion)return;
 const condition={"1":"excellent",".93":"good",".82":"fair"}[$("#condition").value],ev=reliableEvidence(rows,x,match,condition,Date.now(),raw);
 if(/\bv(?:ersion)?\s*\d/i.test(raw)&&!ev.comps.length){out.innerHTML=abstain(label,"No sold evidence confirms the requested generation. A different or unknown generation cannot establish its value.",x);return;}
 const decision=valuationDecision(x,p,ev,condition);
 publishValuation(valuationSnapshot(label,x,p,ev,decision));
 out.innerHTML=renderValuation(label,x,p,ev,condition,decision);
}
$("#go").onclick=null;
// A real form makes mouse, keyboard and mobile submit use the same flow.
$("#dealForm").addEventListener("submit",async e=>{
 e.preventDefault();const go=$("#go"),out=$("#out");go.disabled=true;out.setAttribute("aria-busy","true");
 try{await evaluate();}catch(error){console.warn("GearKoala: evaluation failed");out.innerHTML=abstain("CHECK UNAVAILABLE","The check could not finish. Please try again.");}
 finally{go.disabled=false;out.setAttribute("aria-busy","false");}
});
["price","condition","lotQty","unitWeight","totalWeight","listingUrl"].forEach(id=>{let el=$("#"+id);if(el)el.addEventListener("input",clearResult)});
const catalogReady=load();
