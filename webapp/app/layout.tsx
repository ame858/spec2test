import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/archivo";
import "@fontsource/jetbrains-mono/400.css";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";
import { AppProviders } from "@/components/AppProviders";
import { CaseDrawer } from "@/components/CaseDrawer";
import { CopilotProvider } from "@/components/CopilotProvider";
import { PageTransition } from "@/components/PageTransition";
import { QuickNav } from "@/components/QuickNav";

export const metadata: Metadata = {
  title: "VeriSpec",
  description: "VeriSpec · 把 3GPP 测试条款编译成可校验的测试意图",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="h-full">
        <AppProviders>
          <CopilotProvider>
            <div className="flex h-full flex-col">
              <main className="min-h-0 flex-1 overflow-hidden">
                <PageTransition>{children}</PageTransition>
              </main>
              <QuickNav />
            </div>
            <CaseDrawer />
          </CopilotProvider>
        </AppProviders>
      </body>
    </html>
  );
}
