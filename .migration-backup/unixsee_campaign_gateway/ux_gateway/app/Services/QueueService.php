<?php

class QueueService
{
    public function __construct(
        private PDO $pdo,
        private array $config
    ) {
    }

    private function getMaxActiveUsers(): int
    {
        $max = $this->config['gateway']['max_active_users'] ?? 0;
        $max = (int) $max;
        if ($max < 1) {
            $max = 0;
        }
        return $max;
    }

    private function getSessionLifetime(): int
    {
        $lifetime = $this->config['gateway']['session_lifetime'] ?? 120;
        $lifetime = (int) $lifetime;
        if ($lifetime < 30) {
            $lifetime = 30;
        }
        return $lifetime;
    }

    private function cleanup(): void
    {
        $now      = time();
        $minTime  = $now - $this->getSessionLifetime();

        $stmt = $this->pdo->prepare("DELETE FROM ux_sessions WHERE last_seen < :minTime");
        $stmt->execute([':minTime' => $minTime]);

        $stmt = $this->pdo->prepare("DELETE FROM ux_queue WHERE last_seen < :minTime");
        $stmt->execute([':minTime' => $minTime]);
    }

    /**
     * تصمیم می‌گیرد این سشن باید صفحه انتظار ببیند یا اجازه عبور دارد.
     *
     * خروجی:
     *  [
     *    'status'   => 'inside' | 'queue',
     *    'position' => ?int,    // اگر در صف باشد
     *    'inside'   => int,     // تعداد داخل
     *    'max'      => int,     // سقف مجاز
     *  ]
     */
    public function evaluate(string $sessionId): array
    {
        $this->cleanup();
        $now       = time();
        $maxActive = $this->getMaxActiveUsers();

        // تعداد کاربران داخل
        $insideCount = 0;
        $stmt = $this->pdo->query("SELECT COUNT(*) AS c FROM ux_sessions");
        if ($stmt !== false) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row && isset($row['c'])) {
                $insideCount = (int) $row['c'];
            }
        }

        // اگر ظرفیت پر است → کاربر باید برود در صف
        if ($maxActive > 0 && $insideCount >= $maxActive) {
            // آیا همین سشن قبلاً در صف بوده؟
            $stmt = $this->pdo->prepare("SELECT joined_at FROM ux_queue WHERE session_id = :sid");
            $stmt->execute([':sid' => $sessionId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                // فقط last_seen را آپدیت کن
                $update = $this->pdo->prepare("UPDATE ux_queue SET last_seen = :seen WHERE session_id = :sid");
                $update->execute([
                    ':seen' => $now,
                    ':sid'  => $sessionId,
                ]);
            } else {
                // تازه وارد صف شده
                $insert = $this->pdo->prepare("
                    INSERT INTO ux_queue (session_id, joined_at, last_seen)
                    VALUES (:sid, :joined, :seen)
                ");
                $insert->execute([
                    ':sid'    => $sessionId,
                    ':joined' => $now,
                    ':seen'   => $now,
                ]);
            }

            // موقعیت در صف: چند نفر قبل از او joined_at کوچک‌تر یا مساوی دارند؟
            $posStmt = $this->pdo->prepare("
                SELECT COUNT(*) AS pos
                FROM ux_queue
                WHERE joined_at <= (SELECT joined_at FROM ux_queue WHERE session_id = :sid)
            ");
            $posStmt->execute([':sid' => $sessionId]);
            $posRow = $posStmt->fetch(PDO::FETCH_ASSOC);
            $position = $posRow && isset($posRow['pos']) ? (int) $posRow['pos'] : null;

            return [
                'status'   => 'queue',
                'position' => $position,
                'inside'   => $insideCount,
                'max'      => $maxActive,
            ];
        }

        // این سشن اجازه عبور دارد (inside)
        // اگر در صف بود، حذفش کن
        $del = $this->pdo->prepare("DELETE FROM ux_queue WHERE session_id = :sid");
        $del->execute([':sid' => $sessionId]);

        // در لیست سشن‌های داخل سایت ثبت/آپدیت کن
        $upsert = $this->pdo->prepare("
            INSERT INTO ux_sessions (session_id, last_seen)
            VALUES (:sid, :seen)
            ON CONFLICT(session_id) DO UPDATE SET last_seen = excluded.last_seen
        ");
        $upsert->execute([
            ':sid'  => $sessionId,
            ':seen' => $now,
        ]);

        $insideCount++; // ساده‌ترین حالت؛ لازم نیست خیلی دقیق باشیم

        return [
            'status'   => 'inside',
            'position' => null,
            'inside'   => $insideCount,
            'max'      => $maxActive,
        ];
    }
}
