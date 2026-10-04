import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { NewOrderInput, Order } from '../types/orders';
import { seedOrders } from '../data/orders';
import { nextOrderId } from '../utils/orders';
interface OrdersContextValue {
  orders: Order[];
  getOrder: (id: string | undefined) => Order | undefined;
  addOrder: (input: NewOrderInput) => Order;
  updateOrder: (id: string, patch: Partial<Order>) => void;
}
const OrdersContext = createContext<OrdersContextValue | null>(null);
export function OrdersProvider({
  children


}: {children: ReactNode;}) {
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const getOrder = useCallback((id: string | undefined) => orders.find((o) => o.id === id), [orders]);
  const addOrder = useCallback((input: NewOrderInput) => {
    const time = input.submittedAt.replace('Today, ', '');
    const order: Order = {
      ...input,
      id: nextOrderId(orders),
      status: 'confirmed',
      events: {
        placed: time,
        confirmed: time
      }
    };
    setOrders((prev) => [order, ...prev]);
    return order;
  }, [orders]);
  const updateOrder = useCallback((id: string, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => o.id === id ? {
      ...o,
      ...patch
    } : o));
  }, []);
  const value = useMemo(() => ({
    orders,
    getOrder,
    addOrder,
    updateOrder
  }), [orders, getOrder, addOrder, updateOrder]);
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}
export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used inside OrdersProvider');
  return ctx;
}