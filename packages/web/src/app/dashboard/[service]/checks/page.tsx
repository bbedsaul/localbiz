import { notFound } from 'next/navigation';
import { requireBusiness, moduleFor } from '@/modules/context';
import { ModuleTabs } from '@/components/dashboard/ModuleTabs';
import { UpsellPage } from '@/components/dashboard/UpsellPage';

export default async function ServiceChecks({ params }: { params: { service: string } }) {
  const business = await requireBusiness();
  const mod = moduleFor(params.service);
  if (!mod.entitled(business)) return <UpsellPage module={mod} />;
  const Checks = mod.pages.Checks;
  if (!Checks) notFound();
  return (
    <>
      <ModuleTabs module={mod} active="checks" />
      {await Checks({ business })}
    </>
  );
}
