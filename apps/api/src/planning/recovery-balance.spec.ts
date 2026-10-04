import { recoveryBalance, type RecoveryDelivery } from './recovery-balance';
function delivery(): RecoveryDelivery {
  return {
    outcome: 'PARTIAL',
    stop: { lines: [{ orderLineId: 'L', plannedQty: 20, cancelledQty: 4, loadedQty: 16, deliveredQty: 14, returnedQty: 2 }] },
    receipt: { status: 'CONFIRMED', confirmedAt: new Date(), lines: [{ orderLineId: 'L', acceptedQty: 14, damagedQty: 0, missingQty: 0 }] },
    recoveryDecisions: [],
  } as unknown as RecoveryDelivery;
}
describe('per-attempt recovery accounting', () => {
  it('recovers only returned2, never cancelled4', () => { expect(recoveryBalance(delivery())).toEqual([{ orderLineId: 'L', qty: 2 }]); });
  it('adds verified receipt discrepancies within the separate handover count', () => {
    const d = delivery(); d.receipt!.status = 'CONFIRMED_WITH_ISSUE'; d.receipt!.lines[0].acceptedQty = 13; d.receipt!.lines[0].damagedQty = 1;
    expect(recoveryBalance(d)).toEqual([{ orderLineId: 'L', qty: 3 }]);
  });
  it('rejects counting returned goods again as damage in the receipt', () => {
    const d = delivery(); d.receipt!.lines[0].damagedQty = 2;
    expect(() => recoveryBalance(d)).toThrow();
  });
  it('deducts both prior closed and redelivery decisions', () => {
    const d = delivery(); d.recoveryDecisions = [
      { decision: { action: 'REDELIVER', lines: [{ orderLineId: 'L', qty: 1 }] } },
      { decision: { action: 'CLOSE_WITHOUT_REDELIVERY', lines: [{ orderLineId: 'L', qty: 1 }] } },
    ] as unknown as RecoveryDelivery['recoveryDecisions'];
    expect(recoveryBalance(d)).toEqual([{ orderLineId: 'L', qty: 0 }]);
  });
  it('allows deciding returned quantities before receipt, without inventing discrepancies', () => {
    const d = delivery(); d.receipt = null; expect(recoveryBalance(d)).toEqual([{ orderLineId: 'L', qty: 2 }]);
  });
  it('rejects inconsistent actuals and an overdrawn historical recovery', () => {
    const d = delivery(); d.stop.lines[0].returnedQty = 3; expect(() => recoveryBalance(d)).toThrow();
    d.stop.lines[0].returnedQty = 2; d.recoveryDecisions = [{ decision: { action: 'REDELIVER', lines: [{ orderLineId: 'L', qty: 3 }] } }] as unknown as RecoveryDelivery['recoveryDecisions'];
    expect(() => recoveryBalance(d)).toThrow();
  });
});
