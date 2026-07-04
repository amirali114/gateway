package policy

import (
	"testing"
)

func TestDefaultPolicyLoads(t *testing.T) {
	p, err := LoadLocal(Profile{})
	if err != nil {
		t.Fatalf("default policy should load: %v", err)
	}
	if p.Source != SourceLocal || p.ProfileID != "default-local-shadow" || p.Version != 1 {
		t.Fatalf("unexpected default identity: %+v", p.Identity())
	}
	if !p.Gateway.Enabled || !p.Campaign.Enabled || p.Storage.FailMode != FailModeOpen || p.Queue.Enabled || p.Bot.Enabled {
		t.Fatalf("unexpected default policy: %+v", p)
	}
}

func TestInvalidActionFailsValidation(t *testing.T) {
	p := DefaultLocalProfile()
	p.Routes.ProductAction = "deny"
	if err := Validate(p); err == nil {
		t.Fatal("expected invalid action error")
	}
}

func TestInvalidFailModeFailsValidation(t *testing.T) {
	p := DefaultLocalProfile()
	p.Storage.FailMode = "panic"
	if err := Validate(p); err == nil {
		t.Fatal("expected invalid fail mode error")
	}
}

func TestSourceMotherValidatesForR7Sync(t *testing.T) {
	p := DefaultLocalProfile()
	p.Source = SourceMother
	p.ProfileID = "mother-default-shadow"
	if err := Validate(p); err != nil {
		t.Fatalf("mother source should validate in R7: %v", err)
	}
}

func TestLocalPolicyValidates(t *testing.T) {
	p := DefaultLocalProfile()
	p.ProfileID = "custom-local"
	p.Routes.ProductAction = ActionQueue
	if err := Validate(p); err != nil {
		t.Fatalf("local policy should validate: %v", err)
	}
}
