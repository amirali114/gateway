package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"unixsee-campaign-gateway/mother/internal/policy"
)

const jsonStorageVersion = "r9.7.mother.json.v1"

type jsonState struct {
	StorageVersion string                      `json:"storage_version"`
	SavedAt        time.Time                   `json:"saved_at"`
	NextEventID    uint64                      `json:"next_event_id"`
	NextAlertID    uint64                      `json:"next_alert_id"`
	Policies       map[string]PolicyRecord     `json:"policies"`
	Assignments    map[string]AssignmentRecord `json:"assignments"`
	Agents         map[string]AgentRecord      `json:"agents"`
	ActiveConfigs  map[string]ConfigRecord     `json:"active_configs"`
	DraftConfigs   map[string]ConfigRecord     `json:"draft_configs"`
	History        map[string][]ConfigRecord   `json:"history"`
	Telemetry      map[string]TelemetryRecord  `json:"telemetry"`
	Events         map[string][]EventRecord    `json:"events"`
	Alerts         map[string]AlertRecord      `json:"alerts"`
	AlertByFP      map[string]string           `json:"alert_by_fingerprint"`
	Evidence       map[string]EvidenceRecord   `json:"evidence,omitempty"`
}

type JSONStore struct {
	*MemoryStore
	path              string
	filePath          string
	syncWrites        bool
	backupOnMigration bool
	saveMu            sync.Mutex
	statusMu          sync.RWMutex
	lastLoadAt        time.Time
	lastSaveAt        time.Time
	lastError         string
	writable          bool
}

func NewJSONStore(opts Options) *JSONStore {
	p := strings.TrimSpace(opts.Path)
	if p == "" {
		p = "./data/mother"
	}
	filePath := p
	if filepath.Ext(filePath) == "" || strings.HasSuffix(filePath, string(os.PathSeparator)) {
		filePath = filepath.Join(filePath, "mother-state.json")
	}
	return &JSONStore{
		MemoryStore:       NewMemoryStore(),
		path:              p,
		filePath:          filePath,
		syncWrites:        opts.SyncWrites,
		backupOnMigration: opts.BackupOnMigration,
		writable:          false,
	}
}

func (s *JSONStore) Open(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(s.filePath), 0o750); err != nil {
		s.setStatusError(err)
		return fmt.Errorf("create json storage dir: %w", err)
	}
	if err := s.load(ctx); err != nil {
		s.setStatusError(err)
		return err
	}
	if err := s.save(ctx); err != nil {
		s.setStatusError(err)
		return err
	}
	return nil
}

func (s *JSONStore) Close() error { return nil }

func (s *JSONStore) Health(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	st := s.StorageStatus(ctx)
	if !st.OK {
		if st.LastError != "" {
			return errors.New(st.LastError)
		}
		return errors.New("json storage not healthy")
	}
	return nil
}

func (s *JSONStore) StorageStatus(ctx context.Context) StorageStatus {
	st := StorageStatus{OK: ctx.Err() == nil, Engine: EngineJSON, Path: s.path, Writable: false, LastError: "", PersistedObjects: map[string]int{}}
	s.statusMu.RLock()
	st.LastLoadAt = s.lastLoadAt
	st.LastSaveAt = s.lastSaveAt
	st.LastError = s.lastError
	st.Writable = s.writable
	s.statusMu.RUnlock()
	if ctx.Err() != nil {
		st.OK = false
		st.LastError = ctx.Err().Error()
	}
	if st.LastError != "" {
		st.OK = false
	}
	s.mu.RLock()
	st.PersistedObjects = s.countsLocked()
	s.mu.RUnlock()
	return st
}

