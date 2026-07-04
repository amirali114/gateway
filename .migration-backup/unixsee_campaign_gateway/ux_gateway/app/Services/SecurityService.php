<?php

class SecurityService
{
    public function __construct(
        private PDO $pdo,
        private array $config
    ) {}

    public function isLocked(string $ip): bool
    {
        $maxAttempts = (int) ($this->config['security']['max_login_attempts'] ?? 5);
        $lockMinutes = (int) ($this->config['security']['lock_minutes'] ?? 15);

        $stmt = $this->pdo->prepare("SELECT * FROM login_attempts WHERE ip = ? LIMIT 1");
        $stmt->execute([$ip]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return false;
        }

        // Check lock status
        if (!empty($row['locked_until']) && strtotime($row['locked_until']) > time()) {
            return true;
        }

        // Reset if lock expired
        if (!empty($row['locked_until']) && strtotime($row['locked_until']) <= time()) {
            $this->resetAttempts($ip);
            return false;
        }

        // Not locked yet
        return false;
    }

    public function incrementAttempts(string $ip): void
    {
        $maxAttempts = (int) ($this->config['security']['max_login_attempts'] ?? 5);
        $lockMinutes = (int) ($this->config['security']['lock_minutes'] ?? 15);

        $stmt = $this->pdo->prepare("SELECT * FROM login_attempts WHERE ip = ? LIMIT 1");
        $stmt->execute([$ip]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $stmt = $this->pdo->prepare("INSERT INTO login_attempts (ip, attempts, locked_until) VALUES (?, 1, NULL)");
            $stmt->execute([$ip]);
            return;
        }

        $attempts = (int) $row['attempts'] + 1;
        $lockedUntil = null;
        if ($attempts >= $maxAttempts) {
            $lockedUntil = date('c', time() + $lockMinutes * 60);
        }

        $stmt = $this->pdo->prepare("UPDATE login_attempts SET attempts = ?, locked_until = ? WHERE ip = ?");
        $stmt->execute([$attempts, $lockedUntil, $ip]);
    }

    public function resetAttempts(string $ip): void
    {
        $stmt = $this->pdo->prepare("DELETE FROM login_attempts WHERE ip = ?");
        $stmt->execute([$ip]);
    }
}
