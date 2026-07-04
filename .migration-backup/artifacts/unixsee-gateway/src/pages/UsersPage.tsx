import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { getUsers } from "@/lib/adapters/dashboard-data";
import type { User } from "@/lib/contracts";
import { ShieldCheck, ShieldOff, Clock, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => { getUsers().then(setUsers); }, []);

  const counts = {
    total: users.length,
    active: users.filter(u => u.status === "active").length,
    mfa: users.filter(u => u.mfaEnabled).length,
    admins: users.filter(u => u.role === "admin").length,
  };

  return (
    <DashboardShell
      title="مدیریت کاربران"
      subtitle={`${counts.total} کاربر — ${counts.active} فعال`}
      actions={
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors">
          <UserPlus className="w-3.5 h-3.5" />
          افزودن کاربر
        </button>
      }
    >
      <div className="flex flex-col gap-4">

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "کل کاربران", value: counts.total },
            { label: "فعال", value: counts.active },
            { label: "MFA فعال", value: counts.mfa },
            { label: "مدیران", value: counts.admins },
          ].map(s => (
            <div key={s.label} className="card-glass p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="card-glass overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">نام</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">ایمیل</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">نقش</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">وضعیت</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">MFA</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">آخرین ورود</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={cn("border-b border-border/50 hover:bg-muted/20 transition-colors", user.status !== "active" && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 ltr text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3"><StatusPill status={user.role} showDot={false} /></td>
                  <td className="px-4 py-3"><StatusPill status={user.status} /></td>
                  <td className="px-4 py-3">
                    {user.mfaEnabled
                      ? <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" />فعال</span>
                      : <span className="flex items-center gap-1 text-muted-foreground"><ShieldOff className="w-3.5 h-3.5" />غیرفعال</span>}
                  </td>
                  <td className="px-4 py-3 ltr text-muted-foreground">
                    {user.lastLogin
                      ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(user.lastLogin).toLocaleDateString("fa-IR")}</span>
                      : <span className="text-muted-foreground/50">هنوز وارد نشده</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-[11px] px-2 py-0.5 border border-border rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                      ویرایش
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
