<?php

class AuthController
{
    public function __construct(
        private PDO $pdo,
        private array $config
    ) {}

    public function login(): void
    {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $username = trim($_POST['username'] ?? '');
            $password = $_POST['password'] ?? '';

            $security = new SecurityService($this->pdo, $this->config);
            $ip       = get_client_ip();
            if ($security->isLocked($ip)) {
                $error = 'به دلیل تلاش‌های متعدد ناموفق، دسترسی موقتاً قفل شده است.';
                $this->renderLogin($error);
            return;
}

            $adminRepo = new AdminRepository($this->pdo);
            $admin     = $adminRepo->findByUsername($username);

            if ($admin && password_verify($password, $admin['password_hash'])) {
                $_SESSION['ux_admin_id'] = $admin['id'];
                $security->resetAttempts($ip);
                header('Location: ?action=admin_dashboard');
                exit;
            }

            $security->incrementAttempts($ip);
            $error = 'نام کاربری یا رمز عبور اشتباه است.';
            $this->renderLogin($error);
            return;
}

        $this->renderLogin();
    }

    public function logout(): void
    {
        unset($_SESSION['ux_admin_id']);
        header('Location: ?action=admin_login');
        exit;
    }

public function adminCss(): void
{
    header('Content-Type: text/css; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: public, max-age=300');
    $fontCssVer = (int) (@filemtime(dirname(__DIR__, 3) . '/assets/css/ux-fonts.css.php') ?: 1);
    $fontCssUrl = ux_main_gateway_asset_url('assets/css/ux-fonts.css.php?v=' . $fontCssVer);

    echo '@import url("' . $fontCssUrl . '");' . "
";
    echo "body{margin:0;font-family:var(--ux-font-ui);-webkit-font-smoothing:antialiased;background:#020617;color:#e5e7eb;}
";
    echo "a{text-decoration:none;color:inherit;}
";
    echo ".layout{display:flex;min-height:100vh;}
";
    echo ".sidebar{width:220px;background:#020617;border-inline-end:1px solid #1f2937;padding:16px;display:flex;flex-direction:column;gap:16px;position:sticky;top:0;align-self:flex-start;}
";
    echo ".brand{font-size:15px;font-weight:700;margin-bottom:8px;}
";
    echo ".brand small{font-size:10px;color:#9ca3af;}
";
    echo ".nav a{display:block;padding:8px 10px;margin-bottom:4px;font-size:13px;border-radius:10px;color:#9ca3af;}
";
    echo ".nav a.active,.nav a:hover{background:rgba(79,70,229,.18);color:#e5e7eb;}
";
    echo ".content{flex:1;padding:20px 24px;}
";
    echo ".topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
";
    echo ".card{background:#020617;border-radius:18px;border:1px solid #1f2937;padding:16px;margin-bottom:16px;}
";
    echo ".kpi-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px;}
";
    echo ".kpi{background:#020617;border-radius:16px;border:1px solid #1f2937;padding:12px;}
";
    echo ".kpi-title{font-size:11px;color:#9ca3af;margin-bottom:4px;}
";
    echo ".kpi-value{font-size:18px;font-weight:700;}
";
    echo ".kpi-meta{font-size:10px;color:#6b7280;}
";
    echo "table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}
";
    echo "th,td{padding:8px;border-bottom:1px solid #111827;text-align:right;}
";
    echo "th{color:#9ca3af;font-weight:500;}
";
    echo ".badge{font-size:10px;border-radius:999px;padding:2px 8px;background:#111827;}
";
    echo ".badge-green{background:#064e3b;color:#6ee7b7;}
";
    echo ".badge-red{background:#450a0a;color:#fecaca;}
";
    echo ".btn-sm{font-size:11px;border-radius:999px;border:none;padding:6px 10px;background:#111827;color:#e5e7eb;cursor:pointer;}
";
    echo ".btn-sm-primary{background:#4f46e5;}
";
    echo ".btn-sm-outline{background:transparent;border:1px solid #4b5563;}
";
    echo "input[type=\"text\"],input[type=\"url\"],select,input[type=\"password\"]{background:#020617;border-radius:10px;border:1px solid #1f2937;color:#e5e7eb;padding:6px 8px;font-size:12px;width:100%;outline:none;}
";
    echo "input[type=\"text\"]:focus,input[type=\"url\"]:focus,select:focus,input[type=\"password\"]:focus{border-color:#4f46e5;}
";
    echo ".form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:10px;}
";
    echo "label{font-size:11px;color:#9ca3af;margin-bottom:2px;display:block;}
";
    echo ".mt-2{margin-top:8px;}
";
    echo ".mt-3{margin-top:12px;}
";
    echo ".mb-2{margin-bottom:8px;}
";
    echo ".text-sm{font-size:12px;}
";
    echo ".text-xs{font-size:10px;}
";
    echo ".text-muted{color:#9ca3af;}
";
    echo ".text-danger{color:#f97373;}
";
    echo ".sidebar-footer{margin-top:auto;font-size:11px;color:#6b7280;}
";
    echo ".logout-link{color:#f97373;}
";
    echo ".page-h1{font-size:18px;margin:0 0 4px;}
";
    echo ".page-h2{font-size:14px;margin-bottom:8px;}
";
    echo ".inline-flex{display:flex;gap:4px;align-items:center;}
";
    echo ".nowrap{white-space:nowrap;}
";
    echo ".link-accent{color:#a5b4fc;}
";

    exit;
}

    private function renderLogin(string $error = ''): void
    {
        $base_url = $this->config['base_url'];
        $this->render('admin/login.php', compact('error', 'base_url'));
    }

    private function render(string $view, array $data = []): void
    {
        extract($data, EXTR_SKIP);
        $viewPath = __DIR__ . '/../Views/' . $view;
        $layout   = __DIR__ . '/../Views/admin/layout_admin.php';
        require $layout;
    }
}
