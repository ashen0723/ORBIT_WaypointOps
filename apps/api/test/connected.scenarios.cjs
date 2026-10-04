const assert = require("node:assert/strict");
/** All operational transitions below use HTTP. SQL supplies only reference data. */
module.exports = async ({ db, request, base, tokens }) => {
  let n = 0;
  const key = () => `connected-${++n}`,
    mutation = (body = {}) => ({ clientActionId: key(), ...body });
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 14);
  while (start.getUTCDay() !== 1) start.setUTCDate(start.getUTCDate() + 1);
  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  for (const day of days)
    await db.operatingDay.upsert({
      where: { date: new Date(day) },
      update: { operating: true },
      create: { date: new Date(day), operating: true },
    });
  await db.vehicle.create({
    data: {
      id: "LIVE-V",
      depotId: "D",
      type: "TRUCK",
      temp: "REEFER",
      weightCapKg: 100,
      volumeCapM3: 10,
      fuelType: "diesel",
      kmPerL: 10,
      weeklyFuelQuotaL: 1000,
    },
  });
  await db.user.update({
    where: { id: "driver" },
    data: { vehicleId: "LIVE-V" },
  });
  await db.catalogItem.create({
    data: {
      id: "CAT",
      brand: "FRESH",
      name: "Chilled carton",
      unit: "carton",
      temp: "CHILLED",
      unitWeightKg: 2,
      unitVolumeM3: 0.2,
    },
  });
  // Store API additions must coexist with the canonical workflow routes.
  for (const route of [
    "/orders",
    "/orders/catalog",
    "/orders/policy",
    "/outlets/me",
  ]) {
    await request(route, undefined, "anonymous", "GET", 401);
    await request(route, undefined, "driver", "GET", 403);
  }
  assert.equal(
    (await request("/outlets/me", undefined, "store", "GET")).id,
    "A",
  );
  await request("/outlets/me", undefined, "foreign-store", "GET", 403);
  const outletTemplate = await db.outlet.findUniqueOrThrow({
    where: { id: "A" },
  });
  await db.outlet.create({ data: { ...outletTemplate, id: "STORE-OTHER" } });
  await db.user.update({
    where: { id: "foreign-store" },
    data: { outletId: "STORE-OTHER" },
  });
  assert.equal(
    (await request("/outlets/me", undefined, "foreign-store", "GET")).id,
    "STORE-OTHER",
  );
  assert.deepEqual(
    await request("/orders/catalog", undefined, "store", "GET"),
    await request("/catalog", undefined, "store", "GET"),
  );
  const policy = await request(
    `/orders/policy?requestedDate=${days[0]}`,
    undefined,
    "store",
    "GET",
  );
  assert.equal(policy.effectiveDate, days[0]);
  await request(
    "/orders/policy?requestedDate=2026-02-30",
    undefined,
    "store",
    "GET",
    400,
  );
  const createdBody = mutation({
    requestedDate: days[0],
    temp: "CHILLED",
    lines: [{ catalogItemId: "CAT", requestedQty: 20 }],
  });
  await request("/orders", createdBody, "driver", "POST", 403);
  const created = await request("/orders", createdBody, "store", "POST", 201);
  assert.deepEqual(
    await request("/orders", createdBody, "store", "POST", 201),
    created,
  );
  assert.equal(created.order.weightKg, 40);
  assert.equal(created.order.outletId, "A");
  assert.equal(created.order.plannedDate, policy.effectiveDate);
  assert.deepEqual(
    await request("/orders?limit=1", undefined, "store", "GET"),
    await request("/store/orders?limit=1", undefined, "store", "GET"),
  );
  assert.deepEqual(
    await request("/orders?limit=1", undefined, "dispatcher", "GET"),
    await request("/dispatcher/orders?limit=1", undefined, "dispatcher", "GET"),
  );
  const order = created.order,
    lineId = order.lines[0].id;
  await request(`/orders/${order.id}`, undefined, "foreign-store", "GET", 403);
  const preview = await request(
    `/orders/${order.id}`,
    undefined,
    "dispatcher",
    "GET",
  );
  assert.equal(preview.planningLoad.weightKg, 40);
  assert.equal(preview.planningLoad.units, 20);
  const sunday = new Date(days[5]);
  sunday.setUTCDate(sunday.getUTCDate() + 1);
  await db.operatingDay.upsert({
    where: { date: sunday },
    update: { operating: true },
    create: { date: sunday, operating: true },
  });
  const calendar = await request(
    `/planning/calendar?from=${days[0]}&to=${sunday.toISOString().slice(0, 10)}&outletId=A&limit=2`,
    undefined,
    "dispatcher",
    "GET",
  );
  assert.deepEqual(
    calendar.items.map((d) => d.date),
    days.slice(0, 2),
  );
  const tail = await request(
    `/planning/calendar?from=${days[0]}&to=${sunday.toISOString().slice(0, 10)}&outletId=A&cursor=${calendar.nextCursor}`,
    undefined,
    "dispatcher",
    "GET",
  );
  assert.deepEqual(
    tail.items.map((d) => d.date),
    days.slice(2),
  );
  await request(
    `/planning/calendar?from=${days[0]}&to=${days[5]}`,
    undefined,
    "store",
    "GET",
    403,
  );
  await db.outlet.update({
    where: { id: "A" },
    data: { brand: "STYLE", scheduledWeekday: 3 },
  });
  const weekly = await request(
    `/planning/calendar?from=${days[0]}&to=${days[5]}&outletId=A`,
    undefined,
    "dispatcher",
    "GET",
  );
  assert.deepEqual(
    weekly.items.map((d) => d.date),
    [days[2]],
  );
  await db.outlet.update({
    where: { id: "A" },
    data: { brand: "FRESH", scheduledWeekday: null },
  });
  async function allocate(orderId, day) {
    const plan = {
      date: day,
      depotId: "D",
      vehicleId: "LIVE-V",
      plannedDeparture: "05:00",
      orderIds: [orderId],
    };
    const draft = await request(
      "/planning/drafts",
      mutation({ plan }),
      "dispatcher",
      "POST",
      201,
    );
    const ownDrafts = await request(
      "/planning/drafts",
      undefined,
      "dispatcher",
      "GET",
    );
    assert.ok(
      ownDrafts.items.some(
        (d) => d.id === draft.id && d.allocatedTripId === null,
      ),
    );
    await request("/planning/drafts", undefined, "loader", "GET", 403);
    const { trip } = await request(
      "/planning/allocate",
      mutation({ draftId: draft.id, expectedDraftVersion: draft.version }),
      "dispatcher",
      "POST",
      201,
    );
    return (
      await request(
        "/plans/publish",
        mutation({
          trips: [{ tripId: trip.id, expectedPlanVersion: trip.planVersion }],
        }),
      )
    ).trips[0];
  }
  async function load(trip, qty) {
    await request(
      `/loading/${trip.id}/start`,
      mutation({ expectedPlanVersion: trip.planVersion }),
      "loader",
    );
    return (
      await request(
        `/loading/${trip.id}/lines/${trip.stops[0].lines[0].orderLineId}`,
        mutation({
          expectedPlanVersion: trip.planVersion,
          expectedVersion: trip.stops[0].lines[0].version,
          loadedQty: qty,
        }),
        "loader",
        "PATCH",
      )
    ).trip;
  }
  async function depart(trip) {
    await request(
      `/trips/${trip.id}/acknowledge-plan`,
      mutation({ expectedPlanVersion: trip.planVersion }),
      "loader",
    );
    await request(
      `/trips/${trip.id}/ready`,
      mutation({ expectedPlanVersion: trip.planVersion }),
      "loader",
    );
    const body = mutation({ expectedPlanVersion: trip.planVersion });
    const result = await request(`/trips/${trip.id}/depart`, body, "driver");
    assert.deepEqual(
      await request(`/trips/${trip.id}/depart`, body, "driver"),
      result,
    );
    assert.equal(
      (await db.trip.findUnique({ where: { id: trip.id } })).committedFuelL,
      10,
    );
    return result;
  }
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1f8AAAAASUVORK5CYII=",
    "base64",
  );
  async function upload(trip, orderId, role = "driver") {
    const form = new FormData();
    form.set("clientActionId", key());
    form.set("orderId", orderId);
    form.set("tripId", trip.id);
    form.set("file", new Blob([png], { type: "image/png" }), "proof.png");
    const r = await fetch(`${base}/api/evidence`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens[role]}` },
      body: form,
    });
    const b = await r.json();
    assert.equal(r.status, 201, JSON.stringify(b));
    return b.evidenceId;
  }
  const proof = (signatureRef) => ({
    recipientName: "Outlet receiver",
    signatureRef,
    photoRefs: [],
  });
  const outcome = (trip, deliveredQty, returnedQty, signatureRef) =>
    mutation({
      expectedPlanVersion: trip.planVersion,
      capturedAt: new Date().toISOString(),
      delivery: {
        outcome: returnedQty ? "PARTIAL" : "DELIVERED",
        lines: [
          {
            orderLineId: trip.stops[0].lines[0].orderLineId,
            deliveredQty,
            returnedQty,
          },
        ],
        proof: proof(signatureRef),
        damageReported: false,
        ...(returnedQty ? { reason: "Two cartons refused" } : {}),
      },
    });
  async function receipt(delivery, acceptedQty, damagedQty = 0) {
    const body = mutation({
      expectedDeliveryVersion: delivery.version,
      lines: [
        {
          orderLineId: delivery.recorded.lines[0].orderLineId,
          acceptedQty,
          damagedQty,
          missingQty: 0,
          note: damagedQty ? "Damage found at receipt" : null,
          photoRefs: [],
        },
      ],
    });
    const r = await request(
      `/deliveries/${delivery.id}/confirm`,
      body,
      "store",
      "POST",
      201,
    );
    assert.deepEqual(
      await request(
        `/deliveries/${delivery.id}/confirm`,
        body,
        "store",
        "POST",
        201,
      ),
      r,
    );
    return r;
  }
  let trip = await load(await allocate(order.id, days[0]), 16);
  const issue = await request(
    `/loading/${trip.id}/issues`,
    mutation({
      expectedPlanVersion: trip.planVersion,
      orderLineId: lineId,
      type: "MISSING",
      availableQty: 16,
      note: "Four cartons unavailable",
      photoRefs: [],
    }),
    "loader",
    "POST",
    201,
  );
  const decision = await request(
    `/loading/issues/${issue.id}/decision`,
    mutation({
      expectedVersion: issue.version,
      expectedPlanVersion: trip.planVersion,
      decision: {
        action: "SHIP_SHORT",
        approvedLoadedQty: 16,
        reason: "Approved cancellation of four",
      },
    }),
  );
  trip = await request(`/trips/${trip.id}`, undefined, "loader", "GET");
  await request(
    `/loading/issues/${issue.id}/acknowledge`,
    mutation({
      expectedVersion: decision.version,
      expectedPlanVersion: trip.planVersion,
    }),
    "loader",
  );
  trip = await depart(trip);
  const signature = await upload(trip, order.id);
  await request(
    `/evidence/${signature}`,
    undefined,
    "foreign-store",
    "GET",
    403,
  );
  const body = outcome(trip, 14, 2, signature);
  const arrive = {
    kind: "ARRIVE",
    stopId: trip.stops[0].id,
    request: mutation({
      expectedPlanVersion: trip.planVersion,
      capturedAt: new Date().toISOString(),
    }),
  };
  const actions = {
    actions: [
      arrive,
      { kind: "OUTCOME", stopId: trip.stops[0].id, request: body },
    ],
  };
  const synced = await request("/sync/actions", actions, "driver");
  assert.ok(synced.results.every((r) => r.status === "SYNCED"));
  const replay = await request("/sync/actions", actions, "driver");
  assert.ok(replay.results.every((r) => r.status === "SYNCED" && r.replayed));
  assert.equal(
    await db.delivery.count({ where: { stopId: trip.stops[0].id } }),
    1,
  );
  let delivery = await request(
    `/deliveries/${synced.results[1].entityId}`,
    undefined,
    "store",
    "GET",
  );
  await request(
    `/deliveries/${delivery.id}/confirm`,
    mutation({
      expectedDeliveryVersion: delivery.version,
      lines: [
        {
          orderLineId: lineId,
          acceptedQty: 14,
          damagedQty: 2,
          missingQty: 0,
          note: null,
          photoRefs: [],
        },
      ],
    }),
    "store",
    "POST",
    422,
  );
  await receipt(delivery, 14);
  delivery = await request(
    `/deliveries/${delivery.id}`,
    undefined,
    "dispatcher",
    "GET",
  );
  const balanceBefore = await request(
    `/deliveries/${delivery.id}/recovery`,
    undefined,
    "dispatcher",
    "GET",
  );
  assert.deepEqual(balanceBefore.lines, [{ orderLineId: lineId, qty: 2 }]);
  await request(
    `/deliveries/${delivery.id}/recovery`,
    undefined,
    "store",
    "GET",
    403,
  );
  await request(
    `/deliveries/${delivery.id}/recovery`,
    mutation({
      expectedVersion: delivery.version,
      decision: {
        action: "REDELIVER",
        nextDate: days[1],
        reason: "Retry returned cartons",
        lines: [{ orderLineId: lineId, qty: 2 }],
      },
    }),
    "dispatcher",
    "POST",
    201,
  );
  const retryPreview = await request(
    `/orders/${order.id}`,
    undefined,
    "dispatcher",
    "GET",
  );
  assert.equal(retryPreview.planningLoad.units, 2);
  assert.equal(retryPreview.planningLoad.weightKg, 4);
  const balanceAfter = await request(
    `/deliveries/${delivery.id}/recovery`,
    undefined,
    "dispatcher",
    "GET",
  );
  assert.deepEqual(balanceAfter.lines, [{ orderLineId: lineId, qty: 0 }]);
  assert.equal(balanceAfter.decisions.length, 1);
  assert.equal(balanceAfter.decisions[0].decision.action, "REDELIVER");
  let retry = await allocate(order.id, days[1]);
  assert.equal(retry.stops[0].lines[0].plannedQty, 2);
  retry = await depart(await load(retry, 2));
  const rdel = await request(
    `/stops/${retry.stops[0].id}/outcome`,
    outcome(retry, 2, 0, await upload(retry, order.id)),
    "driver",
    "POST",
    201,
  );
  await receipt(rdel, 2);
  const finished = await request(
    `/orders/${order.id}`,
    undefined,
    "store",
    "GET",
  );
  assert.equal(finished.status, "RECEIVED");
  assert.equal(finished.lines[0].cancelledQty, 4);
  assert.equal(finished.lines[0].deliveredQty, 16);
  assert.equal(finished.attemptStopIds.length, 2);
  // Stale offline evidence is committed without changing delivery/order facts; dispatcher accepts explicitly.
  const co = (
    await request(
      "/orders",
      mutation({
        requestedDate: days[2],
        temp: "CHILLED",
        lines: [{ catalogItemId: "CAT", requestedQty: 5 }],
      }),
      "store",
      "POST",
      201,
    )
  ).order;
  let ct = await depart(await load(await allocate(co.id, days[2]), 5));
  const cs = ct.stops[0].id;
  const old = outcome(ct, 5, 0, await upload(ct, co.id));
  await request(
    `/stops/${cs}/reschedule`,
    mutation({
      expectedPlanVersion: ct.planVersion,
      nextDate: days[3],
      reason: "Outlet reports closure",
    }),
  );
  const conflictBody = {
    actions: [{ kind: "OUTCOME", stopId: cs, request: old }],
  };
  const cr = (await request("/sync/actions", conflictBody, "driver"))
    .results[0];
  assert.equal(cr.status, "CONFLICT");
  assert.equal(await db.delivery.count({ where: { stopId: cs } }), 0);
  assert.equal(
    (await request("/sync/actions", conflictBody, "driver")).results[0]
      .conflictId,
    cr.conflictId,
  );
  await request(
    `/stops/${cs}/acknowledge-reschedule`,
    mutation({
      expectedPlanVersion: 2,
      returnedAt: new Date().toISOString(),
      lines: [{ orderLineId: co.lines[0].id, returnedQty: 5 }],
    }),
    "driver",
    "POST",
    409,
  );
  await request(
    `/sync/conflicts/${cr.conflictId}/resolve`,
    mutation({
      expectedVersion: 1,
      resolution: "ACCEPT_RECORDED_FACT",
      reason: "Receiver confirmed handover before closure",
    }),
  );
  const cd = (
    await request(`/orders/${co.id}/deliveries`, undefined, "store", "GET")
  ).items[0];
  await receipt(cd, 5);
  assert.equal(
    (await request(`/orders/${co.id}`, undefined, "store", "GET")).status,
    "RECEIVED",
  );
  assert.equal(
    await db.fieldConflict.count({
      where: { id: cr.conflictId, resolvedAt: { not: null } },
    }),
    1,
  );
  const arrivalConflict = (
    await request(
      "/sync/actions",
      {
        actions: [
          {
            kind: "ARRIVE",
            stopId: cs,
            request: mutation({
              expectedPlanVersion: 1,
              capturedAt: new Date().toISOString(),
            }),
          },
        ],
      },
      "driver",
    )
  ).results[0];
  assert.equal(arrivalConflict.status, "CONFLICT");
  assert.equal(
    (await request(`/orders/${co.id}`, undefined, "store", "GET")).status,
    "DELIVERED",
  );
  await request(
    `/sync/conflicts/${arrivalConflict.conflictId}/resolve`,
    mutation({
      expectedVersion: 1,
      resolution: "ACCEPT_RECORDED_FACT",
      reason: "Arrival belongs to this completed handover",
    }),
  );
  assert.equal(
    (await request(`/orders/${co.id}`, undefined, "store", "GET")).status,
    "RECEIVED",
  );
  // Photo/signature rules, foreign evidence, review gate and driver incidents.
  const eo = (
    await request(
      "/orders",
      mutation({
        requestedDate: days[4],
        temp: "CHILLED",
        lines: [{ catalogItemId: "CAT", requestedQty: 2 }],
      }),
      "store",
      "POST",
      201,
    )
  ).order;
  const et = await depart(await load(await allocate(eo.id, days[4]), 2)),
    es = et.stops[0].id;
  const foreignEvidence = await upload(et, eo.id, "store");
  await request(
    `/stops/${es}/outcome`,
    outcome(et, 2, 0, foreignEvidence),
    "driver",
    "POST",
    403,
  );
  const incident = mutation({
    tripId: et.id,
    stopId: es,
    expectedPlanVersion: et.planVersion,
    capturedAt: new Date().toISOString(),
    type: "DELAY",
    note: "Road traffic",
    photoRefs: [],
  });
  const incidentResult = await request(
    "/driver/issues",
    incident,
    "driver",
    "POST",
    201,
  );
  assert.deepEqual(
    await request("/driver/issues", incident, "driver", "POST", 201),
    incidentResult,
  );
  assert.equal(
    (await request(`/trips/${et.id}/issues`, undefined, "dispatcher", "GET"))
      .items.length,
    1,
  );
  const exception = outcome(et, 2, 0, null);
  exception.delivery.proof.signatureExceptionReason = "Receiver unable to sign";
  await request(`/stops/${es}/outcome`, exception, "driver", "POST", 422);
  exception.delivery.proof.photoRefs = [await upload(et, eo.id)];
  const ed = await request(
    `/stops/${es}/outcome`,
    exception,
    "driver",
    "POST",
    201,
  );
  assert.equal(ed.requiresDispatcherReview, true);
  await receipt(ed, 2);
  assert.notEqual(
    (await request(`/orders/${eo.id}`, undefined, "store", "GET")).status,
    "RECEIVED",
  );
  const reviewed = await request(
    `/deliveries/${ed.id}`,
    undefined,
    "dispatcher",
    "GET",
  );
  await request(
    `/deliveries/${ed.id}/review`,
    mutation({
      expectedVersion: reviewed.version,
      reason: "Receiver confirmed photo and exception",
    }),
  );
  assert.equal(
    (await request(`/orders/${eo.id}`, undefined, "store", "GET")).status,
    "RECEIVED",
  );
  const fo = (
    await request(
      "/orders",
      mutation({
        requestedDate: days[5],
        temp: "CHILLED",
        lines: [{ catalogItemId: "CAT", requestedQty: 1 }],
      }),
      "store",
      "POST",
      201,
    )
  ).order;
  const ft = await depart(await load(await allocate(fo.id, days[5]), 1)),
    fs = ft.stops[0].id;
  const failed = mutation({
    expectedPlanVersion: ft.planVersion,
    capturedAt: new Date().toISOString(),
    delivery: {
      outcome: "FAILED",
      reason: "Outlet closed",
      photoRefs: [],
      lines: [{ orderLineId: fo.lines[0].id, deliveredQty: 0, returnedQty: 1 }],
    },
  });
  await request(`/stops/${fs}/outcome`, failed, "driver", "POST", 422);
  failed.delivery.photoRefs = [await upload(ft, fo.id)];
  const fd = await request(
    `/stops/${fs}/outcome`,
    failed,
    "driver",
    "POST",
    201,
  );
  await request(
    `/deliveries/${fd.id}/confirm`,
    mutation({
      expectedDeliveryVersion: fd.version,
      lines: [
        {
          orderLineId: fo.lines[0].id,
          acceptedQty: 0,
          damagedQty: 0,
          missingQty: 0,
          note: null,
          photoRefs: [],
        },
      ],
    }),
    "store",
    "POST",
    422,
  );
  console.log(
    "PASS: foreign evidence denial, incident audit/replay, signature exception review gate, failed photo requirement and no-handover receipt denial.",
  );
  console.log(
    "PASS: connected four-role HTTP lifecycle, durable proof, 20→16→14+2, receipt arithmetic, retry→RECEIVED, idempotent offline replay, stale evidence capture and dispatcher reconciliation.",
  );
};
