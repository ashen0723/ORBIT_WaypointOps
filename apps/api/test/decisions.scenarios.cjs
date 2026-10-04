const assert = require('node:assert/strict');
/** Delivery/receipt fixtures stand in for those separate owners' unfinished write endpoints. */
module.exports = async function decisionsScenarios({ db, request, base, tokens }) {
  let key = 0;
  const action = () => `decision-test-${++key}`;
  await db.vehicle.update({ where: { id: 'V' }, data: { weeklyFuelQuotaL: 1000 } });
  for (const day of ['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23']) await db.operatingDay.upsert({ where: { date: new Date(day) }, update: {}, create: { date: new Date(day), operating: true } });
  const passwordHash = (await db.user.findUnique({ where: { id: 'loader' } })).passwordHash;
  for (const [id, role, outletId] of [['store', 'STORE_MANAGER', 'A'], ['foreign-store', 'STORE_MANAGER', null], ['foreign-driver', 'DRIVER', null]]) {
    await db.user.create({ data: { id, email: `${id}@test`, name: id, role, outletId, passwordHash } });
    tokens[id] = (await request('/auth/login', { email: `${id}@test`, password: 'test-password' })).token;
  }
  async function order(id, day) { return db.order.create({ data: { id, outletId: 'A', createdById: 'dispatcher', requestedDate: new Date(day), temp: 'CHILLED', units: 20, weightKg: 40, volumeM3: 4, lines: { create: { id: `${id}-line`, item: 'Box', unit: 'box', requestedQty: 20, unitWeightKg: 2, unitVolumeM3: 0.2 } } } }); }
  async function allocate(id, day, expected = 201) {
    const plan = { date: day, vehicleId: 'V', depotId: 'D', plannedDeparture: '05:00', orderIds: [id] };
    const draft = await request('/planning/drafts', { clientActionId: action(), plan }, 'dispatcher', 'POST', 201);
    return request('/planning/allocate', { clientActionId: action(), draftId: draft.id, expectedDraftVersion: draft.version }, 'dispatcher', 'POST', expected);
  }
  async function published(id, day) {
    await order(id, day);
    const { trip } = await allocate(id, day);
    return (await request('/plans/publish', { clientActionId: action(), trips: [{ tripId: trip.id, expectedPlanVersion: trip.planVersion }] })).trips[0];
  }
  async function startAndLoad(trip, id, loadedQty) {
    await request(`/loading/${trip.id}/start`, { clientActionId: action(), expectedPlanVersion: trip.planVersion }, 'loader');
    return request(`/loading/${trip.id}/lines/${id}-line`, { clientActionId: action(), expectedPlanVersion: trip.planVersion, expectedVersion: trip.stops[0].lines[0].version, loadedQty }, 'loader', 'PATCH');
  }
  async function issueFor(trip, id, availableQty) {
    return request(`/loading/${trip.id}/issues`, { clientActionId: action(), expectedPlanVersion: trip.planVersion, orderLineId: `${id}-line`, type: 'MISSING', availableQty, note: 'Stock shortage', photoRefs: [] }, 'loader', 'POST', 201);
  }
  async function deliveryFixture(trip, id, deliveredQty, returnedQty, receipt = true) {
    const stopId = trip.stops[0].id;
    await db.trip.update({ where: { id: trip.id }, data: { status: 'COMPLETED_WITH_EXCEPTIONS', committedFuelL: trip.reservedFuelL, reservedFuelL: 0 } });
    const outcome = deliveredQty === 0 ? 'FAILED' : returnedQty > 0 ? 'PARTIAL' : 'DELIVERED';
    await db.tripStop.update({ where: { id: stopId }, data: { status: outcome, active: false } });
    await db.tripStopLine.updateMany({ where: { stopId }, data: { deliveredQty, returnedQty, loadedQty: deliveredQty + returnedQty } });
    await db.order.update({ where: { id }, data: { status: 'DELIVERED', recoveryPending: returnedQty > 0 } });
    const delivery = await db.delivery.create({ data: { stopId, outcome, completedAt: new Date() } });
    if (receipt && deliveredQty > 0) await db.receipt.create({ data: { deliveryId: delivery.id, confirmedById: 'store', status: 'CONFIRMED', confirmedAt: new Date(), lines: { create: { orderLineId: `${id}-line`, acceptedQty: deliveredQty, damagedQty: 0, missingQty: 0, photoRefs: [] } } } });
    return delivery;
  }
  // 20 requested → warehouse cancellation 4 → load16 → accepted14/returned2.
  const initial = await published('SHORT', '2026-10-12');
  await startAndLoad(initial, 'SHORT', 16);
  const issue = await issueFor(initial, 'SHORT', 16);
  const decisionBody = { clientActionId: action(), expectedVersion: issue.version, expectedPlanVersion: initial.planVersion, decision: { action: 'SHIP_SHORT', approvedLoadedQty: 16, reason: 'Cancel four unavailable cartons' } };
  await request(`/loading/issues/${issue.id}/decision`, decisionBody, 'loader', 'POST', 403);
  await request(`/loading/issues/${issue.id}/decision`, { ...decisionBody, clientActionId: action(), decision: { ...decisionBody.decision, approvedLoadedQty: 17 } }, 'dispatcher', 'POST', 422);
  const short = await request(`/loading/issues/${issue.id}/decision`, decisionBody);
  assert.equal(short.cancelledQty, 4); assert.equal(short.planVersion, 2);
  assert.deepEqual(await request(`/loading/issues/${issue.id}/decision`, decisionBody), short);
  await request(`/loading/issues/${issue.id}/decision`, { ...decisionBody, clientActionId: action(), expectedVersion: short.version, expectedPlanVersion: 2 }, 'dispatcher', 'POST', 409);
  assert.equal(await db.quantityCancellation.count({ where: { loadingIssueId: issue.id } }), 1);
  assert.equal((await db.orderLine.findUnique({ where: { id: 'SHORT-line' } })).requestedQty, 20);
  const loading = await request(`/trips/${initial.id}/loading`, undefined, 'loader', 'GET');
  assert.equal(loading.trip.totalWeightKg, 32); assert.equal(loading.trip.totalVolumeM3, 3.2);
  await request(`/loading/issues/${issue.id}/acknowledge`, { clientActionId: action(), expectedVersion: short.version, expectedPlanVersion: 1 }, 'loader', 'POST', 409);
  await request(`/loading/issues/${issue.id}/acknowledge`, { clientActionId: action(), expectedVersion: short.version, expectedPlanVersion: 2 }, 'other-loader', 'POST', 403);
  await request(`/loading/issues/${issue.id}/acknowledge`, { clientActionId: action(), expectedVersion: short.version, expectedPlanVersion: 2 }, 'loader');
  await request(`/trips/${initial.id}/ready`, { clientActionId: action(), expectedPlanVersion: 2 }, 'loader', 'POST', 409);
  await request(`/trips/${initial.id}/acknowledge-plan`, { clientActionId: action(), expectedPlanVersion: 2 }, 'loader');
  await request(`/trips/${initial.id}/ready`, { clientActionId: action(), expectedPlanVersion: 2 }, 'loader');
  const source = await deliveryFixture(initial, 'SHORT', 14, 2);
  const recoveryBody = { clientActionId: action(), expectedVersion: source.version, decision: { action: 'REDELIVER', nextDate: '2026-10-13', reason: 'Replace two returned cartons', lines: [{ orderLineId: 'SHORT-line', qty: 2 }] } };
  await request(`/deliveries/${source.id}/recovery`, recoveryBody, 'loader', 'POST', 403);
  await request(`/deliveries/${source.id}/recovery`, { ...recoveryBody, clientActionId: action(), decision: { ...recoveryBody.decision, lines: [{ orderLineId: 'SHORT-line', qty: 6 }] } }, 'dispatcher', 'POST', 422);
  const recovery = await request(`/deliveries/${source.id}/recovery`, recoveryBody, 'dispatcher', 'POST', 201);
  assert.deepEqual(await request(`/deliveries/${source.id}/recovery`, recoveryBody, 'dispatcher', 'POST', 201), recovery);
  await request(`/deliveries/${source.id}/recovery`, { ...recoveryBody, clientActionId: action(), expectedVersion: recovery.sourceDeliveryVersion }, 'dispatcher', 'POST', 422);
  assert.equal((await db.order.findUnique({ where: { id: 'SHORT' } })).status, 'DEFERRED');
  let retry = (await allocate('SHORT', '2026-10-13')).trip;
  assert.equal(retry.stops[0].lines[0].plannedQty, 2); assert.equal(retry.totalWeightKg, 4); assert.equal(retry.totalVolumeM3, 0.4);
  assert.equal((await db.recoveryDecision.findUnique({ where: { id: recovery.id } })).retryStopId, retry.stops[0].id);
  // Release and reallocate a retry: authorization stays at2, never expands back to20.
  await request(`/trips/${retry.id}/release`, { clientActionId: action(), expectedPlanVersion: retry.planVersion, reason: 'Change trip' });
  retry = (await allocate('SHORT', '2026-10-13')).trip;
  assert.equal(retry.stops[0].lines[0].plannedQty, 2);
  const retryDelivery = await deliveryFixture(retry, 'SHORT', 0, 2, false);
  await request(`/deliveries/${retryDelivery.id}/recovery`, { clientActionId: action(), expectedVersion: 1, decision: { action: 'CLOSE_WITHOUT_REDELIVERY', reason: 'Dispatcher closes remaining two', lines: [{ orderLineId: 'SHORT-line', qty: 2 }] } }, 'dispatcher', 'POST', 201);
  const closed = await db.order.findUnique({ where: { id: 'SHORT' } });
  assert.equal(closed.status, 'RECEIVED'); assert.equal(closed.recoveryPending, false);
  assert.equal((await db.orderLine.findUnique({ where: { id: 'SHORT-line' } })).cancelledQty, 4);
  assert.equal(await db.tripStop.count({ where: { orderId: 'SHORT' } }), 3);
  // Replacement required keeps cancellation at zero and cannot resolve until the goods are checked.
  const replacement = await published('REPLACE', '2026-10-14');
  await startAndLoad(replacement, 'REPLACE', 16);
  const ri = await issueFor(replacement, 'REPLACE', 16);
  const rd = await request(`/loading/issues/${ri.id}/decision`, { clientActionId: action(), expectedPlanVersion: 1, expectedVersion: 1, decision: { action: 'REPLACEMENT_REQUIRED', reason: 'Fetch replacement stock' } });
  assert.equal(rd.status, 'OPEN'); assert.equal(rd.cancelledQty, 0);
  await request(`/loading/issues/${ri.id}/acknowledge`, { clientActionId: action(), expectedPlanVersion: 1, expectedVersion: rd.version }, 'loader', 'POST', 409);
  const rl = (await request(`/trips/${replacement.id}/loading`, undefined, 'loader', 'GET')).trip.stops[0].lines[0];
  await request(`/loading/${replacement.id}/lines/REPLACE-line`, { clientActionId: action(), expectedPlanVersion: 1, expectedVersion: rl.version, loadedQty: 20 }, 'loader', 'PATCH');
  await request(`/loading/issues/${ri.id}/acknowledge`, { clientActionId: action(), expectedPlanVersion: 1, expectedVersion: rd.version }, 'loader');
  assert.equal(await db.quantityCancellation.count({ where: { orderLineId: 'REPLACE-line' } }), 0);
  const replacementLine = (await request(`/trips/${replacement.id}/loading`, undefined, 'loader', 'GET')).trip.stops[0].lines[0];
  await request(`/loading/${replacement.id}/lines/REPLACE-line`, { clientActionId: action(), expectedPlanVersion: 1, expectedVersion: replacementLine.version, loadedQty: 0 }, 'loader', 'PATCH');
  const zero = await issueFor(replacement, 'REPLACE', 0);
  await request(`/loading/issues/${zero.id}/decision`, { clientActionId: action(), expectedPlanVersion: 1, expectedVersion: zero.version, decision: { action: 'SHIP_SHORT', approvedLoadedQty: 0, reason: 'Cannot load any' } }, 'dispatcher', 'POST', 422);
  assert.equal((await db.orderLine.findUnique({ where: { id: 'REPLACE-line' } })).cancelledQty, 0);
  // Deferral is versioned, audited, outlet-scoped, and cannot steal an active allocation.
  const deferred = await order('DEFER', '2026-10-15');
  const deferBody = { clientActionId: action(), orderId: deferred.id, expectedVersion: 1, nextDate: '2026-10-16', reason: 'Outlet requested later run' };
  const dr = await request('/planning/defer', deferBody);
  assert.equal(dr.order.deferralCount, 1); assert.equal(dr.order.status, 'DEFERRED');
  assert.deepEqual(await request('/planning/defer', deferBody), dr);
  await request('/planning/defer', { ...deferBody, clientActionId: action() }, 'dispatcher', 'POST', 409);
  const history = await request('/orders/DEFER/deferrals', undefined, 'store', 'GET');
  assert.equal(history.items.length, 1); assert.equal(history.items[0].actorId, 'dispatcher');
  await request('/orders/DEFER/deferrals', undefined, 'foreign-store', 'GET', 403);
  await allocate('DEFER', '2026-10-15', 422);
  const assignedDeferred = (await allocate('DEFER', '2026-10-16')).trip;
  const before = await db.order.findUnique({ where: { id: 'DEFER' } });
  await request('/planning/defer', { clientActionId: action(), orderId: 'DEFER', expectedVersion: before.version, nextDate: '2026-10-19', reason: 'Unsafe direct defer' }, 'dispatcher', 'POST', 409);
  assert.equal(await db.tripStop.count({ where: { tripId: assignedDeferred.id, active: true } }), 1);
  // In-transit reschedule keeps assignment/fuel until every loaded unit is returned.
  const rescheduled = await published('RESCHEDULE', '2026-10-19');
  await startAndLoad(rescheduled, 'RESCHEDULE', 20);
  await db.trip.update({ where: { id: rescheduled.id }, data: { status: 'IN_TRANSIT', committedFuelL: rescheduled.reservedFuelL, reservedFuelL: 0 } });
  await db.order.update({ where: { id: 'RESCHEDULE' }, data: { status: 'IN_TRANSIT' } });
  const sid = rescheduled.stops[0].id;
  const rsBody = { clientActionId: action(), expectedPlanVersion: 1, nextDate: '2026-10-20', reason: 'Outlet unexpectedly closed' };
  const rs = await request(`/stops/${sid}/reschedule`, rsBody);
  assert.equal(rs.planVersion, 2); assert.equal(rs.stops[0].status, 'PLANNED');
  assert.deepEqual(await request(`/stops/${sid}/reschedule`, rsBody), rs);
  assert.equal((await db.tripStop.findUnique({ where: { id: sid } })).active, true);
  await allocate('RESCHEDULE', '2026-10-20', 422);
  const ack = { clientActionId: action(), expectedPlanVersion: 2, returnedAt: new Date().toISOString(), lines: [{ orderLineId: 'RESCHEDULE-line', returnedQty: 20 }] };
  await request(`/stops/${sid}/acknowledge-reschedule`, ack, 'foreign-driver', 'POST', 403);
  await request(`/stops/${sid}/acknowledge-reschedule`, { ...ack, clientActionId: action(), expectedPlanVersion: 1 }, 'driver', 'POST', 409);
  await request(`/stops/${sid}/acknowledge-reschedule`, { ...ack, clientActionId: action(), lines: [{ orderLineId: 'RESCHEDULE-line', returnedQty: 19 }] }, 'driver', 'POST', 422);
  const conflict = await db.fieldConflict.create({ data: { userId: 'driver', clientActionId: action(), currentPlanVersion: 2, action: { kind: 'OUTCOME', stopId: sid, request: {} } } });
  await request(`/stops/${sid}/acknowledge-reschedule`, ack, 'driver', 'POST', 409);
  await db.fieldConflict.update({ where: { id: conflict.id }, data: { resolvedAt: new Date(), resolution: { reason: 'Test fixture reconciliation' } } });
  const returned = await request(`/stops/${sid}/acknowledge-reschedule`, ack, 'driver');
  assert.equal(returned.stops[0].status, 'RESCHEDULED'); assert.equal(returned.status, 'COMPLETED_WITH_EXCEPTIONS');
  assert.deepEqual(await request(`/stops/${sid}/acknowledge-reschedule`, ack, 'driver'), returned);
  assert.equal((await db.trip.findUnique({ where: { id: rescheduled.id } })).committedFuelL, 10);
  assert.equal((await db.order.findUnique({ where: { id: 'RESCHEDULE' } })).deferralCount, 1);
  assert.equal((await request('/orders/RESCHEDULE/deferrals', undefined, 'store', 'GET')).items.length, 1);
  const next = (await allocate('RESCHEDULE', '2026-10-20')).trip;
  assert.equal(next.stops[0].lines[0].plannedQty, 20); assert.notEqual(next.stops[0].id, sid);
  await request(`/stops/${initial.stops[0].id}/reschedule`, { ...rsBody, clientActionId: action(), expectedPlanVersion: 2 }, 'dispatcher', 'POST', 409);
  // Receipt damage is separate from returned goods and is approved explicitly by Dispatcher recovery.
  const disputed = await published('DISCREPANCY', '2026-10-21');
  const disputeDelivery = await deliveryFixture(disputed, 'DISCREPANCY', 20, 0);
  const receipt = await db.receipt.findUnique({ where: { deliveryId: disputeDelivery.id } });
  await db.receipt.update({ where: { id: receipt.id }, data: { status: 'CONFIRMED_WITH_ISSUE' } });
  await db.receiptLine.updateMany({ where: { receiptId: receipt.id }, data: { acceptedQty: 18, damagedQty: 2 } });
  const closeBody = { clientActionId: action(), expectedVersion: 1, decision: { action: 'CLOSE_WITHOUT_REDELIVERY', lines: [{ orderLineId: 'DISCREPANCY-line', qty: 2 }], reason: 'Verified receipt damage, close two' } };
  const raceResults = await Promise.all([closeBody, { ...closeBody, clientActionId: action() }].map(body => fetch(`${base}/api/deliveries/${disputeDelivery.id}/recovery`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.dispatcher}` }, body: JSON.stringify(body) })));
  assert.equal(raceResults.filter(r => r.status === 201).length, 1);
  assert.equal(raceResults.filter(r => r.status === 409).length, 1);
  for (const r of raceResults) await r.json();
  assert.equal(await db.recoveryDecision.count({ where: { sourceDeliveryId: disputeDelivery.id } }), 1);
  assert.equal((await db.order.findUnique({ where: { id: 'DISCREPANCY' } })).status, 'RECEIVED');
  // Rescheduling an approved short load restores only16, not the original20 or cancelled4.
  const shortReturn = await published('SHORT-RETURN', '2026-10-22');
  await startAndLoad(shortReturn, 'SHORT-RETURN', 16);
  const sri = await issueFor(shortReturn, 'SHORT-RETURN', 16);
  const srd = await request(`/loading/issues/${sri.id}/decision`, { clientActionId: action(), expectedPlanVersion: 1, expectedVersion: sri.version, decision: { action: 'SHIP_SHORT', approvedLoadedQty: 16, reason: 'Only16 in stock' } });
  await request(`/loading/issues/${sri.id}/acknowledge`, { clientActionId: action(), expectedPlanVersion: 2, expectedVersion: srd.version }, 'loader');
  await request(`/trips/${shortReturn.id}/acknowledge-plan`, { clientActionId: action(), expectedPlanVersion: 2 }, 'loader');
  await request(`/trips/${shortReturn.id}/ready`, { clientActionId: action(), expectedPlanVersion: 2 }, 'loader');
  await db.trip.update({ where: { id: shortReturn.id }, data: { status: 'IN_TRANSIT', committedFuelL: 10, reservedFuelL: 0 } });
  await db.order.update({ where: { id: 'SHORT-RETURN' }, data: { status: 'IN_TRANSIT' } });
  const srid = shortReturn.stops[0].id;
  await request(`/stops/${srid}/reschedule`, { clientActionId: action(), expectedPlanVersion: 2, nextDate: '2026-10-23', reason: 'Receiving bay closed' });
  await request(`/stops/${srid}/acknowledge-reschedule`, { clientActionId: action(), expectedPlanVersion: 3, returnedAt: new Date().toISOString(), lines: [{ orderLineId: 'SHORT-RETURN-line', returnedQty: 16 }] }, 'driver');
  const srRetry = (await allocate('SHORT-RETURN', '2026-10-23')).trip;
  assert.equal(srRetry.stops[0].lines[0].plannedQty, 16);
  assert.equal((await db.orderLine.findUnique({ where: { id: 'SHORT-RETURN-line' } })).cancelledQty, 4);
  console.log('PASS: shortfall cancellation/replacement, approved retry-only allocation, receipt discrepancy recovery, deferral history/scopes, reschedule return/conflict gates, concurrent recovery and replay protection.');
};
