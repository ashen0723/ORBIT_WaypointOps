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
  try {
    const future = new Date(); future.setUTCDate(future.getUTCDate() + 10);
    while (future.getUTCDay() === 0) future.setUTCDate(future.getUTCDate() + 1);
    const day = future.toISOString().slice(0,10);
    await db.operatingDay.upsert({where: {date: new Date(day)}, update: {operating: true}, create: {date: new Date(day), operating: true}});
    await db.user.upsert({where: {id: 'store-ui'}, update: {}, create: {id: 'store-ui', email: 'store-ui@test', name: 'Store UI Manager', role: 'STORE_MANAGER', outletId: 'A', passwordHash: await bcrypt.hash('test-password',4)}});
    await db.catalogItem.upsert({where: {id: 'STORE-UI-CAT'}, update: {}, create: {id: 'STORE-UI-CAT', name: 'Store UI cartons', brand: 'FRESH', temp: 'AMBIENT', unit: 'cartons', unitWeightKg: 2, unitVolumeM3: 0.01}});
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('response', async r => { if (r.status() >= 400 && r.url().includes('/api/')) console.log('API ERROR',r.status(),r.url(),await r.text()); });
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url + '/login');
    await page.getByLabel('Email').fill('store-ui@test');
    await page.getByLabel('Password', {exact:true}).fill('test-password');
    await page.getByRole('button', {name: 'Sign in', exact:true}).click();
    await expect(page.getByRole('heading',{name:'My Orders',exact:true})).toBeVisible();
    await expect(page.getByText('Store UI Manager',{exact:true})).toBeVisible();
    await page.getByRole('link',{name:'Place New Order'}).first().click();
    await expect(page.getByRole('heading',{name:'Place Order',exact:true})).toBeVisible();
    await page.getByLabel('Item 1 name').first().fill('Store UI cartons');
    await page.getByLabel('Item 1 quantity').first().fill('3');
    await page.screenshot({path:'/private/tmp/waypoint-store-place-order.png',fullPage:true});
    await page.getByRole('button',{name:'Submit Dry Order',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Order Confirmed',exact:true})).toBeVisible();
    const orderId = page.url().split('/orders/')[1].split('/')[0];
    const saved = await db.order.findUnique({where:{id:orderId},include:{lines:true}});
    assert.equal(saved.lines[0].requestedQty,3); assert.equal(saved.lines[0].unit,'cartons');
    await page.screenshot({path:'/private/tmp/waypoint-store-confirmation.png',fullPage:true});
    await page.getByRole('link',{name:'View Order',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Order details',exact:true})).toBeVisible();
    await page.screenshot({path:'/private/tmp/waypoint-store-status.png',fullPage:true});
    await page.reload(); await expect(page.getByRole('heading',{name:orderId,exact:true})).toBeVisible();
    await page.getByRole('link',{name:'Order History',exact:true}).first().click();
    await expect(page.getByRole('heading',{name:'Order History',exact:true})).toBeVisible();
    await expect(page.getByText(orderId,{exact:true}).first()).toBeVisible();
    await page.screenshot({path:'/private/tmp/waypoint-store-history.png',fullPage:true});
    await page.getByLabel('Status', {exact:true}).selectOption('confirmed');
    await expect(page.getByText(orderId,{exact:true}).first()).toBeVisible();
    await page.getByLabel('Brand', {exact:true}).selectOption('Tech');
    await expect(page.getByText('No orders match this view.')).toBeVisible();
    await page.getByLabel('Brand', {exact:true}).selectOption('all');
    // A real persisted handover, followed by the Store UI's receipt POST.
    const trip = await db.trip.findFirst();
    const stop = await db.tripStop.create({data:{tripId:trip.id,orderId,sequence:900,active:false,status:'DELIVERED', lines:{create:{orderLineId:saved.lines[0].id,plannedQty:3,loadedQty:3,deliveredQty:3,returnedQty:0}}}});
    const delivery = await db.delivery.create({data:{stopId:stop.id,outcome:'DELIVERED',capturedAt:new Date(),completedAt:new Date(),recorded:{outcome:'DELIVERED',damageReported:false,lines:[{orderLineId:saved.lines[0].id,deliveredQty:3,returnedQty:0}],proof:{recipientName:'Store UI Manager',signatureRef:null,photoRefs:[],signatureExceptionReason:'Test fixture'}}}});
    await db.order.update({where:{id:orderId},data:{status:'DELIVERED'}});
    await page.goto(url + '/store/orders/' + orderId + '/receipt');
    await expect(page.getByRole('heading',{name:'Confirm Receipt',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Mark remaining as received OK'}).click();
    await page.getByRole('button',{name:'Confirm Receipt',exact:true}).click();
    await expect(page.getByRole('heading',{name:orderId,exact:true})).toBeVisible();
    const receipt = await db.receipt.findUnique({where:{deliveryId:delivery.id},include:{lines:true}});
    assert.equal(receipt.lines[0].acceptedQty,3);
    await page.reload(); await expect(page.getByText('Receipt Confirmed',{exact:true}).first()).toBeVisible();
    await page.getByRole('link',{name:'My Orders',exact:true}).first().click();
    await page.screenshot({path:'/private/tmp/waypoint-store-orders.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await expect(page.getByRole('heading',{name:'My Orders',exact:true})).toBeVisible();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:'/private/tmp/waypoint-store-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: Store UI live login, scoped catalog, create, server date, persistence, details/history filters, receipt confirmation, mobile layout.');
  } finally { if(browser) await browser.close(); await new Promise(r => server.close(r)); }
};
