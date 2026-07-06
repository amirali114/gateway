package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const DefaultMaxSkewSeconds = 300

type Status struct {
	Checked bool
	Valid   bool
	Error   string
}

func CanonicalString(method string, path string, timestamp string) string {
	return fmt.Sprintf("%s\n%s\n%s", method, path, timestamp)
}

func Sign(secret string, canonical string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(canonical))
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func ValidateRequest(r *http.Request, secret string, require bool, maxSkewSeconds int) Status {
	secret = strings.TrimSpace(secret)
	if !require {
		return Status{Checked: false}
	}
	if maxSkewSeconds <= 0 {
		maxSkewSeconds = DefaultMaxSkewSeconds
	}
	if secret == "" {
		return Status{Checked: true, Valid: false, Error: "signature_required_but_secret_empty"}
	}
	header := strings.TrimSpace(r.Header.Get("X-Unixsee-Agent-Signature"))
	if header == "" {
		return Status{Checked: true, Valid: false, Error: "missing_signature"}
	}
	const prefix = "sha256="
	if !strings.HasPrefix(header, prefix) {
		return Status{Checked: true, Valid: false, Error: "invalid_signature_format"}
	}
	ts := strings.TrimSpace(r.Header.Get("X-Unixsee-Agent-Timestamp"))
	if ts == "" {
		return Status{Checked: true, Valid: false, Error: "missing_timestamp"}
	}
	unixTS, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		return Status{Checked: true, Valid: false, Error: "invalid_timestamp"}
	}
	maxSkew := time.Duration(maxSkewSeconds) * time.Second
	age := time.Since(time.Unix(unixTS, 0))
	if age < -maxSkew || age > maxSkew {
		return Status{Checked: true, Valid: false, Error: "timestamp_out_of_range"}
	}
	given, err := hex.DecodeString(strings.TrimPrefix(header, prefix))
	if err != nil {
		return Status{Checked: true, Valid: false, Error: "invalid_signature_hex"}
	}
	canonical := CanonicalString(r.Method, r.URL.EscapedPath(), ts)
	expectedHex := strings.TrimPrefix(Sign(secret, canonical), prefix)
	expected, err := hex.DecodeString(expectedHex)
	if err != nil {
		return Status{Checked: true, Valid: false, Error: "internal_signature_error"}
	}
	if !hmac.Equal(given, expected) {
		return Status{Checked: true, Valid: false, Error: "signature_mismatch"}
	}
	return Status{Checked: true, Valid: true}
}
