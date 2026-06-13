import { ManageBillingButton } from '@/components/dashboard/ManageBillingButton';
import { getPrimaryBusiness } from '@/lib/dashboard';

const PLAN_LABEL: Record<string, string> = { solo: 'Solo', pro: 'Pro', multi: 'Multi' };
const PLAN_PRICE: Record<string, number> = { solo: 29, pro: 49, multi: 99 };

export default async function BillingPage() {
  const business = (await getPrimaryBusiness())!;
  const status = business.subscription_status ?? 'trialing';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Billing</h1>
        <p className="text-ink-faint">Manage your plan, card, and invoices.</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-faint">Current plan</p>
            <p className="text-xl font-bold text-ink">
              {PLAN_LABEL[business.plan]} · ${PLAN_PRICE[business.plan]}/mo
            </p>
            <p className="mt-1 text-sm capitalize text-ink-soft">
              {status === 'trialing' ? 'Free trial' : status}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <ManageBillingButton businessId={business.id} />
        </div>
      </div>
    </div>
  );
}
