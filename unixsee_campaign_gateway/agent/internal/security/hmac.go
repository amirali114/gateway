package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

type SignatureStatus struct {
	Checked bool
	Valid   bool
	Error   string
}

func ValidateShadowSignature(rawBody []byte, headerValue string, secret string, require bool) SignatureStatus {
	secret = strings.TrimSpace(secret)
	headerValue = strings.TrimSpace(headerValue)

	if secret == "" {
		if require {
			return SignatureStatus{Checked: true, Valid: false, Error: "signature_required_but_secret_empty"}
		}
		return SignatureStatus{Checked: false, Valid: false, Error: ""}
	}

	if headerValue == "" {
		if require {
			return SignatureStatus{Checked: true, Valid: false, Error: "missing_signature"}
		}
		return SignatureStatus{Checked: false, Valid: false, Error: ""}
	}

	const prefix = "sha256="
	if !strings.HasPrefix(headerValue, prefix) {
		return SignatureStatus{Checked: true, Valid: false, Error: "invalid_signature_format"}
	}

	givenHex := strings.TrimSpace(strings.TrimPrefix(headerValue, prefix))
	given, err := hex.DecodeString(givenHex)
	if err != nil {
		return SignatureStatus{Checked: true, Valid: false, Error: "invalid_signature_hex"}
	}

	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(rawBody)
	expected := mac.Sum(nil)
	if !hmac.Equal(given, expected) {
		return SignatureStatus{Checked: true, Valid: false, Error: "signature_mismatch"}
	}

	return SignatureStatus{Checked: true, Valid: true, Error: ""}
}
