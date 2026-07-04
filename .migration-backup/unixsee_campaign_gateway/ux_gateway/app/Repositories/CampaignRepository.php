<?php

class CampaignRepository
{
    public function __construct(private PDO $pdo) {}

    public function getActiveDefaultCampaign(): ?array
    {
        $stmt = $this->pdo->query("
            SELECT * FROM campaigns
            WHERE active = 1
            ORDER BY id ASC
            LIMIT 1
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function getAll(): array
    {
        $stmt = $this->pdo->query("SELECT * FROM campaigns ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(array $data): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO campaigns (name, slug, active, variant_a_active, variant_b_active, redirect_url, theme, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $data['slug'],
            !empty($data['active']) ? 1 : 0,
            1,
            !empty($data['variant_b_active']) ? 1 : 0,
            $data['redirect_url'],
            $data['theme'],
            date('c'),
        ]);
    }

    public function toggleActive(int $id): void
    {
        $stmt = $this->pdo->prepare("UPDATE campaigns SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?");
        $stmt->execute([$id]);
    }

    public function toggleVariantB(int $id): void
    {
        $stmt = $this->pdo->prepare("UPDATE campaigns SET variant_b_active = CASE WHEN variant_b_active = 1 THEN 0 ELSE 1 END WHERE id = ?");
        $stmt->execute([$id]);
    }

    public function updateTheme(int $id, string $theme): void
    {
        $stmt = $this->pdo->prepare("UPDATE campaigns SET theme = ? WHERE id = ?");
        $stmt->execute([$theme, $id]);
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM campaigns WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