func (s *JSONStore) load(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if _, err := os.Stat(s.filePath); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			s.statusMu.Lock()
			s.lastLoadAt = time.Now().UTC()
			s.lastError = ""
			s.statusMu.Unlock()
			return nil
		}
		return fmt.Errorf("stat json storage: %w", err)
	}
	state, err := readJSONState(s.filePath)
	if err != nil {
		backupPath := s.filePath + ".bak"
		backupState, backupErr := readJSONState(backupPath)
		if backupErr != nil {
			return fmt.Errorf("load json storage failed and backup unavailable: primary=%v backup=%v", err, backupErr)
		}
		state = backupState
		s.statusMu.Lock()
		s.lastError = "primary state failed; loaded backup"
		s.statusMu.Unlock()
	}
	s.mu.Lock()
	s.applyStateLocked(state)
	s.mu.Unlock()
	s.statusMu.Lock()
	s.lastLoadAt = time.Now().UTC()
	if s.lastError != "primary state failed; loaded backup" {
		s.lastError = ""
	}
	s.statusMu.Unlock()
	return nil
}

func readJSONState(path string) (jsonState, error) {
	var state jsonState
	f, err := os.Open(path)
	if err != nil {
		return state, err
	}
	defer f.Close()
	dec := json.NewDecoder(f)
	if err := dec.Decode(&state); err != nil {
		return state, err
	}
	return state, nil
}

func (s *JSONStore) applyStateLocked(state jsonState) {
	if state.Policies != nil {
		s.policies = state.Policies
	}
	if state.Assignments != nil {
		s.assignments = state.Assignments
	}
	if state.Agents != nil {
		s.agents = state.Agents
	}
	if state.ActiveConfigs != nil {
		s.activeConfigs = state.ActiveConfigs
	}
	if state.DraftConfigs != nil {
		s.draftConfigs = state.DraftConfigs
	}
	if state.History != nil {
		s.history = state.History
	}
	if state.Telemetry != nil {
		s.telemetry = state.Telemetry
	}
	if state.Events != nil {
		s.events = state.Events
	}
	if state.Alerts != nil {
		s.alerts = state.Alerts
	}
	if state.AlertByFP != nil {
		s.alertByFP = state.AlertByFP
	} else {
		s.alertByFP = map[string]string{}
		for id, alert := range s.alerts {
			if alert.Fingerprint != "" {
				s.alertByFP[alert.Fingerprint] = id
			}
		}
	}
	if state.Evidence != nil {
		s.evidence = state.Evidence
	} else if s.evidence == nil {
		s.evidence = map[string]EvidenceRecord{}
	}
	s.nextEventID = state.NextEventID
	s.nextAlertID = state.NextAlertID
	if len(s.policies) == 0 {
		now := time.Now().UTC()
		defaultPolicy := policy.DefaultRemotePolicy()
		s.policies = map[string]PolicyRecord{DefaultPolicyID: {ID: DefaultPolicyID, Profile: defaultPolicy, IsDefault: true, CreatedAt: now, UpdatedAt: now}}
	}
	if _, ok := s.policies[DefaultPolicyID]; !ok {
		now := time.Now().UTC()
		defaultPolicy := policy.DefaultRemotePolicy()
		s.policies[DefaultPolicyID] = PolicyRecord{ID: DefaultPolicyID, Profile: defaultPolicy, IsDefault: true, CreatedAt: now, UpdatedAt: now}
	}
}

