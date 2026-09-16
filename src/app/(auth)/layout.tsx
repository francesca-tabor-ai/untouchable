import { SafetyFooter } from "@/components/layout/safety-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/ui/container";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Container reading className="py-12 sm:py-20">
          {children}
        </Container>
      </main>
      <SafetyFooter />
    </>
  );
}
