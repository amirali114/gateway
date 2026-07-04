import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Zap, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); navigate("/"); }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.08)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.05)_0%,_transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col gap-6 relative">
        {/* Logo */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Unixsee Gateway</h1>
            <p className="text-xs text-muted-foreground mt-0.5">پنل کنترل عملیاتی</p>
          </div>
        </div>

        {/* Card */}
        <div className="card-glass p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-[15px] font-bold">ورود به سیستم</h2>
            <p className="text-xs text-muted-foreground mt-0.5">با حساب سازمانی خود وارد شوید</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">ایمیل سازمانی</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  defaultValue="ali.hosseini@unixsee.io"
                  placeholder="name@unixsee.io"
                  className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 pr-10 text-sm outline-none focus:border-primary transition-colors ltr placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">رمز عبور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPass ? "text" : "password"}
                  defaultValue="••••••••"
                  placeholder="••••••••"
                  className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 pr-10 text-sm outline-none focus:border-primary transition-colors ltr placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* MFA */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                کد تأیید دو‌مرحله‌ای
              </label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors ltr tracking-widest placeholder:text-muted-foreground placeholder:tracking-normal"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {loading ? "در حال ورود…" : "ورود به داشبورد"}
            </button>
          </form>

          <div className="text-center">
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              فراموشی رمز عبور؟
            </a>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Unixsee Gateway Control Panel — نسخه ۲.۴
        </p>
      </div>
    </div>
  );
}
