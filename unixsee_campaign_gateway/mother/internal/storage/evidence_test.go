package storage

import (
	"context"
	"testing"
)

func TestMemoryStorePutEvidenceGeneratesIDAndPersistsOnUpdate(t *testing.T) {
	store := NewMemoryStore()
	ctx := context.Background()

	rec, err := store.PutEvidence(ctx, EvidenceRecord{
		GateID:    "php-wrapper-model",
		Status:    EvidenceStatusPass,
		Summary:   "validated on staging webroot",
		CreatedBy: "ops-alice:operator",
		UpdatedBy: "ops-alice:operator",
	})
	if err != nil {
		t.Fatalf("PutEvidence: %v", err)
	}
	if rec.ID == "" {
		t.Fatalf("expected generated evidence id")
	}
	if rec.CreatedAt.IsZero() || rec.UpdatedAt.IsZero() {
		t.Fatalf("expected created_at/updated_at to be set")
	}

	updated, err := store.PutEvidence(ctx, EvidenceRecord{
		ID:        rec.ID,
		GateID:    "php-wrapper-model",
		Status:    EvidenceStatusFail,
		Summary:   "regression found after redeploy",
		CreatedBy: "ignored-on-update",
		UpdatedBy: "ops-bob:operator",
	})
	if err != nil {
		t.Fatalf("PutEvidence update: %v", err)
	}
	if updated.CreatedBy != rec.CreatedBy {
		t.Fatalf("expected created_by preserved on update, got %q", updated.CreatedBy)
	}
	if updated.CreatedAt != rec.CreatedAt {
		t.Fatalf("expected created_at preserved on update")
	}
	if updated.Status != EvidenceStatusFail {
		t.Fatalf("expected status updated to fail, got %q", updated.Status)
	}

	got, err := store.GetEvidenceByID(ctx, rec.ID)
	if err != nil {
		t.Fatalf("GetEvidenceByID: %v", err)
	}
	if got.Status != EvidenceStatusFail {
		t.Fatalf("expected persisted fail status, got %q", got.Status)
	}

	if _, err := store.GetEvidenceByID(ctx, "does-not-exist"); err != ErrEvidenceNotFound {
		t.Fatalf("expected ErrEvidenceNotFound, got %v", err)
	}

	list, err := store.ListEvidence(ctx)
	if err != nil {
		t.Fatalf("ListEvidence: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 evidence record, got %d", len(list))
	}
}

func TestValidEvidenceStatus(t *testing.T) {
	valid := []string{EvidenceStatusPass, EvidenceStatusFail, EvidenceStatusAcceptedRisk, EvidenceStatusNotApplicable}
	for _, s := range valid {
		if !ValidEvidenceStatus(s) {
			t.Fatalf("expected %q to be valid", s)
		}
	}
	if ValidEvidenceStatus("maybe") {
		t.Fatalf("expected 'maybe' to be invalid")
	}
	if ValidEvidenceStatus("") {
		t.Fatalf("expected empty string to be invalid")
	}
}
