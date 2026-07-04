package security

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

func signedRequest(path string, secret string, ts string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("X-Unixsee-Agent-Timestamp", ts)
	req.Header.Set("X-Unixsee-Agent-Signature", Sign(secret, CanonicalString(http.MethodGet, path, ts)))
	return req
}

func TestCanonicalString(t *testing.T) {
	got := CanonicalString("GET", "/v1/agents/local-dev-agent/policy", "1710000000")
	want := "GET\n/v1/agents/local-dev-agent/policy\n1710000000"
	if got != want {
		t.Fatalf("canonical mismatch: %q", got)
	}
}

func TestValidateRequestValidSignature(t *testing.T) {
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	req := signedRequest("/v1/agents/local-dev-agent/policy", "secret", ts)
	st := ValidateRequest(req, "secret", true, 300)
	if !st.Checked || !st.Valid {
		t.Fatalf("expected valid signature, got %+v", st)
	}
}

func TestValidateRequestMissingTimestampFails(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/agents/local-dev-agent/policy", nil)
	req.Header.Set("X-Unixsee-Agent-Signature", "sha256=deadbeef")
	st := ValidateRequest(req, "secret", true, 300)
	if st.Valid || st.Error != "missing_timestamp" {
		t.Fatalf("expected missing timestamp, got %+v", st)
	}
}

func TestValidateRequestOldTimestampFails(t *testing.T) {
	ts := strconv.FormatInt(time.Now().Add(-10*time.Minute).Unix(), 10)
	req := signedRequest("/v1/agents/local-dev-agent/policy", "secret", ts)
	st := ValidateRequest(req, "secret", true, 300)
	if st.Valid || st.Error != "timestamp_out_of_range" {
		t.Fatalf("expected timestamp_out_of_range, got %+v", st)
	}
}

func TestValidateRequestFutureTimestampFails(t *testing.T) {
	ts := strconv.FormatInt(time.Now().Add(10*time.Minute).Unix(), 10)
	req := signedRequest("/v1/agents/local-dev-agent/policy", "secret", ts)
	st := ValidateRequest(req, "secret", true, 300)
	if st.Valid || st.Error != "timestamp_out_of_range" {
		t.Fatalf("expected timestamp_out_of_range, got %+v", st)
	}
}
