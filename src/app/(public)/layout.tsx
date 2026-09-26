import { SiteGuide } from "@/components/guide/site-guide";
import { SafetyFooter } from "@/components/layout/safety-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SafetyFooter />
      <SiteGuide />
    </>
  );
}
