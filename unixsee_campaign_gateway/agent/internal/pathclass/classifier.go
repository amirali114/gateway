package pathclass

import (
	"net/url"
	"strings"
)

const (
	StaticAsset = "static_asset"
	WPInternal  = "wp_internal"
	Admin       = "admin"
	Checkout    = "checkout"
	Product     = "product"
	Cart        = "cart"
	Account     = "account"
	API         = "api"
	Other       = "other"
)

func ClassifyPath(requestPath string) string {
	return ClassifyRequestPath(requestPath, "")
}

func ClassifyRequestPath(requestPath string, rawQuery string) string {
	cleanPath := strings.ToLower(SanitizePath(requestPath))
	queryKeys := SafeQueryKeys(rawQuery)

	if cleanPath != "" {
		staticExts := []string{".css", ".js", ".mjs", ".map", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4", ".webm", ".mp3", ".wav", ".pdf", ".zip"}
		for _, ext := range staticExts {
			if strings.HasSuffix(cleanPath, ext) {
				return StaticAsset
			}
		}
	}

	trimmed := strings.TrimRight(cleanPath, "/")
	if trimmed == "/wp-cron.php" || trimmed == "/wp-admin/admin-ajax.php" || strings.HasSuffix(trimmed, "/wp-cron.php") || strings.HasSuffix(trimmed, "/wp-admin/admin-ajax.php") {
		return WPInternal
	}
	if trimmed == "/wp-login.php" || strings.HasPrefix(trimmed, "/wp-admin") || strings.HasSuffix(trimmed, "/wp-login.php") {
		return Admin
	}
	if strings.Contains(cleanPath, "checkout") || strings.Contains(cleanPath, "order-pay") || strings.Contains(cleanPath, "payment") || strings.Contains(cleanPath, "callback") || strings.Contains(cleanPath, "wc-api") {
		return Checkout
	}
	for _, key := range queryKeys {
		if key == "wc-api" || keyContainsPaymentCallbackIndicator(key) {
			return Checkout
		}
	}
	if strings.Contains(cleanPath, "/product/") || strings.Contains(cleanPath, "/shop/") {
		return Product
	}
	for _, key := range queryKeys {
		switch key {
		case "add-to-cart":
			return Cart
		case "product", "p":
			return Product
		}
	}
	if strings.Contains(cleanPath, "/cart") {
		return Cart
	}
	if strings.Contains(cleanPath, "/my-account") || strings.Contains(cleanPath, "/account") {
		return Account
	}
	if strings.HasPrefix(cleanPath, "/wp-json/") || strings.Contains(cleanPath, "/api/") {
		return API
	}
	for _, key := range queryKeys {
		if key == "rest_route" {
			return API
		}
	}
	return Other
}

func SanitizePath(requestPath string) string {
	pathOnly := strings.TrimSpace(requestPath)
	if pathOnly == "" {
		return ""
	}
	if idx := strings.Index(pathOnly, "?"); idx >= 0 {
		pathOnly = pathOnly[:idx]
	}
	return pathOnly
}

func SafeQueryKeys(rawQuery string) []string {
	q := strings.TrimSpace(rawQuery)
	if q == "" {
		return nil
	}
	q = strings.TrimPrefix(q, "?")
	if q == "" {
		return nil
	}
	values, err := url.ParseQuery(q)
	if err == nil {
		keys := make([]string, 0, len(values))
		for key := range values {
			keys = append(keys, strings.ToLower(strings.TrimSpace(key)))
		}
		return keys
	}

	parts := strings.FieldsFunc(q, func(r rune) bool { return r == '&' || r == ';' })
	keys := make([]string, 0, len(parts))
	for _, part := range parts {
		if idx := strings.Index(part, "="); idx >= 0 {
			part = part[:idx]
		}
		part = strings.ToLower(strings.TrimSpace(part))
		if part != "" {
			keys = append(keys, part)
		}
	}
	return keys
}

func keyContainsPaymentCallbackIndicator(key string) bool {
	return strings.Contains(key, "payment") ||
		strings.Contains(key, "callback") ||
		strings.Contains(key, "gateway") ||
		strings.Contains(key, "order-pay") ||
		strings.Contains(key, "return") ||
		strings.Contains(key, "notify") ||
		strings.Contains(key, "ipn")
}