// save serializes the current in-memory state to disk using a concurrency-safe
// atomic write: each call gets its own uniquely-named temp file (so concurrent
// Save calls never share or race on the same temp path), and the whole
// write-fsync-close-rename sequence is serialized with saveMu so that two
// concurrent saves can never interleave their backup/rename steps either.
func (s *JSONStore) save(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	s.mu.RLock()
	state := jsonState{
		StorageVersion: jsonStorageVersion,
		SavedAt:        time.Now().UTC(),
		NextEventID:    s.nextEventID,
		NextAlertID:    s.nextAlertID,
		Policies:       cloneMap(s.policies),
		Assignments:    cloneMap(s.assignments),
		Agents:         cloneMap(s.agents),
		ActiveConfigs:  cloneMap(s.activeConfigs),
		DraftConfigs:   cloneMap(s.draftConfigs),
		History:        cloneSliceMap(s.history),
		Telemetry:      cloneMap(s.telemetry),
		Events:         cloneSliceMap(s.events),
		Alerts:         cloneMap(s.alerts),
		AlertByFP:      cloneMap(s.alertByFP),
		Evidence:       cloneMap(s.evidence),
	}
	s.mu.RUnlock()

	payload, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("encode json storage: %w", err)
	}

	// Serialize the entire disk-write sequence (backup + temp write + rename)
	// across concurrent Save callers. Without this, two goroutines racing on
	// a shared fixed temp filename could each open/rename it independently,
	// causing one save's rename to fail with "no such file or directory"
	// after the other save already moved the temp file away.
	s.saveMu.Lock()
	defer s.saveMu.Unlock()

	dir := filepath.Dir(s.filePath)
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return fmt.Errorf("create json storage dir: %w", err)
	}

	if s.backupOnMigration {
		_ = copyFile(s.filePath, s.filePath+".bak")
	}

	tmpFile, err := os.CreateTemp(dir, ".mother-state-*.tmp")
	if err != nil {
		return fmt.Errorf("create json storage temp: %w", err)
	}
	tmpPath := tmpFile.Name()
	cleanupTemp := func() {
		_ = os.Remove(tmpPath)
	}

	if err := tmpFile.Chmod(0o640); err != nil {
		_ = tmpFile.Close()
		cleanupTemp()
		return fmt.Errorf("chmod json storage temp: %w", err)
	}
	if _, err := tmpFile.Write(payload); err != nil {
		_ = tmpFile.Close()
		cleanupTemp()
		return fmt.Errorf("write json storage temp: %w", err)
	}
	if _, err := tmpFile.Write([]byte("\n")); err != nil {
		_ = tmpFile.Close()
		cleanupTemp()
		return fmt.Errorf("write json storage newline: %w", err)
	}
	if s.syncWrites {
		if err := tmpFile.Sync(); err != nil {
			_ = tmpFile.Close()
			cleanupTemp()
			return fmt.Errorf("sync json storage temp: %w", err)
		}
	}
	if err := tmpFile.Close(); err != nil {
		cleanupTemp()
		return fmt.Errorf("close json storage temp: %w", err)
	}
	if err := os.Rename(tmpPath, s.filePath); err != nil {
		cleanupTemp()
		return fmt.Errorf("rename json storage temp: %w", err)
	}
	if s.syncWrites {
		_ = syncDir(dir)
	}

	s.statusMu.Lock()
	s.lastSaveAt = time.Now().UTC()
	s.lastError = ""
	s.writable = true
	s.statusMu.Unlock()
	return nil
}

func cloneMap[T any](in map[string]T) map[string]T {
	out := make(map[string]T, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func cloneSliceMap[T any](in map[string][]T) map[string][]T {
	out := make(map[string][]T, len(in))
	for k, v := range in {
		out[k] = append([]T(nil), v...)
	}
	return out
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o640)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		_ = out.Close()
		return err
	}
	if err := out.Close(); err != nil {
		return err
	}
	return nil
}

func syncDir(path string) error {
	d, err := os.Open(path)
	if err != nil {
		return err
	}
	defer d.Close()
	return d.Sync()
}

func (s *JSONStore) setStatusError(err error) {
	s.statusMu.Lock()
	if err != nil {
		s.lastError = err.Error()
	}
	s.writable = false
	s.statusMu.Unlock()
}

func (s *JSONStore) persist(ctx context.Context) error {
	if err := s.save(ctx); err != nil {
		s.setStatusError(err)
		return err
	}
	return nil
}

