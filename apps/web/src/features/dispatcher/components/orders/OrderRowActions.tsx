import React from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonStyles } from '../ui/Button';
import { OverflowMenu, type OverflowItem } from '../ui/OverflowMenu';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Order } from '../../types/dispatch';

interface OrderRowActionsProps {
  order: Order;
  onPlan: (order: Order) => void;
  onDetails: (orderId: string) => void;
  onDefer: (orderId: string) => void;
  touch?: boolean;
}

export function OrderRowActions({ order, onPlan, onDetails, onDefer, touch = false }: OrderRowActionsProps) {
  const { tripForOrder, draft } = useDispatch();
  const trip = tripForOrder(order.id);
  const size = touch ? 'md' : 'sm';
  const grow = touch ? 'flex-1' : '';

  let main: React.ReactNode = null;
  if (order.status === 'pending') {
    main =
    <Button size={size} onClick={() => onPlan(order)} className={grow}>
        {draft.orderIds.includes(order.id) ? 'Continue Trip' : 'Plan Trip'}
      </Button>;

  } else if (trip) {
    main =
    <Link to={trip.status === 'loading' ? `/loading/${trip.id}` : `/monitoring/${trip.id}`} className={`${buttonStyles('secondary', size)} ${grow}`}>
        View Trip
      </Link>;

  }

  const items: OverflowItem[] = [{ label: 'View Details', onClick: () => onDetails(order.id) }];
  if (order.status === 'pending' || order.status === 'allocated' || order.status === 'in_transit') items.push({ label: 'Defer Order', onClick: () => onDefer(order.id), danger: true });

  return (
    <div className="flex items-center justify-end gap-1">
      {main}
      <OverflowMenu label={`More actions for ${order.id}`} items={items} />
    </div>);

}