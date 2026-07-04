<?php

class FrontController
{
    public function __construct(
        private PDO $pdo,
        private array $config
    ) {}

        public function showGateway(): void
    {
        $campaignRepo = new CampaignRepository($this->pdo);
        $campaign     = $campaignRepo->getActiveDefaultCampaign();

        if (!$campaign) {
            // No active campaign, redirect to site root
            header('Location: /');
            exit;
        }

        // کنترل صف در ترافیک بالا (اختیاری، بر اساس config['gateway'])
        if (!empty($this->config['gateway']['enabled'])) {
            $queueService = new QueueService($this->pdo, $this->config);
            $sessionId    = session_id();

            $result = $queueService->evaluate($sessionId);
            if ($result['status'] === 'queue') {
                $themeKey = $campaign['theme'] ?? 'default';
                $theme    = $this->config['themes'][$themeKey] ?? $this->config['themes']['default'];

                $this->render('front/waiting.php', [
                    'campaign' => $campaign,
                    'theme'    => $theme,
                    'base_url' => $this->config['base_url'],
                    'position' => $result['position'],
                    'inside'   => $result['inside'],
                    'max'      => $result['max'],
                ]);

                return;
            }
        }

        $sessionService = new SessionService($this->pdo);
        $variant        = $sessionService->chooseVariant($campaign);

        $themeKey = $campaign['theme'] ?? 'default';
        $theme    = $this->config['themes'][$themeKey] ?? $this->config['themes']['default'];

        $this->render('front/gateway.php', [
            'campaign' => $campaign,
            'variant'  => $variant,
            'theme'    => $theme,
            'base_url' => $this->config['base_url'],
        ]);
    }

    public function css(): void
{
    header('Content-Type: text/css; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: public, max-age=300');

    $campaignRepo = new CampaignRepository($this->pdo);
    $campaign     = $campaignRepo->getActiveDefaultCampaign();

    if (!$campaign) {
        http_response_code(404);
        echo "/* no active campaign */";
        exit;
    }

    $themeKey = $campaign['theme'] ?? 'default';
    $theme    = $this->config['themes'][$themeKey] ?? $this->config['themes']['default'];

    $primary = (string)($theme['primary_color'] ?? '#6366f1');
    $bg      = (string)($theme['background'] ?? 'linear-gradient(135deg, #0f172a, #020617)');
    $dark    = !empty($theme['dark_mode']);
    $blur    = !empty($theme['card_blur']);

    $textMain   = $dark ? '#e5e7eb' : '#111827';
    $textMuted  = $dark ? '#9ca3af' : '#6b7280';
    $labelColor = $dark ? '#e5e7eb' : '#374151';

    $cardBg   = $blur ? 'rgba(15,23,42,0.85)' : '#ffffff';
    $cardBdr  = $blur ? '1px solid rgba(148,163,184,0.4)' : '1px solid rgba(148,163,184,0.2)';
    $cardShdw = $blur ? 'none' : '0 20px 40px rgba(15,23,42,0.12)';

    echo ":root{--primary:" . $primary . ";--bg:" . $bg . ";--text:" . $textMain . ";--muted:" . $textMuted . ";--label:" . $labelColor . ";--card-bg:" . $cardBg . ";--card-border:" . $cardBdr . ";--card-shadow:" . $cardShdw . ";}
";
    $fontCssVer = (int) (@filemtime(dirname(__DIR__, 3) . '/assets/css/ux-fonts.css.php') ?: 1);
    $fontCssUrl = ux_main_gateway_asset_url('assets/css/ux-fonts.css.php?v=' . $fontCssVer);

    echo '@import url("' . $fontCssUrl . '");' . "
";
    echo "*{box-sizing:border-box;margin:0;padding:0}
";
    echo "body,button,input,textarea,select{font-family:var(--ux-font-ui);}
";
    echo "body{min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text);}
";
    echo ".overlay{position:fixed;inset:0;background:radial-gradient(circle at top,#ffffff14,transparent);pointer-events:none;}
";
    echo ".card{position:relative;width:100%;max-width:480px;padding:24px 24px 28px;border-radius:24px;background:var(--card-bg);border:var(--card-border);box-shadow:var(--card-shadow);}
";
    if ($blur) {
        echo ".card{backdrop-filter:blur(18px);}
";
    }
    echo ".badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#a5b4fc;background:rgba(79,70,229,0.15);border-radius:999px;padding:4px 10px;margin-bottom:10px;}
";
    echo ".title{font-size:22px;font-weight:700;margin-bottom:4px;}
";
    echo ".subtitle{font-size:13px;color:var(--muted);margin-bottom:18px;}
";
    echo ".stepper{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);margin-bottom:16px;}
";
    echo ".stepper-bar{flex:1;height:4px;border-radius:999px;background:rgba(148,163,184,0.4);overflow:hidden;}
";
    echo ".stepper-bar-inner{width:100%;height:100%;background:linear-gradient(90deg,var(--primary),#22c55e);}
";
    echo ".field{margin-bottom:12px;}
";
    echo ".field label{display:block;font-size:12px;margin-bottom:4px;color:var(--label);}
";
    echo ".field input,.field textarea{width:100%;border-radius:12px;border:1px solid rgba(148,163,184,0.6);background:" . ($dark ? 'rgba(15,23,42,0.95)' : '#f9fafb') . ";padding:9px 11px;font-size:13px;color:inherit;outline:none;transition:border-color .2s,box-shadow .2s,background .2s;}
";
    echo ".field input:focus,.field textarea:focus{border-color:var(--primary);box-shadow:0 0 0 1px rgba(99,102,241,.4);background:" . ($dark ? 'rgba(15,23,42,1)' : '#ffffff') . ";}
";
    echo ".error{font-size:11px;color:#f97373;margin-top:2px;}
";
    echo ".button{width:100%;border:none;outline:none;margin-top:6px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border-radius:999px;background:linear-gradient(135deg,var(--primary),#22c55e);color:#f9fafb;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 18px 35px rgba(79,70,229,.35);transition:transform .12s ease,box-shadow .12s ease,filter .12s ease;}
";
    echo ".button:hover{transform:translateY(-1px) scale(1.01);box-shadow:0 22px 40px rgba(79,70,229,.45);filter:brightness(1.03);}
";
    echo ".button:active{transform:translateY(0) scale(.99);box-shadow:0 12px 24px rgba(79,70,229,.35);}
";
    echo ".button-arrow{font-size:15px;}
";
    echo ".meta{margin-top:14px;display:flex;align-items:center;justify-content:space-between;font-size:10px;color:" . ($dark ? '#6b7280' : '#9ca3af') . ";}
";
    echo ".meta span strong{color:" . ($dark ? '#e5e7eb' : '#111827') . ";}
";
    echo ".timer{margin-top:16px;font-size:13px;opacity:.9;}
";
    echo ".timer-sub{display:block;margin-top:4px;}
";
    echo "@media (max-width:600px){.card{border-radius:18px;padding:20px 18px 22px;}.title{font-size:20px;}}
";

    exit;
}

