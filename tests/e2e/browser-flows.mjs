// Real-browser contract tests. No DOM mocks and no direct application-function calls.
// page: Playwright Page, or {goto: tab.goto.bind(tab), ...tab.playwright} via adapter.
export async function runBrowserFlows(page, baseURL, group='all') {
 const results=[];
 let homepageEchoSnapshot,homepageConceptSnapshot;
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const out=page.locator('#out');
 async function check(name,title,price,submit,expected,rejected=/POUNCE|Grab Score/) {
  await page.locator('#title').fill(title);
  if(price)await page.locator('#price').fill(price);
  else {await page.locator('#price').press('ControlOrMeta+A');await page.locator('#price').press('Backspace');}
  if(submit==='click')await page.locator('#go').click();
  else await page.locator(submit==='title-enter'?'#title':'#price').press('Enter');
  await page.locator('#out .resulttop, #out .identify').waitFor({state:'visible',timeoutMs:20000});
  const text=await out.innerText();
  for(const pattern of expected)assert(pattern.test(text),`${name}: missing ${pattern}: ${text}`);
  assert(!rejected.test(text),`${name}: unexpected verdict: ${text}`);
  results.push({name,pass:true,text});
 }
 const echo=[/WORTH GRABBING/,/72 Grab Score/,/LIMITED MARKET SIGNAL/,/2 eligible sold observations/,/\$400–\$600/,/BUYER-ATTESTED TRANSACTION/,/PUBLIC AUCTION RESULT/,/Not independently source-verifiable/];
 async function chooseSuggestion(container,name){
  const menu=page.locator(container);await menu.locator('button').first().waitFor({state:'visible',timeoutMs:20000});
  const choices=await menu.locator('button').allTextContents();
  assert(choices.includes(name),`Missing ${name} suggestion: ${choices.join(', ')}`);
  await menu.getByRole('button',{name,exact:true}).click();
  const selected=await page.locator('#title').evaluate(input=>input.value);
  assert(selected===name,`Suggestion did not establish ${name}: ${selected}`);
 }
 async function open(path){
  await page.goto(new URL(path,baseURL).href);
  await page.locator('#title').waitFor({state:'visible',timeoutMs:20000});
 }
 if(group==='all'||group==='home') {
  await open('/');
  await page.locator('#title').fill('rogue');
  await chooseSuggestion('#homeSuggestions','Rogue Echo Bike');
  await page.locator('#price').fill('400');await page.locator('#go').click();
  await page.locator('#out .resulttop').waitFor({state:'visible',timeoutMs:20000});
  let text=await out.innerText();for(const pattern of echo)assert(pattern.test(text),`homepage autocomplete Echo: missing ${pattern}: ${text}`);
  homepageEchoSnapshot=JSON.parse(await out.getAttribute('data-valuation'));
  assert(homepageEchoSnapshot?.compCount===2,'homepage did not publish the shared Echo valuation');
  results.push({name:'homepage Rogue suggestion selects canonical Echo Bike',pass:true,text});

  await open('/');
  await page.locator('#title').fill('rogue');
  await page.locator('#homeSuggestions button').first().waitFor({state:'visible',timeoutMs:20000});
  await page.locator('#price').fill('400');await page.locator('#go').click();
  await page.locator('#out .resulttop').waitFor({state:'visible',timeoutMs:20000});
  text=await out.innerText();assert(/IDENTIFICATION UNCERTAIN/.test(text)&&/Not scored/.test(text),`homepage bare Rogue did not abstain: ${text}`);
  results.push({name:'homepage bare Rogue still abstains',pass:true,text});

  await open('/');
  await check('homepage direct Rogue Echo Bike','Rogue Echo Bike','400','click',echo);

  await open('/');
  await page.locator('#title').fill('Concept2');
  await chooseSuggestion('#homeSuggestions','Concept2 Model D PM5');
  await page.locator('#price').fill('400');await page.locator('#go').click();
  await page.locator('#out .resulttop').waitFor({state:'visible',timeoutMs:20000});
  text=await out.innerText();assert(/5 eligible sold observations/.test(text)&&/\$320–\$461/.test(text),`homepage Concept2 Model D suggestion did not value: ${text}`);
  homepageConceptSnapshot=JSON.parse(await out.getAttribute('data-valuation'));
  results.push({name:'homepage Concept2 Model D suggestion evaluates',pass:true,text});

  await open('/');
  await page.locator('#title').fill('Concept2');
  await chooseSuggestion('#homeSuggestions','Concept2 RowErg');
  await page.locator('#price').fill('400');await page.locator('#go').click();
  await page.locator('#out .resulttop').waitFor({state:'visible',timeoutMs:20000});
  text=await out.innerText();assert(/5 eligible sold observations/.test(text)&&/\$320–\$461/.test(text),`homepage Concept2 RowErg suggestion did not value: ${text}`);
  results.push({name:'homepage Concept2 RowErg suggestion evaluates',pass:true,text});

  await open('/');
  await check('homepage click Echo $400','Rogue Echo Bike','400','click',echo);
  await check('homepage price Enter Echo $400','Rogue Echo Bike','400','enter',echo);
  await check('homepage equipment Enter RowErg','Concept2 RowErg PM5','400','title-enter',[/[1-9]\d* eligible sold observations/,/MEDIAN SOLD PRICE/,/Concept2/]);
  await check('homepage invalid price validation','Rogue Echo Bike','','enter',[/CHECK THE PRICE/]);
  await check('homepage replacement chain abstains','Concept2 replacement chain PM5','50','click',[/ITEM NEEDS REVIEW/,/Not scored/],/POTENTIALLY GOOD PRICE|POUNCE|Grab Score/);
 }
 if(group==='all'||group==='checker') {
  await open('/checker.html');
  await page.locator('#title').fill('rogue');
  await chooseSuggestion('#suggestions','Rogue Echo Bike');
  results.push({name:'Deal Checker Rogue autocomplete still selects canonical Echo Bike',pass:true,text:await page.locator('#title').evaluate(input=>input.value)});

  await open('/checker.html');
  await check('Deal Checker click Echo $400','Rogue Echo Bike','400','click',echo);
  const checkerEchoSnapshot=JSON.parse(await out.getAttribute('data-valuation'));
  if(homepageEchoSnapshot){
   for(const key of ['transactionIds','compCount','range','median','askingTransactionIds','askingCount','askingRange','askingMedian','confidence','signal','score','verdict']){
    assert(JSON.stringify(checkerEchoSnapshot[key])===JSON.stringify(homepageEchoSnapshot[key]),`homepage/checker valuation mismatch for ${key}`);
   }
   results.push({name:'homepage and Deal Checker share the exact Echo valuation object',pass:true,text:JSON.stringify(checkerEchoSnapshot)});
  }
  await check('Deal Checker Enter Echo $400','Rogue Echo Bike','400','enter',echo);
  await check('Deal Checker Model D PM5','Concept2 Model D PM5','400','enter',[/[1-9]\d* eligible sold observations/,/MEDIAN SOLD PRICE/,/Concept2/]);
  const checkerConceptSnapshot=JSON.parse(await out.getAttribute('data-valuation'));
  if(homepageConceptSnapshot){
   for(const key of ['transactionIds','compCount','range','median','askingTransactionIds','askingCount','askingRange','askingMedian','confidence','signal','score','verdict']){
    assert(JSON.stringify(checkerConceptSnapshot[key])===JSON.stringify(homepageConceptSnapshot[key]),`homepage/checker Concept2 valuation mismatch for ${key}`);
   }
   results.push({name:'homepage and Deal Checker share the exact Concept2 valuation object',pass:true,text:JSON.stringify(checkerConceptSnapshot)});
  }
  await check('Deal Checker RowErg','Concept2 RowErg','400','click',[/[1-9]\d* eligible sold observations/,/MEDIAN SOLD PRICE/,/Concept2/]);
  await check('Deal Checker generic treadmill abstains','treadmill','400','enter',[/IDENTIFICATION UNCERTAIN/,/Not scored/],/POTENTIALLY GOOD PRICE|POUNCE|Grab Score/);
  await check('Deal Checker replacement chain abstains','Concept2 replacement chain PM5','50','click',[/ITEM NEEDS REVIEW/,/Not scored/],/POTENTIALLY GOOD PRICE|POUNCE|Grab Score/);
  await check('Model D missing monitor choices','Concept2 Model D','400','enter',[/Confirm the monitor/,/PM5/]);
  await page.locator('.idchoice[data-model="Concept2 Model D PM5"]').click();
  await page.locator('#out .resulttop').waitFor({state:'visible',timeoutMs:20000});
  const monitor=await out.innerText();assert(/eligible sold observations/.test(monitor),'Monitor selection did not value');results.push({name:'monitor choice evaluates',pass:true,text:monitor});
  await page.getByRole('button',{name:'browse',exact:true}).click();
  await page.locator('#browseBrand').selectOption('Rogue');await page.locator('#browseCategory').selectOption('power rack');
  await page.locator('#price').fill('400');await page.locator('#price').press('Enter');
  await page.locator('#out .resulttop').waitFor({state:'visible',timeoutMs:20000});
  const rack=await out.innerText();assert(/RML-3WC/.test(rack)&&/0 eligible sold observations/.test(rack)&&/RETAIL-BASED REFERENCE/.test(rack)&&!/Concept2|POTENTIALLY GOOD PRICE/.test(rack),'Browse uses stale or unsupported evidence');results.push({name:'Browse Rogue RML-3WC after Concept2',pass:true,text:rack});
 }
 return results;
}
