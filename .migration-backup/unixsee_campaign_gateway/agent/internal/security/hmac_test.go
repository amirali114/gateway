package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestValidateShadowSignature(t *testing.T) {
	body := []byte(`{"ok":true}`)
	secret := "secret"
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	header := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	st := ValidateShadowSignature(body, header, secret, true)
	if !st.Checked || !st.Valid || st.Error != "" {
		t.Fatalf("expected valid signature, got %+v", st)
	}

	st = ValidateShadowSignature(body, "sha256=deadbeef", secret, true)
	if !st.Checked || st.Valid {
		t.Fatalf("expected invalid signature, got %+v", st)
	}

	st = ValidateShadowSignature(body, "", secret, false)
	if st.Checked || st.Valid {
		t.Fatalf("expected unchecked optional missing signature, got %+v", st)
	}
}
