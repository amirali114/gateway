<?php

class AdminController
{
    public function __construct(
        private PDO $pdo,
        private array $config
    ) {
        $this->requireAuth();
    }

    private function requireAuth(): void
    {
        if (empty($_SESSION['ux_admin_id'])) {
            header('Location: ?action=admin_login');
            exit;
        }
    }

    public function dashboard(): void
    {
        $statsService = new StatsService($this->pdo);
        $campaignRepo = new CampaignRepository($this->pdo);

        $total   = $statsService->getTotalSubmissions();
        $today   = $statsService->getTodaySubmissions();
        $week    = $statsService->getLast7DaysSubmissions();
        $variant = $statsService->getVariantStats();
        $campaigns = $campaignRepo->getAll();

        $this->render('admin/dashboard.php', compact('total', 'today', 'week', 'variant', 'campaigns'));
    }

    public function sessions(): void
    {
        $sessionRepo = new SessionRepository($this->pdo);

        $from = $_GET['from'] ?? null;
        $to   = $_GET['to'] ?? null;

        if ($from || $to) {
            $sessions = $sessionRepo->getByDateRange($from ?: null, $to ?: null);
        } else {
            $sessions = $sessionRepo->getRecent(100);
        }

        $this->render('admin/sessions.php', compact('sessions', 'from', 'to'));
    }

    public function campaigns(): void
    {
        $campaignRepo = new CampaignRepository($this->pdo);

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $action = $_POST['form_action'] ?? '';

            if ($action === 'create') {
                $name   = trim($_POST['name'] ?? '');
                $slug   = trim($_POST['slug'] ?? '');
                $url    = trim($_POST['redirect_url'] ?? '');
                $theme  = trim($_POST['theme'] ?? 'default');
                $active = !empty($_POST['active']);
                $bActive = !empty($_POST['variant_b_active']);

                if ($name && $slug && $url) {
                    $campaignRepo->create([
                        'name'             => $name,
                        'slug'             => $slug,
                        'redirect_url'     => $url,
                        'theme'            => $theme,
                        'active'           => $active,
                        'variant_b_active' => $bActive,
                    ]);
                }
                header('Location: ?action=admin_campaigns');
                exit;
            }

            if ($action === 'toggle_active' && !empty($_POST['id'])) {
                $campaignRepo->toggleActive((int) $_POST['id']);
                header('Location: ?action=admin_campaigns');
                exit;
            }

            if ($action === 'toggle_variant_b' && !empty($_POST['id'])) {
                $campaignRepo->toggleVariantB((int) $_POST['id']);
                header('Location: ?action=admin_campaigns');
                exit;
            }

            if ($action === 'update_theme' && !empty($_POST['id'])) {
                $id    = (int) $_POST['id'];
                $theme = trim($_POST['theme'] ?? 'default');
                $campaignRepo->updateTheme($id, $theme);
                header('Location: ?action=admin_campaigns');
                exit;
            }
        }

        $campaigns = $campaignRepo->getAll();
        $themes    = array_keys($this->config['themes']);

        $this->render('admin/campaigns.php', compact('campaigns', 'themes'));
    }

    public function settings(): void
    {
        $themes = $this->config['themes'];
        $app_name = $this->config['app_name'];

        $this->render('admin/settings.php', compact('themes', 'app_name'));
    }

    private function render(string $view, array $data = []): void
    {
        extract($data, EXTR_SKIP);
        $viewPath = __DIR__ . '/../Views/' . $view;
        $layout   = __DIR__ . '/../Views/admin/layout_admin.php';
        require $layout;
    }
}
