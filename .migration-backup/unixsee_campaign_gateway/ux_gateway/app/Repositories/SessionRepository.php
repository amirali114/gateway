<?php

class SessionRepository
{
    public function __construct(private PDO $pdo) {}

    public function getRecent(int $limit = 50): array
    {
        $stmt = $this->pdo->prepare("
            SELECT s.*, c.name AS campaign_name
            FROM sessions s
            LEFT JOIN campaigns c ON c.id = s.campaign_id
            ORDER BY s.created_at DESC
            LIMIT ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByDateRange(?string $from, ?string $to): array
    {
        $sql = "
            SELECT s.*, c.name AS campaign_name
            FROM sessions s
            LEFT JOIN campaigns c ON c.id = s.campaign_id
            WHERE 1=1
        ";
        $params = [];
        if ($from) {
            $sql .= " AND s.created_at >= ?";
            $params[] = $from;
        }
        if ($to) {
            $sql .= " AND s.created_at <= ?";
            $params[] = $to;
        }
        $sql .= " ORDER BY s.created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
