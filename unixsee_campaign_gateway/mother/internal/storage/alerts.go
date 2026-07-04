package storage

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"
)

const maxAlertsDefault = 1000

func normalizeAlertStatus(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case AlertStatusResolved:
		return AlertStatusResolved
	case AlertStatusMuted:
		return AlertStatusMuted
	default:
		return AlertStatusActive
	}
}

func normalizeAlertSeverity(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case AlertSeverityCritical:
		return AlertSeverityCritical
	case AlertSeverityInfo:
		return AlertSeverityInfo
	default:
		return AlertSeverityWarn
	}
}

func normalizeAlertScope(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	switch v {
	case "mother", "dashboard", "agent", "gateway", "storage", "rollout", "security":
		return v
	default:
		return "mother"
	}
}

func alertFingerprint(scope string, typ string, agentID string) string {
	parts := []string{normalizeAlertScope(scope), strings.ToLower(strings.TrimSpace(typ)), strings.TrimSpace(agentID)}
	return strings.Join(parts, ":")
}

func (s *MemoryStore) UpsertAlert(ctx context.Context, rec AlertRecord) (AlertRecord, bool, error) {
	if err := ctx.Err(); err != nil {
		return AlertRecord{}, false, err
	}
	rec.Scope = normalizeAlertScope(rec.Scope)
	rec.Type = strings.ToLower(strings.TrimSpace(rec.Type))
	if rec.Type == "" {
		return AlertRecord{}, false, fmt.Errorf("alert type is required")
	}
	rec.Severity = normalizeAlertSeverity(rec.Severity)
	rec.Status = normalizeAlertStatus(rec.Status)
	rec.AgentID = strings.TrimSpace(rec.AgentID)
	if rec.Fingerprint == "" {
		rec.Fingerprint = alertFingerprint(rec.Scope, rec.Type, rec.AgentID)
	}
	if rec.Metadata == nil {
		rec.Metadata = map[string]any{}
	}
	now := time.Now().UTC()
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.alerts == nil {
		s.alerts = map[string]AlertRecord{}
	}
	if s.alertByFP == nil {
		s.alertByFP = map[string]string{}
	}
	if existingID := s.alertByFP[rec.Fingerprint]; existingID != "" {
		cur := s.alerts[existingID]
		cur.UpdatedAt = now
		cur.LastSeenAt = now
		cur.Severity = rec.Severity
		cur.Title = strings.TrimSpace(rec.Title)
		cur.Message = strings.TrimSpace(rec.Message)
		cur.Metadata = sanitizeMetadata(rec.Metadata)
		if cur.FirstSeenAt.IsZero() {
			cur.FirstSeenAt = now
		}
		if cur.Timestamp.IsZero() {
			cur.Timestamp = cur.FirstSeenAt
		}
		if cur.Status == AlertStatusResolved {
			cur.Status = AlertStatusActive
			cur.ResolvedAt = time.Time{}
		}
		cur.OccurrenceCount++
		if cur.OccurrenceCount <= 0 {
			cur.OccurrenceCount = 1
		}
		s.alerts[existingID] = cur
		return cur, false, nil
	}
	s.nextAlertID++
	if strings.TrimSpace(rec.ID) == "" {
		rec.ID = fmt.Sprintf("alrt-%d", s.nextAlertID)
	}
	if rec.Timestamp.IsZero() {
		rec.Timestamp = now
	}
	if rec.FirstSeenAt.IsZero() {
		rec.FirstSeenAt = rec.Timestamp
	}
	if rec.LastSeenAt.IsZero() {
		rec.LastSeenAt = now
	}
	rec.UpdatedAt = now
	if rec.OccurrenceCount <= 0 {
		rec.OccurrenceCount = 1
	}
	rec.Title = strings.TrimSpace(rec.Title)
	rec.Message = strings.TrimSpace(rec.Message)
	rec.Metadata = sanitizeMetadata(rec.Metadata)
	s.alerts[rec.ID] = rec
	s.alertByFP[rec.Fingerprint] = rec.ID
	s.pruneAlertsLocked(maxAlertsDefault)
	return rec, true, nil
}