    public function handleSubmit(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Location: ?action=front');
            exit;
        }

        $campaignRepo = new CampaignRepository($this->pdo);
        $campaign     = $campaignRepo->getActiveDefaultCampaign();

        if (!$campaign) {
            header('Location: /');
            exit;
        }

        $name   = trim($_POST['name'] ?? '');
        $phone  = trim($_POST['phone'] ?? '');
        $extra  = trim($_POST['extra'] ?? '');
        $variant = $_POST['variant'] ?? 'A';

        $errors = [];
        if (mb_strlen($name) < 2) {
            $errors['name'] = 'نام معتبر وارد کنید.';
        }
        if (!preg_match('/^09\d{9}$/', $phone)) {
            $errors['phone'] = 'شماره موبایل معتبر وارد کنید (با 09...).';
        }

        if (!empty($errors)) {
            $themeKey = $campaign['theme'] ?? 'default';
            $theme    = $this->config['themes'][$themeKey] ?? $this->config['themes']['default'];

            $this->render('front/gateway.php', [
                'campaign' => $campaign,
                'variant'  => $variant,
                'theme'    => $theme,
                'base_url' => $this->config['base_url'],
                'errors'   => $errors,
                'old'      => [
                    'name'  => $name,
                    'phone' => $phone,
                    'extra' => $extra,
                ],
            ]);
            return;
        }

        $sessionService = new SessionService($this->pdo);
        $sessionService->storeSubmission($campaign, [
            'name'    => $name,
            'phone'   => $phone,
            'extra'   => $extra,
            'variant' => $variant,
        ]);

        header('Location: ' . $campaign['redirect_url']);
        exit;
    }

    private function render(string $view, array $data = []): void
    {
        extract($data, EXTR_SKIP);
        $viewPath = __DIR__ . '/../Views/' . $view;
        $layout   = __DIR__ . '/../Views/layout.php';
        require $layout;
    }
}
