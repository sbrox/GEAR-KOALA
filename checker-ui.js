const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
let mode='search',linkVersion=0,linkController;
function resetInput(){selectedEquipmentId=null;clearResult();q('#title').value='';q('#suggestions').replaceChildren();q('#lotQty').value='';q('#unitWeight').value='';q('#totalWeight').value='';delete q('#totalWeight').dataset.manual;}
function setMode(next){linkVersion++;linkController?.abort();mode=next;resetInput();qa('.entrytab').forEach(b=>{b.classList.toggle('active',b.dataset.mode===next);b.setAttribute('aria-pressed',String(b.dataset.mode===next));});qa('.entrymode').forEach(e=>e.classList.toggle('active',e.id===next+'Mode'));if(next==='browse')updateModels();q('#go').disabled=next==='photo';updateLotUI();}
function updateModels(reset=true){
 if(reset)resetInput();const brand=q('#browseBrand').value,category=q('#browseCategory').value;
 const matches=C.filter(x=>(!brand||x.brand===brand)&&(!category||x.category.toLowerCase()===category));
 q('#browseModel').replaceChildren(new Option('Choose an exact model',''));
 for(const x of matches)q('#browseModel').add(new Option(x.brand+' '+x.model,x.id));
 // Only one catalog identity fits these explicit filters: select it visibly.
 // Multiple models never silently resolve to the first option.
 if(brand&&category&&matches.length===1){q('#browseModel').value=matches[0].id;selectEquipment(matches[0].id);}
 updateLotUI();
}
qa('.entrytab').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
q('#browseCategory').onchange=()=>updateModels();q('#browseBrand').onchange=()=>updateModels();
q('#browseModel').onchange=()=>{selectEquipment(q('#browseModel').value);updateLotUI();};
catalogReady.then(()=>{for(const v of [...new Set(C.map(x=>x.category?.toLowerCase()).filter(Boolean))].sort())q('#browseCategory').add(new Option(v,v));for(const v of [...new Set(C.map(x=>x.brand).filter(Boolean))].sort())q('#browseBrand').add(new Option(v,v));updateModels(false);});
// Shared with the homepage so catalog matching and canonical selection cannot drift.
bindCatalogSuggestions('#suggestions',updateLotUI);
q('#listingUrl').addEventListener('input',()=>{linkVersion++;linkController?.abort();resetInput();q('#compStatus').textContent='Read the listing, then review its title and USD price in Smart Search.';});
async function readListing(){
 const version=++linkVersion;linkController?.abort();linkController=new AbortController();q('#compStatus').textContent='Reading listing…';
 try{const r=await fetch('/api/listing?url='+encodeURIComponent(q('#listingUrl').value.trim()),{signal:linkController.signal});const d=await r.json();if(version!==linkVersion)return;if(!r.ok||!d.ok)throw Error(d.error||'Listing could not be read.');
  setMode('search');q('#title').value=d.title;updateLotUI();q('#compStatus').textContent='Review the extracted title and enter the current USD asking price. No automatic valuation has been made.';
  // Suggested price is visible context, never silently overwrites a user price.
  if(d.price&&d.currency==='USD')q('#compStatus').textContent+=' Listing suggests $'+d.price+' USD; confirm this is the item price.';
  q('#title').focus();
 }catch(e){if(version!==linkVersion||e.name==='AbortError')return;setMode('search');q('#compStatus').textContent='Could not verify this listing. Enter its title and USD price manually.';q('#title').focus();}
}
q('#dealForm').addEventListener('submit',e=>{q('#suggestions').replaceChildren();if(mode==='link'){e.stopImmediatePropagation();e.preventDefault();readListing();}},true);
function updateLotUI(){q('#lotFields').classList.toggle('show',/dumbbell|plate|bumper|weight set/i.test(q('#title').value));}
for(const id of ['lotQty','unitWeight'])q('#'+id).addEventListener('input',()=>{if(!q('#totalWeight').dataset.manual){const a=parsePrice(q('#lotQty').value),b=parsePrice(q('#unitWeight').value);q('#totalWeight').value=a&&b?String(a*b):'';}});
q('#totalWeight').addEventListener('input',()=>q('#totalWeight').dataset.manual='1');
const params=new URLSearchParams(location.search);if(params.get('url')){setMode('link');q('#listingUrl').value=params.get('url');if(params.get('price'))q('#price').value=params.get('price');}else if(location.hash==='#photo')setMode('photo');
