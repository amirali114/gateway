package logger

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type Logger struct {
	mu     sync.Mutex
	out    io.Writer
	file   *os.File
	level  string
	closed bool
}

func New(path string, level string) (*Logger, error) {
	level = strings.ToLower(strings.TrimSpace(level))
	if level == "" {
		level = "info"
	}

	var out io.Writer = os.Stdout
	var file *os.File
	if strings.TrimSpace(path) != "" {
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return nil, fmt.Errorf("create log dir: %w", err)
		}
		f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			return nil, fmt.Errorf("open log file: %w", err)
		}
		file = f
		out = io.MultiWriter(os.Stdout, f)
	}

	return &Logger{out: out, file: file, level: level}, nil
}

func (l *Logger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.closed = true
	if l.file != nil {
		return l.file.Close()
	}
	return nil
}

func (l *Logger) Info(msg string, fields map[string]any)  { l.write("info", msg, fields) }
func (l *Logger) Warn(msg string, fields map[string]any)  { l.write("warn", msg, fields) }
func (l *Logger) Error(msg string, fields map[string]any) { l.write("error", msg, fields) }

func (l *Logger) write(level string, msg string, fields map[string]any) {
	if l == nil {
		return
	}
	entry := map[string]any{
		"ts":    time.Now().UTC().Format(time.RFC3339Nano),
		"level": level,
		"msg":   msg,
	}
	for k, v := range fields {
		if isSensitiveKey(k) {
			continue
		}
		entry[k] = v
	}
	b, err := json.Marshal(entry)
	if err != nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return
	}
	_, _ = l.out.Write(append(b, '\n'))
}

func isSensitiveKey(key string) bool {
	k := strings.ToLower(key)
	return strings.Contains(k, "secret") || strings.Contains(k, "password") || strings.Contains(k, "cookie") || strings.Contains(k, "authorization") || strings.Contains(k, "signature")
}
