<?php

class StatsService
{
    public function __construct(private PDO $pdo) {}

    public function getTotalSubmissions(): int
    {
        $stmt = $this->pdo->query("SELECT COUNT(*) AS c FROM sessions WHERE converted = 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) ($row['c'] ?? 0);
    }

    public function getTodaySubmissions(): int
    {
        $todayStart = date('Y-m-d 00:00:00');
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS c FROM sessions WHERE converted = 1 AND created_at >= ?");
        $stmt->execute([$todayStart]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) ($row['c'] ?? 0);
    }

    public function getLast7DaysSubmissions(): int
    {
        $from = date('c', time() - 7 * 24 * 3600);
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS c FROM sessions WHERE converted = 1 AND created_at >= ?");
        $stmt->execute([$from]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) ($row['c'] ?? 0);
    }

    public function getVariantStats(): array
    {
        $stmt = $this->pdo->query("
            SELECT variant, COUNT(*) AS c
            FROM sessions
            WHERE converted = 1
            GROUP BY variant
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stats = ['A' => 0, 'B' => 0];
        foreach ($rows as $row) {
            $v = $row['variant'];
            if (isset($stats[$v])) {
                $stats[$v] = (int) $row['c'];
            }
        }
        $stats['total'] = $stats['A'] + $stats['B'];
        return $stats;
    }
}
