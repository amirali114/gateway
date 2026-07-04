import { DashboardShell } from "@/components/DashboardShell";
import { Link, useLocation } from "wouter";
import { Settings, Server, Bell, Shield, Palette, Key, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const settingsSections = [
  { icon: Server, label: "محیط تولید", href: "/settings/production", desc: "پیکربندی سرورها و منابع محیط production" },
  { icon: Bell, label: "اعلان‌ها", href: "/settings/notifications", desc: "مدیریت کانال‌های اعلان و هشدار" },
  { icon: Shield, label: "امنیت", href: "/settings/security", desc: "تنظیمات MFA، SSO و کنترل دسترسی" },
  { icon: Key, label: "کلیدهای API", href: "/settings/api-keys", desc: "مدیریت توکن‌ها و کلیدهای API" },
  { icon: Palette, label: "ظاهر", href: "/settings/appearance", desc: "تم، زبان و تنظیمات نمایش" },
];

export default function SettingsPage() {
  return (
    <DashboardShell title="تنظیمات" subtitle="پیکربندی سیستم Unixsee Gateway">
      <div className="flex flex-col gap-4 max-w-2xl">

        <div className="card-glass p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-base font-bold text-indigo-400 shrink-0">ع</div>
          <div>
            <p className="font-semibold text-sm">علی حسینی</p>
            <p className="ltr text-xs text-muted-foreground">ali.hosseini@unixsee.io — admin</p>
          </div>
          <button className="mr-auto text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            ویرایش پروفایل
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-muted-foreground px-1">بخش‌های تنظیمات</h2>
          <div className="card-glass divide-y divide-border">
            {settingsSections.map(({ icon: Icon, label, href, desc }) => (
              <Link key={href} href={href}>
                <a className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors group">
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                </a>
              </Link>
            ))}
          </div>
        </div>

        <div className="card-glass p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold">اطلاعات سیستم</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "نسخه Gateway", value: "v2.4.1" },
              { label: "نسخه API", value: "v1.9.3" },
              { label: "محیط", value: "production" },
              { label: "منطقه اصلی", value: "ir-teh-1" },
              { label: "آخرین استقرار", value: "۱۴۰۴/۰۴/۱۱" },
              { label: "License", value: "Enterprise" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/30 rounded p-2">
                <p className="text-muted-foreground text-[10px] mb-0.5">{label}</p>
                <p className="font-mono ltr text-[11px]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
