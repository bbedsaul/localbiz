import { requireBusiness, moduleFor } from '@/modules/context';
import { ModuleTabs } from '@/components/dashboard/ModuleTabs';
import { UpsellPage } from '@/components/dashboard/UpsellPage';

export default async function ServiceSettings({ params }: { params: { service: string } }) {
  const business = await requireBusiness();
  const mod = moduleFor(params.service);
  if (!mod.entitled(business)) return <UpsellPage module={mod} />;
  return (
    <>
      <ModuleTabs module={mod} active="settings" />
      {await mod.pages.Settings({ business })}
    </>
  );
}