func (s *MemoryStore) ListAlerts(ctx context.Context, filter AlertFilter) ([]AlertRecord, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	status := strings.ToLower(strings.TrimSpace(filter.Status))
	agentID := strings.TrimSpace(filter.AgentID)
	scope := strings.ToLower(strings.TrimSpace(filter.Scope))
	limit := filter.Limit
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	s.mu.RLock()
	out := make([]AlertRecord, 0, len(s.alerts))
	for _, a := range s.alerts {
		if status != "" && a.Status != status {
			continue
		}
		if agentID != "" && a.AgentID != agentID {
			continue
		}
		if scope != "" && a.Scope != scope {
			continue
		}
		out = append(out, a)
	}
	s.mu.RUnlock()
	sort.Slice(out, func(i, j int) bool { return out[i].LastSeenAt.After(out[j].LastSeenAt) })
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (s *MemoryStore) GetAlert(ctx context.Context, alertID string) (AlertRecord, error) {
	if err := ctx.Err(); err != nil {
		return AlertRecord{}, err
	}
	alertID = strings.TrimSpace(alertID)
	s.mu.RLock()
	rec, ok := s.alerts[alertID]
	s.mu.RUnlock()
	if !ok {
		return AlertRecord{}, fmt.Errorf("alert not found")
	}
	return rec, nil
}

func (s *MemoryStore) ResolveAlert(ctx context.Context, alertID string, actor string) (AlertRecord, error) {
	return s.setAlertStatus(ctx, alertID, AlertStatusResolved, actor)
}

func (s *MemoryStore) MuteAlert(ctx context.Context, alertID string, actor string) (AlertRecord, error) {
	return s.setAlertStatus(ctx, alertID, AlertStatusMuted, actor)
}

func (s *MemoryStore) UnmuteAlert(ctx context.Context, alertID string, actor string) (AlertRecord, error) {
	return s.setAlertStatus(ctx, alertID, AlertStatusActive, actor)
}

func (s *MemoryStore) setAlertStatus(ctx context.Context, alertID string, status string, actor string) (AlertRecord, error) {
	if err := ctx.Err(); err != nil {
		return AlertRecord{}, err
	}
	alertID = strings.TrimSpace(alertID)
	status = normalizeAlertStatus(status)
	now := time.Now().UTC()
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.alerts[alertID]
	if !ok {
		return AlertRecord{}, fmt.Errorf("alert not found")
	}
	rec.Status = status
	rec.UpdatedAt = now
	if status == AlertStatusResolved {
		rec.ResolvedAt = now
	} else {
		rec.ResolvedAt = time.Time{}
	}
	s.alerts[alertID] = rec
	eventType := "alert_" + status
	if status == AlertStatusActive {
		eventType = "alert_unmuted"
	}
	s.addEventLocked(rec.AgentID, eventType, "info", "Alert status updated", map[string]any{"alert_id": rec.ID, "status": status, "actor": strings.TrimSpace(actor), "fingerprint": rec.Fingerprint})
	return rec, nil
}

func (s *MemoryStore) AlertSummary(ctx context.Context) (AlertSummary, error) {
	if err := ctx.Err(); err != nil {
		return AlertSummary{}, err
	}
	now := time.Now().UTC()
	out := AlertSummary{OK: true, ByScope: map[string]int{}, GeneratedAt: now, Latest: []AlertRecord{}}
	s.mu.RLock()
	for _, a := range s.alerts {
		if a.Status == AlertStatusActive {
			out.ActiveTotal++
			out.ByScope[a.Scope]++
			switch a.Severity {
			case AlertSeverityCritical:
				out.Critical++
			case AlertSeverityInfo:
				out.Info++
			default:
				out.Warn++
			}
		} else if a.Status == AlertStatusMuted {
			out.Muted++
		} else if a.Status == AlertStatusResolved && !a.ResolvedAt.IsZero() && now.Sub(a.ResolvedAt) <= 24*time.Hour {
			out.Resolved24h++
		}
		out.Latest = append(out.Latest, a)
	}
	s.mu.RUnlock()
	sort.Slice(out.Latest, func(i, j int) bool { return out.Latest[i].LastSeenAt.After(out.Latest[j].LastSeenAt) })
	if len(out.Latest) > 10 {
		out.Latest = out.Latest[:10]
	}
	return out, nil
}

func sanitizeMetadata(in map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range in {
		lk := strings.ToLower(k)
		if strings.Contains(lk, "token") || strings.Contains(lk, "secret") || strings.Contains(lk, "password") || strings.Contains(lk, "cookie") || strings.Contains(lk, "dsn") {
			out[k] = "[redacted]"
			continue
		}
		out[k] = v
	}
	return out
}

func (s *MemoryStore) pruneAlertsLocked(max int) {
	if max <= 0 || len(s.alerts) <= max {
		return
	}
	items := make([]AlertRecord, 0, len(s.alerts))
	for _, a := range s.alerts {
		items = append(items, a)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].LastSeenAt.Before(items[j].LastSeenAt) })
	for len(s.alerts) > max && len(items) > 0 {
		a := items[0]
		items = items[1:]
		if a.Status == AlertStatusActive || a.Status == AlertStatusMuted {
			continue
		}
		delete(s.alerts, a.ID)
		delete(s.alertByFP, a.Fingerprint)
	}
}
