import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogItem, NewOrderInput, Order } from '../types/orders';
import type { ReceiptQuantityLine } from '../api/storeApi';
import { fetchStoreContext, type StoreContext, confirmReceipt as postReceipt, createOrder, fetchCatalog, fetchOrders } from '../api/storeApi';
import { ApiError } from '../../../api/client';
import { useAuth } from '../../../app/providers/AuthProvider';
import { catalog as demoCatalog } from '../data/catalog';
import { seedOrders } from '../data/orders';
import { nextOrderId } from '../utils/orders';

const live = true;

interface OrdersContextValue {
  orders: Order[];
  store: StoreContext | null;
  catalog: CatalogItem[];
  live: boolean;
  loading: boolean;
  error: string | null;
  getOrder: (id: string | undefined) => Order | undefined;
  addOrder: (input: NewOrderInput, clientActionId?: string) => Promise<Order>;
  confirmReceipt: (order: Order, lines: ReceiptQuantityLine[], clientActionId?: string) => Promise<void>;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  refresh: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { token, expire } = useAuth();
  const loaded = useRef(false), refreshing = useRef(false);
  const [store, setStore] = useState<StoreContext | null>(null);
  const [orders, setOrders] = useState<Order[]>(live ? [] : seedOrders);
  const [catalog, setCatalog] = useState<CatalogItem[]>(live ? [] : demoCatalog);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!live) return;
    if (!token) { setError('Sign in again to load Store orders.'); setLoading(false); return; }
    if (refreshing.current) return;
    refreshing.current = true;
    if (!loaded.current) setLoading(true);
    try {
      const context = await fetchStoreContext(token);
      setStore(context);
      const [nextCatalog, nextOrders] = await Promise.all([fetchCatalog(token, context.brand), fetchOrders(token)]);
      setCatalog(nextCatalog);
      setOrders(nextOrders);
      loaded.current = true;
      setError(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) expire(token);
      setError(cause instanceof Error ? cause.message : 'Could not load Store orders.');
    } finally { refreshing.current = false; setLoading(false); }
  }, [token, expire]);

  useEffect(() => {
    void refresh();
    if (!live) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const getOrder = useCallback((id: string | undefined) => orders.find(order => order.id === id), [orders]);

  const addOrder = useCallback(async (input: NewOrderInput, clientActionId?: string) => {
    if (live) {
      if (!token) throw new Error('Sign in again before placing an order.');
      if (!clientActionId) throw new Error('Missing order action ID.');
      const saved = await createOrder(token, input, catalog, clientActionId);
      setOrders(previous => [saved, ...previous.filter(order => order.id !== saved.id)]);
      return saved;
    }
    const time = input.submittedAt.replace('Today, ', '');
    const order: Order = { ...input, id: nextOrderId(orders), status: 'confirmed', events: { placed: time, confirmed: time } };
    setOrders(previous => [order, ...previous]);
    return order;
  }, [token, catalog, orders]);

  const updateOrder = useCallback((id: string, patch: Partial<Order>) => {
    setOrders(previous => previous.map(order => order.id === id ? { ...order, ...patch } : order));
  }, []);

  const confirmReceipt = useCallback(async (order: Order, lines: ReceiptQuantityLine[], clientActionId?: string) => {
    if (live) {
      if (!token || !order.deliveryId || !order.deliveryVersion || !clientActionId) throw new Error('Delivery details are not ready. Refresh and try again.');
      await postReceipt(token, order.deliveryId, order.deliveryVersion, lines, clientActionId);
      await refresh();
      return;
    }
    updateOrder(order.id, { status: 'receipt_confirmed', events: { ...order.events, receipt_confirmed: new Date().toLocaleTimeString('en-LK', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' }) } });
  }, [token, refresh, updateOrder]);

  const value = useMemo(() => ({ orders, store, catalog, live, loading, error, getOrder, addOrder, confirmReceipt, updateOrder, refresh }), [orders, store, catalog, loading, error, getOrder, addOrder, confirmReceipt, updateOrder, refresh]);
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersContextValue {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders must be used inside OrdersProvider');
  return context;
}
