export type LoaderQueueStatus =
  | 'ready'
  | 'in_progress'
  | 'waiting'
  | 'plan_updated'
  | 'completed'
  | 'ready_to_load'
  | 'loading'
  | 'awaiting_dispatcher'
  | 'action_required'
  | 'ready_to_depart'
  | 'loading_completed';

export type LoaderIssueType = 'missing' | 'damaged';

export type LoaderIssueResolution =
  | 'open'
  | 'replacement_loaded'
  | 'ship_short'
  | 'resolved';

export interface LoadItem {
  id: string;

  /**
   * This should eventually contain the real OrderLine.id returned
   * by the backend. `id` is kept for compatibility with the
   * current prototype while the UI is being migrated.
   */
  orderLineId?: string;

  name: string;
  expected: number;
  loaded: number;
  unit: string;
  condition: 'ambient' | 'chilled';

  /**
   * Optional real availability returned by the backend.
   * Do not hardcode this in the UI.
   */
  availableQuantity?: number;

  /**
   * Temporary compatibility field used by the current prototype.
   * Remove once all Loader pages use backend/API data.
   */
  maxAvailable?: number;
}

export interface LoadOrder {
  id: string;
  outletId: string;
  outletName: string;
  location: string;
  stop: number;

  tripStopId?: string;

  weightKg?: number;
  volumeM3?: number;

  items: LoadItem[];
}

export interface LoadStop {
  number: number;

  /**
   * Real TripStop.id once the backend is connected.
   */
  id?: string;

  outletId: string;
  outletName: string;
  location: string;
  orderIds: string[];
  conditions: string;

  eta?: string;
}

export interface LoadQueueItem {
  /**
   * Main identifier for Loader workflow.
   * A vehicle can run more than one trip, therefore the vehicle ID
   * must not be used as the loading-job identifier.
   */
  tripId?: string;

  vehicleId: string;

  /**
   * Temporary display label such as "Trip 1".
   */
  trip: string;

  brand: string;
  departure: string;
  stops: number;
  status: LoaderQueueStatus;

  priority: 'High' | 'Standard';
  priorityReason?: string;

  vehicleType: 'Truck' | 'Van';
  temperature: 'Reefer' | 'Ambient';

  district: string;
  orderCount: number;

  /**
   * The current prototype uses these fields.
   * When the backend is connected, planned totals and actual loaded
   * totals should be clearly separated.
   */
  loadedWeightKg: number;
  weightCapacityKg: number;
  loadedVolumeM3: number;
  volumeCapacityM3: number;

  planVersion?: number;
  planUpdatedAt?: string;
  requiresPlanAcknowledgement?: boolean;

  updateMessage?: string;
}

export interface LoaderIssueTarget {
  tripId?: string;
  orderLineId?: string;

  orderId: string;
  outletId: string;

  itemId: string;
  itemName: string;

  expected: number;
  unit: string;
}

export interface LoaderIssue extends LoaderIssueTarget {
  issueId?: string;

  /**
   * Temporary compatibility field used by the existing Loader UI.
   */
  reported: boolean;

  type: LoaderIssueType;

  /**
   * Quantity currently considered good/available for loading.
   */
  loaded: number;

  note: string;
  photoAttached: boolean;

  /**
   * Legacy prototype field.
   * Dispatcher decisions must eventually come from backend data
   * instead of the Loader changing this value locally.
   */
  decisionReceived: boolean;

  resolution?: LoaderIssueResolution;

  damagedQuantity?: number;

  /**
   * Yes means enough identical replacement units are available
   * to replace the complete damaged quantity.
   */
  replacementAvailable?: boolean;

  replacementQuantity?: number;

  /**
   * Used when Dispatcher approves a SHIP_SHORT decision.
   */
  approvedShipQuantity?: number;

  /**
   * According to the agreed Waypoint rule, the remaining quantity
   * is cancelled rather than automatically carried forward.
   */
  cancelledQuantity?: number;

  cancellationReason?: string;

  dispatcherDecision?: string;
  dispatcherDecisionAt?: string;
}
