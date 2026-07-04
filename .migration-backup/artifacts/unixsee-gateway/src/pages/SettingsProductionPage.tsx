import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { Server, MapPin, Database, Cpu, MemoryStick, HardDrive, AlertTriangle, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const productionConfig = {
  region: "ir-teh-1",
  backupRegion: "eu-west-1",
  dbConnectionPool: 50,
  maxConnections: 10000,
  tlsVersion: "TLS 1.3",
  logLevel: "info",
  metricsInterval: "15s",
  rateLimitDefault: "1000/min",
};

const resourceLimits = [
  { name: "inference-worker", cpuLimit: "8 vCPU", memLimit: "32GB", replicas: 2 },
  { name: "guardrail-validator", cpuLimit: "4 vCPU", memLimit: "16GB", replicas: 2 },
  { name: "router-gateway", cpuLimit: "2 vCPU", memLimit: "4GB", replicas: 3 },
  { name: "embedding-service", cpuLimit: "4 vCPU", memLimit: "8GB", replicas: 1 },
  { name: "audit-collector", cpuLimit: "1 vCPU", memLimit: "2GB", replicas: 1 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsProductionPage() {
  return (
    <DashboardShell title="تنظیمات Production" subtitle="پیکربندی محیط تولید">
      <div className="flex flex-col gap-5 max-w-3xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/settings" className="hover:text-foreground transition-colors">تنظیمات</Link>
          <span>/</span>
          <span className="text-foreground">محیط تولید</span>
        </div>

        {/* Warning banner */}
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400">
            تغییرات در این بخش مستقیماً بر محیط تولید تأثیر می‌گذارند. قبل از اعمال، مطمئن شوید.
          </p>
        </div>

        <Section title="پیکربندی کلی">
          <div className="card-glass overflow-hidden">
            {Object.entries(productionConfig).map(([key, value], i, arr) => (
              <div key={key} className={cn("flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors", i !== arr.length - 1 && "border-b border-border/50")}>
                <span className="text-xs text-muted-foreground">{key}</span>
                <span className="ltr font-mono text-xs bg-muted/40 px-2 py-0.5 rounded">{String(value)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="محدودیت منابع سرویس‌ها">
          <div className="card-glass overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">سرویس</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">محدودیت CPU</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">محدودیت RAM</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">رپلیکا</th>
                </tr>
              </thead>
              <tbody>
                {resourceLimits.map(r => (
                  <tr key={r.name} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="ltr font-mono">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 ltr">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Cpu className="w-3 h-3" />{r.cpuLimit}
                      </span>
                    </td>
                    <td className="px-4 py-3 ltr">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MemoryStick className="w-3 h-3" />{r.memLimit}
                      </span>
                    </td>
                    <td className="px-4 py-3 ltr font-mono">{r.replicas}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="مناطق استقرار">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "منطقه اصلی", value: "ir-teh-1 (تهران ۱)", primary: true, status: "active" as const },
              { label: "منطقه پشتیبان", value: "eu-west-1 (اروپای غربی)", primary: false, status: "active" as const },
            ].map(r => (
              <div key={r.label} className={cn("card-glass p-4", r.primary && "border-primary/20")}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <StatusPill status={r.status} size="sm" />
                </div>
                <p className="ltr font-mono text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {r.value}
                </p>
                {r.primary && <p className="text-[11px] text-primary mt-1">نود اصلی</p>}
              </div>
            ))}
          </div>
        </Section>

        <div className="flex items-center gap-2 pt-1">
          <button className="px-4 py-2 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors font-medium">
            ذخیره تغییرات
          </button>
          <button className="px-4 py-2 bg-muted border border-border text-xs rounded-md hover:bg-muted/80 transition-colors">
            انصراف
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
