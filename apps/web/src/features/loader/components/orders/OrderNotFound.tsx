import React from 'react';
import { Link } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { buttonStyles } from '../ui/Button';
import { PageContainer } from '../ui/PageContainer';
export function OrderNotFound() {
  return <PageContainer>
      <Card className="mx-auto max-w-[480px] p-8 text-center">
        <SearchXIcon aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />
        <h1 className="mt-4 text-xl font-semibold text-ink">Order not found</h1>
        <p className="mt-2 text-subtle">This order ID doesn’t match any order for your outlet.</p>
        <Link to="/" className={`${buttonStyles('primary', 'md')} mt-6`}>
          Back to Orders
        </Link>
      </Card>
    </PageContainer>;
}