package server

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"unixsee-campaign-gateway/mother/internal/storage"
)

// Release Evidence Ledger (R10.30)
//
// This is a manual, operator-attested audit ledger for release-gate evidence
// that Mother cannot verify automatically (php-wrapper-model,
// backup-restore-drill, release-evidence-collected, and any future gate).
// Mother never executes remote commands, reads arbitrary files, or fetches
// artifact URLs on the operator's behalf — it only stores what is submitted
// and reflects it back on /v1/release-gates. Recording evidence here never
// flips a gate to a false "pass"; gates read the ledger and combine it with
// their own automatic checks, and unresolved/expired/missing evidence still
// surfaces as warn/unknown so release readiness cannot be silently spoofed.

// releaseGateEvidenceIDs is the set of gate IDs that accept operator evidence.
// This intentionally excludes automatically-derived gates (storage-health,
// active-alerts, etc.) — those are never overridable via this ledger.
var releaseGateEvidenceIDs = map[string]bool{
	"php-wrapper-model":          true,
	"backup-restore-drill":       true,
	"release-evidence-collected": true,
}

const maxEvidenceSummaryLen = 4000
const maxEvidenceMetadataBytes = 8192
const maxEvidenceArtifactRefs = 20
const maxEvidenceArtifactRefLen = 512

type evidenceWriteRequest struct {
	ID           string         `json:"id"`
	GateID       string         `json:"gate_id"`
	Status       string         `json:"status"`
	Summary      string         `json:"summary"`
	ArtifactRefs []string       `json:"artifact_refs"`
	Metadata     map[string]any `json:"metadata"`
	ExpiresAt    string         `json:"expires_at"`
}

func (s *Server) releaseEvidence(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/v1/release/evidence" {
		s.notFound(w, r)
		return
	}
	switch r.Method {
	case http.MethodGet:
		if s.store == nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "storage_unavailable"})
			return
		}
		list, err := s.store.ListEvidence(r.Context())
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "evidence_unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "evidence": list})
	case http.MethodPost:
		s.createReleaseEvidence(w, r)
	default:
		writeMethodNotAllowed(w, http.MethodGet+", "+http.MethodPost)
	}
}

func (s *Server) releaseEvidenceByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/v1/release/evidence/")
	id = strings.Trim(id, "/")
	if id == "" || strings.Contains(id, "/") {
		s.notFound(w, r)
		return
	}
	if s.store == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "storage_unavailable"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		rec, err := s.store.GetEvidenceByID(r.Context(), id)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "evidence_not_found"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "evidence": rec})
	case http.MethodPost:
		s.createReleaseEvidence(w, r)
	default:
		writeMethodNotAllowed(w, http.MethodGet+", "+http.MethodPost)
	}
}

func (s *Server) createReleaseEvidence(w http.ResponseWriter, r *http.Request) {
	if !s.writeAuthorized(w, r) {
		return
	}
	if s.store == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "storage_unavailable"})
		return
	}
	var req evidenceWriteRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_json"})
		return
	}

	gateID := strings.TrimSpace(req.GateID)
	if !releaseGateEvidenceIDs[gateID] {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "unsupported_gate_id"})
		return
	}
	status := strings.TrimSpace(req.Status)
	if !storage.ValidEvidenceStatus(status) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_status", "allowed": []string{storage.EvidenceStatusPass, storage.EvidenceStatusFail, storage.EvidenceStatusAcceptedRisk, storage.EvidenceStatusNotApplicable}})
		return
	}
	summary := strings.TrimSpace(req.Summary)
	if summary == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "missing_summary"})
		return
	}
	if len(summary) > maxEvidenceSummaryLen {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "summary_too_long"})
		return
	}
	if len(req.ArtifactRefs) > maxEvidenceArtifactRefs {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "too_many_artifact_refs"})
		return
	}
	refs := make([]string, 0, len(req.ArtifactRefs))
	for _, ref := range req.ArtifactRefs {
		ref = strings.TrimSpace(ref)
		if ref == "" {
			continue
		}
		if len(ref) > maxEvidenceArtifactRefLen {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "artifact_ref_too_long"})
			return
		}
		// Evidence artifact references are opaque labels/paths recorded for
		// operator audit only. Mother never opens, fetches, or executes them.
		refs = append(refs, ref)
	}
	if req.Metadata != nil {
		if b, err := json.Marshal(req.Metadata); err != nil || len(b) > maxEvidenceMetadataBytes {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "metadata_too_large"})
			return
		}
	}
	var expiresAt time.Time
	if strings.TrimSpace(req.ExpiresAt) != "" {
		t, err := time.Parse(time.RFC3339, strings.TrimSpace(req.ExpiresAt))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_expires_at"})
			return
		}
		expiresAt = t.UTC()
	}

	actor := actorFromRequest(r)
	rec := storage.EvidenceRecord{
		ID:           strings.TrimSpace(req.ID),
		GateID:       gateID,
		Status:       status,
		Summary:      summary,
		ArtifactRefs: refs,
		Metadata:     req.Metadata,
		ExpiresAt:    expiresAt,
		CreatedBy:    actor,
		UpdatedBy:    actor,
	}
	saved, err := s.store.PutEvidence(r.Context(), rec)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": safeError(err)})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "evidence": saved})
}

// latestEvidenceForGate returns the most recent non-expired evidence record
// for a gate, or nil if none exists. This is read-only evaluation logic; it
// never writes to storage and never causes a gate to silently pass without a
// recorded operator attestation.
func latestEvidenceForGate(evidence []storage.EvidenceRecord, gateID string) *storage.EvidenceRecord {
	now := time.Now().UTC()
	for i := range evidence {
		rec := evidence[i]
		if rec.GateID != gateID {
			continue
		}
		if !rec.ExpiresAt.IsZero() && rec.ExpiresAt.Before(now) {
			continue
		}
		return &rec
	}
	return nil
}
