package policy

import "testing"

func TestDefaultRemotePolicyValidates(t *testing.T) {
	if err := Validate(DefaultRemotePolicy()); err != nil {
		t.Fatalf("default policy should validate: %v", err)
	}
}

func TestInvalidActionFailsValidation(t *testing.T) {
	p := DefaultRemotePolicy()
	p.Routes.ProductAction = "explode"
	if err := Validate(p); err == nil {
		t.Fatal("expected invalid action to fail")
	}
}

func TestInvalidFailModeFailsValidation(t *testing.T) {
	p := DefaultRemotePolicy()
	p.Storage.FailMode = "panic"
	if err := Validate(p); err == nil {
		t.Fatal("expected invalid fail_mode to fail")
	}
}

func TestMissingProfileIDFailsValidation(t *testing.T) {
	p := DefaultRemotePolicy()
	p.ProfileID = ""
	if err := Validate(p); err == nil {
		t.Fatal("expected missing profile_id to fail")
	}
}

func TestInvalidManagedMethodsFailsValidation(t *testing.T) {
	p := DefaultRemotePolicy()
	p.Methods.Managed = []string{"TRACE"}
	if err := Validate(p); err == nil {
		t.Fatal("expected invalid method to fail")
	}
}
