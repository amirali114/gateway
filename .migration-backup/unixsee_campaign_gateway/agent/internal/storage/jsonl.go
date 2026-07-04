package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const defaultJSONLFileName = "shadow-events.jsonl"

// JSONLStore is an honest append-only JSON Lines event store.
// It is intended for local development and shadow testing. It is not BadgerDB.
type JSONLStore struct {
	mu         sync.Mutex
	path       string
	filePath   string
	file       *os.File
	syncWrites bool
}

func NewJSONLStore(path string, syncWrites bool) *JSONLStore {
	return &JSONLStore{path: path, syncWrites: syncWrites}
}

func (s *JSONLStore) Open(ctx context.Context) error {
	if s == nil {
		return fmt.Errorf("jsonl store is nil")
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	if strings.TrimSpace(s.path) == "" {
		return fmt.Errorf("jsonl storage path is empty")
	}

	filePath := resolveJSONLFilePath(s.path)
	if err := os.MkdirAll(filepath.Dir(filePath), 0750); err != nil {
		return fmt.Errorf("create jsonl storage directory: %w", err)
	}
	f, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0640)
	if err != nil {
		return fmt.Errorf("open jsonl event log: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.filePath = filePath
	s.file = f
	return nil
}

func (s *JSONLStore) Close() error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.file == nil {
		return nil
	}
	err := s.file.Close()
	s.file = nil
	return err
}

func (s *JSONLStore) StoreShadowEvent(ctx context.Context, event ShadowEventRecord) error {
	if s == nil {
		return fmt.Errorf("jsonl store is nil")
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	if event.ID == "" {
		event.ID = NewShadowEventID()
	}
	if event.StorageVersion == "" {
		event.StorageVersion = StorageVersionJSONL
	}
	value, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal shadow event: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.file == nil {
		return fmt.Errorf("jsonl store is not open")
	}
	if _, err := s.file.Write(append(value, '\n')); err != nil {
		return fmt.Errorf("write jsonl event: %w", err)
	}
	if s.syncWrites {
		if err := s.file.Sync(); err != nil {
			return fmt.Errorf("sync jsonl event: %w", err)
		}
	}
	return nil
}

func (s *JSONLStore) Health(ctx context.Context) error {
	if s == nil {
		return fmt.Errorf("jsonl store is nil")
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.file == nil {
		return fmt.Errorf("jsonl store is not open")
	}
	return nil
}

func resolveJSONLFilePath(path string) string {
	cleanPath := filepath.Clean(path)
	if strings.HasSuffix(strings.ToLower(cleanPath), ".jsonl") {
		return cleanPath
	}
	return filepath.Join(cleanPath, defaultJSONLFileName)
}
