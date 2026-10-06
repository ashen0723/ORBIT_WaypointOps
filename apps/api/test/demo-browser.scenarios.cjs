const { chromium, expect } = require('@playwright/test');
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
module.exports = async ({ db, base }) => {
  const webRoot = join(__dirname, "../../web/dist");
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith("/api/")) {
      const upstream = http.request(
        new URL(req.url, base),
        { method: req.method, headers: req.headers },
        (r) => {
          res.writeHead(r.statusCode, r.headers);
          r.pipe(res);
        },
      );
      upstream.on("error", () => {
        res.statusCode = 502;
        res.end();
      });
      req.pipe(upstream);
      return;
    }
    const path = req.url.split("?")[0];
    const file =
      path.startsWith("/assets/") ||
      path === "/sw.js" ||
      /\.(jpg|png|webp)$/.test(path)
        ? path
        : "/index.html";
    try {
      const data = await readFile(join(webRoot, file));
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "application/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".jpg")
              ? "image/jpeg"
              : file.endsWith(".png")
                ? "image/png"
                : file.endsWith(".webp")
                  ? "image/webp"
                  : "text/html",
      );
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));

  let browser;
  const pages = {};
  try {
    // Only reference data is seeded. Orders and workflow transitions below use the actual UI/API.
    const now = new Date();
    for(let i=0;i<45;i++) {
      const d = new Date(now); d.setUTCDate(d.getUTCDate()+i);
      const date = new Date(d.toISOString().slice(0,10));
      await db.operatingDay.upsert({where:{date},update:{operating:date.getUTCDay()!==0},create:{date,operating:date.getUTCDay()!==0}});
    }
    await db.outlet.create({data:{id:'DEMO-OUT',name:'Demo Van Only Store',brand:'FRESH',district:'Colombo',depotId:'D',dockType:'STREET',parkingConstraint:'VAN_ONLY',windowOpenTime:'04:00',windowCloseTime:'10:00'}});
    await db.outletHandling.create({data:{outletId:'DEMO-OUT',serviceMin:15,source:'demo test'}});
    await db.travelLeg.createMany({data:[{fromKey:'depot:D',toKey:'outlet:DEMO-OUT',distanceKm:5,durationMin:10,source:'demo test'},{fromKey:'outlet:DEMO-OUT',toKey:'depot:D',distanceKm:5,durationMin:10,source:'demo test'}]});
    await db.catalogItem.create({data:{id:'DEMO-MILK',name:'Demo chilled milk',brand:'FRESH',temp:'CHILLED',unit:'crates',unitWeightKg:2,unitVolumeM3:0.01}});
    await db.vehicle.createMany({data:['DEMO-VAN-1','DEMO-VAN-2','DEMO-TRUCK'].map(id=>({id,depotId:'D',type:id==='DEMO-TRUCK'?'TRUCK':'VAN',temp:'REEFER',weightCapKg:1000,volumeCapM3:20,fuelType:'diesel',kmPerL:10,weeklyFuelQuotaL:500}))});
    const passwordHash = await bcrypt.hash('test-password',4);
    await db.user.createMany({data:[{id:'demo-store',email:'demo-store@test',name:'Demo Store Manager',role:'STORE_MANAGER',outletId:'DEMO-OUT',passwordHash},...['old','driver','truck'].map((name,i)=>({id:'demo-'+name,email:`demo-${name}@test`,name:'Demo '+name,role:'DRIVER',vehicleId:['DEMO-VAN-1','DEMO-VAN-2','DEMO-TRUCK'][i],passwordHash}))]});
    browser = await chromium.launch({channel:'chrome',headless:true});
    const url = `http://127.0.0.1:${server.address().port}`;
    const errors=[];
    for(const [role,email] of Object.entries({store:'demo-store@test',dispatcher:'dispatcher@test',loader:'loader@test',driver:'demo-driver@test'})) {
      const context = await browser.newContext({viewport:{width:1440,height:1000}});
      const page=await context.newPage(); page.setDefaultTimeout(12000); pages[role]=page;
      page.on('pageerror',e=>errors.push(`${role}: ${e.message}`));
      page.on('response',async r=>{if(r.status()>=400&&r.url().includes('/api/')) console.log('DEMO API',role,r.status(),r.url(),await r.text().catch(()=>''));});
      await page.goto(url+'/login'); await page.getByLabel('Email').fill(email); await page.getByLabel('Password',{exact:true}).fill('test-password'); await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await expect(page.getByRole('heading',{name:{store:'My Orders',dispatcher:'Dispatcher Overview',loader:'Loading Queue',driver:"Today's trips"}[role],exact:true,level:1})).toBeVisible();
    }
    const {store,dispatcher,loader,driver}=pages;
    const tokens={};
    for (const [role,page] of Object.entries(pages)) tokens[role]=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('waypoint.live.session')).token);
    async function request(path,body,role='dispatcher',method='POST',expected=200) {
      const response=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const result=await response.json();assert.equal(response.status,expected,JSON.stringify(result));return result;
    }
    for(const role of ['old','other-loader']) tokens[role]=(await request('/auth/login',{email:role==='old'?'demo-old@test':'other-loader@test',password:'test-password'},'anonymous')).token;
    await request('/vehicles',undefined,'anonymous','GET',401);
    await request('/vehicles',undefined,'store','GET',403);
    await store.getByRole('link',{name:'Place New Order'}).first().click();
    await store.getByRole('tab',{name:/Chilled/i}).click();
    await store.getByLabel('Item 1 name').first().fill('Demo chilled milk');
    await store.getByLabel('Item 1 quantity').first().fill('10');
    await store.getByRole('button',{name:'Submit Chilled Order',exact:true}).click();
    await expect(store.getByRole('heading',{name:'Order Confirmed',exact:true})).toBeVisible();
    const orderId=store.url().split('/orders/')[1].split('/')[0];
    const order=await db.order.findUniqueOrThrow({where:{id:orderId},include:{lines:true}});
    assert.equal(order.temp,'CHILLED'); assert.equal(order.lines[0].requestedQty,10);
    const day=order.requestedDate.toISOString().slice(0,10);
    console.log('DEMO: Store created chilled order',orderId,day);
    await dispatcher.locator('.dispatch-scope-filters summary').click();
    await dispatcher.getByLabel('Run date',{exact:true}).fill(day);
    await dispatcher.getByRole('navigation',{name:'Dispatcher navigation'}).getByRole('link',{name:'Trip Planning',exact:true}).click();
    await dispatcher.getByLabel('Planning depot',{exact:true}).selectOption('D');
    await dispatcher.getByLabel('Vehicle',{exact:true}).selectOption('DEMO-TRUCK');
    await dispatcher.getByRole('button',{name:`Add order ${orderId}`,exact:true}).click();
    const button=(page,name)=>page.getByRole('button',{name,exact:true});
    await button(dispatcher,'Save draft').click();
    await expect(dispatcher.getByText('Draft saved on the server. It holds no reservations.',{exact:true})).toBeVisible();
    await button(dispatcher,'Validate plan').click();
    await expect(dispatcher.getByText(/van.only/i).first()).toBeVisible();
    assert.equal(await db.tripStop.count({where:{orderId}}),0);
    await dispatcher.getByLabel('Vehicle',{exact:true}).selectOption('DEMO-VAN-1');
    await button(dispatcher,'Save draft').click();
    await expect(dispatcher.getByText('Draft saved on the server. It holds no reservations.',{exact:true})).toBeVisible();
    await button(dispatcher,'Validate plan').click();
    await expect(dispatcher.getByText('All planning checks passed.',{exact:true})).toBeVisible();
    await button(dispatcher,'Allocate trip').click(); await button(dispatcher,'Publish trip').click();
    await expect(dispatcher.getByText('Trip published to the loading team.',{exact:true})).toBeVisible();
    const stop=await db.tripStop.findFirstOrThrow({where:{orderId,active:true}}); const tripId=stop.tripId;
    await loader.goto(`${url}/loader/trips/${tripId}`);
    await expect(loader.getByText('DEMO-VAN-1',{exact:false}).first()).toBeVisible();
    const checks=loader.locator('details').filter({has:loader.locator('summary').filter({hasText:/^Loading checks & shortfalls$/})});
    const openChecks=async()=>{if(await checks.getAttribute('open')===null)await checks.locator('summary').first().click();};
    const commit=()=>expect(checks).not.toHaveAttribute('open','');
    await openChecks(); await button(loader,'Start loading').click(); await commit();
    await openChecks(); await loader.getByLabel('Loaded quantity',{exact:true}).fill('1'); await button(loader,'Save checked quantity').click(); await commit();
    await loader.getByText('Report vehicle unavailable',{exact:true}).click();
    await loader.getByLabel('Vehicle problem').fill('Refrigeration failure before departure');
    const reportRequest=loader.waitForRequest(r=>r.url().endsWith('/vehicle-unavailable')&&r.method()==='POST');
    await button(loader,'Stop loading and notify Dispatcher').click();
    const reportBody=(await reportRequest).postDataJSON();
    await expect(loader.getByRole('alert')).toContainText('Vehicle unavailable');
    assert.equal((await db.vehicleAvailability.findUniqueOrThrow({where:{vehicleId_date:{vehicleId:'DEMO-VAN-1',date:new Date(day)}}})).available,false);
    const eventsBefore=await db.auditEvent.count({where:{entityId:tripId,action:'VEHICLE_UNAVAILABLE'}});
    await request(`/trips/${tripId}/vehicle-unavailable`,reportBody,'loader');
    assert.equal(await db.auditEvent.count({where:{entityId:tripId,action:'VEHICLE_UNAVAILABLE'}}),eventsBefore);
    for(const role of ['store','driver','other-loader']) await request(`/trips/${tripId}/vehicle-unavailable`,{...reportBody,clientActionId:'forbidden-'+role},role,'POST',403);
    await request(`/loading/${tripId}/start`,{clientActionId:'blocked-start',expectedPlanVersion:1},'loader','POST',409);
    const loadedLine=await db.tripStopLine.findFirstOrThrow({where:{stopId:stop.id}});
    await request(`/loading/${tripId}/lines/${order.lines[0].id}`,{clientActionId:'blocked-load',expectedPlanVersion:1,expectedVersion:loadedLine.version,loadedQty:10},'loader','PATCH',409);
    await openChecks(); await button(loader,'Mark ready for departure').click();
    await expect(loader.getByRole('alert').filter({hasText:'Stop loading and ask Dispatcher'})).toBeVisible();
    await dispatcher.goto(`${url}/dispatcher/trips/${tripId}`);
    await dispatcher.getByLabel('Replacement vehicle',{exact:true}).selectOption('DEMO-VAN-2');
    await dispatcher.getByLabel('Replacement reason',{exact:true}).fill('Replace failed refrigeration van');
    await button(dispatcher,'Confirm replacement vehicle').click();
    await expect(dispatcher.getByRole('alert').filter({hasText:/unload/i})).toBeVisible();
    await loader.getByLabel('Loaded quantity',{exact:true}).fill('0'); await button(loader,'Save checked quantity').click(); await commit();
    await button(dispatcher,'Confirm replacement vehicle').click();
    await expect.poll(async()=> (await db.trip.findUniqueOrThrow({where:{id:tripId}})).vehicleId).toBe('DEMO-VAN-2');
    await expect(loader.getByText('DEMO-VAN-2',{exact:false}).first()).toBeVisible({timeout:20000});
    const replacement=await db.trip.findUniqueOrThrow({where:{id:tripId}});
    assert.equal(replacement.planVersion,2);assert.equal(replacement.driverId,'demo-driver');assert.equal(replacement.loaderAcknowledgedPlanVersion,null);
    await request(`/trips/${tripId}/vehicle-unavailable`,{clientActionId:'stale-unavailable',expectedPlanVersion:1,reason:'Old plan'},'loader','POST',409);
    await request(`/trips/${tripId}`,undefined,'old','GET',403);
    await openChecks(); await button(loader,'Start loading').click(); await commit();
    await openChecks(); await loader.getByLabel('Loaded quantity',{exact:true}).fill('10'); await button(loader,'Save checked quantity').click(); await commit();
    await openChecks(); await button(loader,'Acknowledge current plan').click(); await commit();
    await openChecks(); await button(loader,'Mark ready for departure').click();
    await expect(loader.getByRole('heading',{name:/Trip 1 · READY/})).toBeVisible();
    await loader.screenshot({path:'/private/tmp/waypoint-demo-loader-ready.png',fullPage:true});
    console.log('DEMO: publish, vehicle failure, unload guard, replacement, loader polling and readiness passed');
    await button(driver,'Refresh route / sync').click();
    await driver.goto(`${url}/driver/trips/${tripId}/check`);
    await button(driver,'Depart — start trip').click();
    await expect.poll(async()=> (await db.trip.findUniqueOrThrow({where:{id:tripId}})).status).toBe('IN_TRANSIT');
    await driver.goto(`${url}/driver/trips/${tripId}/stops/1`);
    await expect(button(driver,"I've arrived")).toBeVisible();
    await driver.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
    await driver.context().setOffline(true);
    await button(driver,"I've arrived").click(); await button(driver,'Record delivery').click();
    await driver.getByLabel('Recipient name').fill('Demo Store Manager');
    const box=await driver.getByRole('img',{name:'Signature pad. Draw with your finger.'}).boundingBox(); assert.ok(box);
    await driver.mouse.move(box.x+25,box.y+40); await driver.mouse.down();await driver.mouse.move(box.x+120,box.y+70,{steps:8});await driver.mouse.up();
    await button(driver,'Complete delivery').click();
    await expect(driver.getByText(/outcome · Saved on phone/)).toBeVisible();
    await driver.reload();await expect(driver.getByText(/outcome · Saved on phone/)).toBeVisible();
    assert.equal(await db.delivery.count({where:{stop:{orderId}}}),0);
    assert.equal((await db.tripStop.findUniqueOrThrow({where:{id:stop.id}})).arrivedAt,null);
    await expect.poll(()=>driver.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
    await driver.screenshot({path:'/private/tmp/waypoint-demo-offline.png',fullPage:true});
    await driver.context().setOffline(false);
    await expect.poll(()=>db.delivery.count({where:{stop:{orderId}}}),{timeout:20000}).toBe(1);
    await expect(driver.getByRole('region',{name:'Synchronization'})).toHaveCount(0);
    const delivered=await db.delivery.findFirstOrThrow({where:{stop:{orderId}},include:{stop:true}});
    assert.ok(delivered.stop.arrivedAt);assert.ok(delivered.recorded.proof.signatureRef);
    const evidence=await db.evidence.findUniqueOrThrow({where:{id:delivered.recorded.proof.signatureRef}}); assert.ok(evidence.bytes.length>50);
    console.log('DEMO: offline arrival + outcome survive reload, automatically sync, signature bytes persist');
    await store.goto(`${url}/store/orders/${orderId}/receipt`);
    await expect(store.getByRole('heading',{name:'Confirm Receipt',exact:true})).toBeVisible();
    await expect(store.getByText(/Arrival time:/)).toBeVisible();
    await expect(store.getByRole('img',{name:'Delivery evidence 1'})).toBeVisible();
    await store.getByRole('radio',{name:'Issue',exact:true}).click();
    await store.getByRole('radio',{name:'Damaged',exact:true}).check();
    await store.getByRole('spinbutton',{name:'Accepted',exact:true}).fill('8');
    await store.getByRole('spinbutton',{name:'Damaged',exact:true}).fill('2');
    await store.getByRole('spinbutton',{name:'Missing',exact:true}).fill('0');
    await store.getByLabel(/Describe the issue/).fill('Two milk crates damaged on arrival');
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR9sAAAAASUVORK5CYII=','base64');
    await store.locator('input[type=file]').setInputFiles({name:'damaged.png',mimeType:'image/png',buffer:png});
    await button(store,'Confirm Receipt').click();
    await expect(store.getByRole('heading',{name:orderId,exact:true})).toBeVisible();
    const receipt=await db.receipt.findUniqueOrThrow({where:{deliveryId:delivered.id},include:{lines:true}});
    assert.equal(receipt.lines[0].acceptedQty,8);assert.equal(receipt.lines[0].damagedQty,2);assert.equal(receipt.lines[0].missingQty,0);assert.equal(receipt.lines[0].photoRefs.length,1);
    assert.equal((await db.order.findUniqueOrThrow({where:{id:orderId}})).recoveryPending,true);
    await dispatcher.goto(`${url}/dispatcher/trips/${tripId}`);
    await expect(dispatcher.getByRole('region',{name:'Store receipt report'})).toContainText('8 accepted / 2 damaged / 0 missing');
    await expect(dispatcher.getByText('Two milk crates damaged on arrival',{exact:true})).toBeVisible();
    await expect(dispatcher.getByRole('heading',{name:'Outstanding recovery quantities'})).toBeVisible();
    await dispatcher.screenshot({path:'/private/tmp/waypoint-demo-dispatcher-receipt.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: Waypoint_Demo PDF — all four roles via UI, chilled/van-only rejection, publish, unavailable vehicle, unload/replacement, loading, driver departure, offline arrival+delivery reload/automatic sync, POD, 2 damaged units receipt and dispatcher follow-up.');
  } catch(error) {
    for(const [role,page] of Object.entries(pages)) {console.log('DEMO FAILURE PAGE',role,await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:`/private/tmp/waypoint-demo-fail-${role}.png`,fullPage:true}).catch(()=>{});}
    throw error;
  } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
};
