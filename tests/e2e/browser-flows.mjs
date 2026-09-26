// Real-browser contract tests. No DOM mocks and no direct application-function calls.
// page: Playwright Page, or {goto: tab.goto.bind(tab), ...tab.playwright} via adapter.
export async function runBrowserFlows(page, baseURL, group='all') {
 const results=[];
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
 const echo=[/POTENTIALLY GOOD PRICE/,/LOW CONFIDENCE/,/2 eligible sold observations/,/\$400–\$600/,/20% below/,/BUYER-ATTESTED TRANSACTION/,/PUBLIC AUCTION RESULT/,/Not independently source-verifiable/];
 if(group==='all'||group==='home') {
  await page.goto(new URL('/',baseURL).href);
  await check('homepage click Echo $400','Rogue Echo Bike','400','click',echo);
  await check('homepage price Enter Echo $400','Rogue Echo Bike','400','enter',echo);
  await check('homepage equipment Enter RowErg','Concept2 RowErg PM5','400','title-enter',[/[1-9]\d* eligible sold observations/,/MEDIAN SOLD PRICE/,/Concept2/]);
  await check('homepage invalid price validation','Rogue Echo Bike','','enter',[/CHECK THE PRICE/]);
  await check('homepage replacement chain abstains','Concept2 replacement chain PM5','50','click',[/ITEM NEEDS REVIEW/,/Not scored/],/POTENTIALLY GOOD PRICE|POUNCE|Grab Score/);
 }
 if(group==='all'||group==='checker') {
  await page.goto(new URL('/checker.html',baseURL).href);
  await check('Deal Checker click Echo $400','Rogue Echo Bike','400','click',echo);
  await check('Deal Checker Enter Echo $400','Rogue Echo Bike','400','enter',echo);
  await check('Deal Checker Model D PM5','Concept2 Model D PM5','400','enter',[/[1-9]\d* eligible sold observations/,/MEDIAN SOLD PRICE/,/Concept2/]);
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
