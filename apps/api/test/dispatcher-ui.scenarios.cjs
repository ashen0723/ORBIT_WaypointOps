const { chromium, expect } = require('@playwright/test');
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const assert = require('node:assert/strict');
module.exports = async ({db,base}) => {
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
  try {
    const future=new Date();future.setUTCDate(future.getUTCDate()+60);while(future.getUTCDay()===0)future.setUTCDate(future.getUTCDate()+1);
    const day=future.toISOString().slice(0,10);
    await db.operatingDay.upsert({where:{date:new Date(day)},update:{operating:true},create:{date:new Date(day),operating:true}});
    await db.outlet.update({where:{id:'A'},data:{parkingConstraint:'NORMAL',windowOpenTime:'04:00',windowCloseTime:'10:00'}});
    await db.user.update({where:{id:'driver'},data:{vehicleId:'V'}});
    for(const [id,deferrals] of [['DISPATCH-UI-PRIORITY',2],['DISPATCH-UI-NEXT',0]]) await db.order.create({data:{id,outletId:'A',createdById:'dispatcher',requestedDate:new Date(day),plannedDate:new Date(day),temp:'CHILLED',units:3,weightKg:6,volumeM3:0.3,deferralCount:deferrals,lines:{create:{item:'Chilled cartons',unit:'cartons',requestedQty:3,unitWeightKg:2,unitVolumeM3:0.1}}}});
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
    page.setDefaultTimeout(15000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=`http://127.0.0.1:${server.address().port}`;
    await page.goto(url+'/login');await page.getByLabel('Email').fill('dispatcher@test');await page.getByLabel('Password',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Dispatcher Overview',exact:true})).toBeVisible();
    await page.locator('.dispatch-scope-filters summary').click();await page.getByLabel('Run date',{exact:true}).fill(day);await page.getByLabel('Depot',{exact:true}).selectOption('D');await page.locator('.dispatch-scope-filters summary').click();
    await expect(page.locator('.dispatch-overview-stats a')).toHaveCount(6);
    await expect(page.getByRole('button',{name:'Live',exact:true})).toBeVisible();
    await expect(page.locator('.dispatch-overview-stats')).not.toContainText('—');
    await page.screenshot({path:'/private/tmp/waypoint-dispatcher-reference-overview.png',fullPage:true});
    await page.getByRole('navigation',{name:'Dispatcher navigation'}).getByRole('link',{name:'Orders',exact:true}).click();
    await page.getByLabel('Search orders').fill('DISPATCH-UI');await expect(page.getByRole('table',{name:'Orders queue'}).locator('tbody tr')).toHaveCount(2);
    await page.getByRole('navigation',{name:'Dispatcher navigation'}).getByRole('link',{name:'Trip Planning',exact:true}).click();
    await page.getByLabel('Planning depot',{exact:true}).selectOption('D');await page.getByLabel('Plan date',{exact:true}).fill(day);await page.getByLabel('Departure time',{exact:true}).fill('05:00');await page.getByLabel('Vehicle',{exact:true}).selectOption('V');
    await page.getByRole('button',{name:'Add order DISPATCH-UI-PRIORITY',exact:true}).click();
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText('Draft saved on the server. It holds no reservations.',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Validate plan',exact:true}).click();await expect(page.getByText('All planning checks passed.',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Allocate trip',exact:true}).click();await expect(page.getByRole('button',{name:'Publish trip',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Publish trip',exact:true}).click();await expect(page.getByText('Trip published to the loading team.',{exact:true})).toBeVisible();
    const stop=await db.tripStop.findFirst({where:{orderId:'DISPATCH-UI-PRIORITY'},include:{trip:true}});assert.ok(stop.trip.publishedAt);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:'/private/tmp/waypoint-dispatcher-reference-planning.png',fullPage:true});
    for(const [label,heading] of [['Loading','Loading'],['Delivery Monitoring','Delivery Monitoring'],['Deferrals','Deferrals'],['Vehicles','Vehicle List'],['Capacity Forecast','Capacity Forecast'],['History','Order History'],['System Checks','System Checks']]) {
      await page.getByRole('navigation',{name:'Dispatcher navigation'}).getByRole('link',{name:label,exact:true}).click();
      await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
    }
    await page.getByRole('navigation',{name:'Dispatcher navigation'}).getByRole('link',{name:'Overview',exact:true}).click();
    await expect(page.locator('.dispatch-overview-stats a').filter({hasText:'Trips Loading'})).toContainText('1');
    await page.route('**/api/dispatcher/orders?**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Test overview unavailable'})}));
    await page.getByRole('button',{name:'Refresh dashboard',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('Test overview unavailable');
    await page.unroute('**/api/dispatcher/orders?**');await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
    await page.setViewportSize({width:390,height:844});await expect(page.getByRole('heading',{name:'Dispatcher Overview',exact:true})).toBeVisible();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'/private/tmp/waypoint-dispatcher-reference-mobile.png'});
    await page.getByRole('button',{name:'Open menu',exact:true}).click();await expect(page.getByRole('dialog',{name:'Dispatcher menu'})).toBeVisible();await page.getByRole('dialog').getByRole('link',{name:'Orders',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.deepEqual(errors,[]);
    console.log('PASS: Dispatcher reference UI, real data, navigation, draft/validate/allocate/publish and mobile menu.');
  } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
};