func (s *JSONStore) UpsertPolicy(ctx context.Context, record PolicyRecord) error {
	if err := s.MemoryStore.UpsertPolicy(ctx, record); err != nil {
		return err
	}
	return s.persist(ctx)
}
func (s *JSONStore) AssignPolicy(ctx context.Context, agentID string, policyID string) error {
	if err := s.MemoryStore.AssignPolicy(ctx, agentID, policyID); err != nil {
		return err
	}
	return s.persist(ctx)
}
func (s *JSONStore) DeleteAssignment(ctx context.Context, agentID string) error {
	if err := s.MemoryStore.DeleteAssignment(ctx, agentID); err != nil {
		return err
	}
	return s.persist(ctx)
}
func (s *JSONStore) RegisterPolicyPull(ctx context.Context, agentID string, remoteAddr string, profile policy.Profile) (AgentRecord, error) {
	rec, err := s.MemoryStore.RegisterPolicyPull(ctx, agentID, remoteAddr, profile)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}
func (s *JSONStore) SaveDraftConfig(ctx context.Context, agentID string, cfg ControlConfig) (ConfigRecord, error) {
	rec, err := s.MemoryStore.SaveDraftConfig(ctx, agentID, cfg)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}

func (s *JSONStore) SaveDraftConfigWithMeta(ctx context.Context, agentID string, cfg ControlConfig, baseVersion int, updatedBy string) (ConfigRecord, error) {
	rec, err := s.MemoryStore.SaveDraftConfigWithMeta(ctx, agentID, cfg, baseVersion, updatedBy)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}

func (s *JSONStore) PublishDraftConfig(ctx context.Context, agentID string) (ConfigRecord, error) {
	rec, err := s.MemoryStore.PublishDraftConfig(ctx, agentID)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}

func (s *JSONStore) PublishDraftConfigWithNote(ctx context.Context, agentID string, note string, createdBy string) (ConfigRecord, error) {
	rec, err := s.MemoryStore.PublishDraftConfigWithNote(ctx, agentID, note, createdBy)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}

func (s *JSONStore) RollbackConfig(ctx context.Context, agentID string, targetVersion int, note string, createdBy string) (ConfigRecord, error) {
	rec, err := s.MemoryStore.RollbackConfig(ctx, agentID, targetVersion, note, createdBy)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}

func (s *JSONStore) MarkConfigDelivered(ctx context.Context, agentID string) (ConfigRecord, error) {
	rec, err := s.MemoryStore.MarkConfigDelivered(ctx, agentID)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}

func (s *JSONStore) SaveTelemetry(ctx context.Context, agentID string, remoteAddr string, payload TelemetryPayload) (AgentRecord, error) {
	rec, err := s.MemoryStore.SaveTelemetry(ctx, agentID, remoteAddr, payload)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}
func (s *JSONStore) AddEvent(ctx context.Context, agentID string, typ string, severity string, message string, metadata map[string]any) error {
	if err := s.MemoryStore.AddEvent(ctx, agentID, typ, severity, message, metadata); err != nil {
		return err
	}
	return s.persist(ctx)
}

func (s *JSONStore) UpsertAlert(ctx context.Context, rec AlertRecord) (AlertRecord, bool, error) {
	out, created, err := s.MemoryStore.UpsertAlert(ctx, rec)
	if err != nil {
		return out, created, err
	}
	if err := s.persist(ctx); err != nil {
		return out, created, err
	}
	return out, created, nil
}

func (s *JSONStore) ResolveAlert(ctx context.Context, alertID string, actor string) (AlertRecord, error) {
	rec, err := s.MemoryStore.ResolveAlert(ctx, alertID, actor)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}

func (s *JSONStore) MuteAlert(ctx context.Context, alertID string, actor string) (AlertRecord, error) {
	rec, err := s.MemoryStore.MuteAlert(ctx, alertID, actor)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}

func (s *JSONStore) UnmuteAlert(ctx context.Context, alertID string, actor string) (AlertRecord, error) {
	rec, err := s.MemoryStore.UnmuteAlert(ctx, alertID, actor)
	if err != nil {
		return rec, err
	}
	if err := s.persist(ctx); err != nil {
		return rec, err
	}
	return rec, nil
}
