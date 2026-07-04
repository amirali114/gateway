<?php

class SessionService
{
    public function __construct(private PDO $pdo) {}

    public function chooseVariant(array $campaign): string
    {
        if (empty($campaign['variant_b_active'])) {
            return 'A';
        }
        // Simple 50/50 split
        return (mt_rand(0, 1) === 0) ? 'A' : 'B';
    }

    public function storeSubmission(array $campaign, array $data): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO sessions (campaign_id, variant, ip, user_agent, data_json, created_at, converted)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ");

        $stmt->execute([
            $campaign['id'],
            $data['variant'] ?? 'A',
            get_client_ip(),
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            json_encode([
                'name'  => $data['name'] ?? null,
                'phone' => $data['phone'] ?? null,
                'extra' => $data['extra'] ?? null,
            ], JSON_UNESCAPED_UNICODE),
            date('c'),
        ]);
    }
}
