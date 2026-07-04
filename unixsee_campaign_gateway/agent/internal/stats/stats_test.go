package stats

import (
	"strings"
	"testing"
	"time"

	"unixsee-campaign-gateway/agent/internal/decision"
)

func TestClassifyPath(t *testing.T) {
	cases := map[string]string{
		"/wp-content/app.css":      PathClassStaticAsset,
		"/wp-cron.php":             PathClassWPInternal,
		"/wp-admin/admin-ajax.php": PathClassWPInternal,
		"/wp-admin/edit.php":       PathClassAdmin,
		"/wp-login.php":            PathClassAdmin,
		"/checkout/order-pay/123":  PathClassCheckout,
		"/product/test-product/":   PathClassProduct,
		"/cart/":                   PathClassCart,
		"/my-account/orders/":      PathClassAccount,
		"/wp-json/wc/v3/products":  PathClassAPI,
		"/some-page/":              PathClassOther,
	}
	for path, want := range cases {
		if got := ClassifyPath(path); got != want {
			t.Fatalf("ClassifyPath(%q)=%q want %q", path, got, want)
		}
	}
}

func TestClassifyRequestPathUsesQueryKeys(t *testing.T) {
	cases := []struct {
		path  string
		query string
		want  string
	}{
		{path: "/", query: "wc-api=WC_Gateway_Test", want: PathClassCheckout},
		{path: "/", query: "add-to-cart=123", want: PathClassCart},
		{path: "/", query: "product=123", want: PathClassProduct},
		{path: "/", query: "p=123", want: PathClassProduct},
		{path: "/", query: "rest_route=/wc/v3/orders", want: PathClassAPI},
		{path: "/product/test", query: "secret=1", want: PathClassProduct},
		{path: "/checkout/", query: "token=secret", want: PathClassCheckout},
	}
	for _, tc := range cases {
		if got := ClassifyRequestPath(tc.path, tc.query); got != tc.want {
			t.Fatalf("ClassifyRequestPath(%q,%q)=%q want %q", tc.path, tc.query, got, tc.want)
		}
	}
}

func TestRecentMismatchUsesQueryForClassificationButNeverExposesQuery(t *testing.T) {
	c := NewWithDiagnostics(DiagnosticsConfig{Enabled: true, RecentMismatchLimit: 1, ExposeRecentMismatches: true})
	c.ObserveComparison(
		decision.Comparison{Compared: true, Match: false, PHPAction: "queue", AgentAction: "allow", Reason: "actions_mismatch"},
		ComparisonDetails{Path: "/", Query: "wc-api=secretGateway&token=secret", AgentReason: "basic_v1_default_allow"},
	)
	snap := c.DiagnosticsSnapshot("shadow", true)
	if snap["mismatch_by_path_class"].(map[string]uint64)[PathClassCheckout] != 1 {
		t.Fatalf("expected checkout mismatch class: %+v", snap)
	}
	recent := snap["recent_mismatches"].([]RecentMismatch)
	if len(recent) != 1 {
		t.Fatalf("expected one recent mismatch")
	}
	if recent[0].Path != "/" || strings.Contains(recent[0].Path, "secret") || strings.Contains(recent[0].Path, "token") {
		t.Fatalf("query values must not be exposed in recent mismatch path: %+v", recent[0])
	}
}

func TestDiagnosticsCountersAndMatrix(t *testing.T) {
	c := NewWithDiagnostics(DiagnosticsConfig{Enabled: true, RecentMismatchLimit: 10, ExposeRecentMismatches: true})
	comp := decision.Comparison{Compared: true, Match: false, PHPAction: "queue", AgentAction: "allow", Reason: "actions_mismatch"}
	c.ObserveComparison(comp, ComparisonDetails{Time: time.Unix(1, 0).UTC(), SiteHost: "example.com", Path: "/product/test", PHPReason: "campaign_capacity_full", AgentReason: "basic_v1_default_allow"})

	snap := c.DiagnosticsSnapshot("shadow", true)
	matrix := snap["matrix"].(map[string]map[string]uint64)
	if matrix["queue"]["allow"] != 1 {
		t.Fatalf("matrix not incremented: %+v", matrix)
	}
	if snap["mismatch_by_reason"].(map[string]uint64)["actions_mismatch"] != 1 {
		t.Fatalf("mismatch_by_reason not incremented: %+v", snap)
	}
	if snap["mismatch_by_agent_reason"].(map[string]uint64)["basic_v1_default_allow"] != 1 {
		t.Fatalf("mismatch_by_agent_reason not incremented: %+v", snap)
	}
	if snap["mismatch_by_path_class"].(map[string]uint64)[PathClassProduct] != 1 {
		t.Fatalf("mismatch_by_path_class not incremented: %+v", snap)
	}
}

func TestRecentMismatchRingBufferRespectsLimit(t *testing.T) {
	c := NewWithDiagnostics(DiagnosticsConfig{Enabled: true, RecentMismatchLimit: 2, ExposeRecentMismatches: true})
	for i := 0; i < 3; i++ {
		c.ObserveComparison(decision.Comparison{Compared: true, Match: false, PHPAction: "queue", AgentAction: "allow", Reason: "actions_mismatch"}, ComparisonDetails{Time: time.Unix(int64(i), 0).UTC(), Path: "/product/test", AgentReason: "basic_v1_default_allow"})
	}
	recent := c.DiagnosticsSnapshot("shadow", true)["recent_mismatches"].([]RecentMismatch)
	if len(recent) != 2 {
		t.Fatalf("expected ring buffer length 2, got %d", len(recent))
	}
	if !recent[0].Time.Equal(time.Unix(1, 0).UTC()) || !recent[1].Time.Equal(time.Unix(2, 0).UTC()) {
		t.Fatalf("unexpected ring order: %+v", recent)
	}
}

func TestRecentMismatchHidesSensitiveFieldsByDefault(t *testing.T) {
	c := NewWithDiagnostics(DiagnosticsConfig{Enabled: true, RecentMismatchLimit: 1, ExposeRecentMismatches: true, IncludeIP: false, IncludeUserAgent: false})
	c.ObserveComparison(decision.Comparison{Compared: true, Match: false, PHPAction: "queue", AgentAction: "allow", Reason: "actions_mismatch"}, ComparisonDetails{Path: "/product/test?a=secret", IP: "1.2.3.4", UserAgent: "Mozilla/5.0", AgentReason: "basic_v1_default_allow"})
	recent := c.DiagnosticsSnapshot("shadow", true)["recent_mismatches"].([]RecentMismatch)
	if len(recent) != 1 {
		t.Fatalf("expected one mismatch")
	}
	if recent[0].IP != nil || recent[0].UserAgent != nil {
		t.Fatalf("ip/user agent should be hidden by default: %+v", recent[0])
	}
	if recent[0].Path != "/product/test" {
		t.Fatalf("query string should be stripped: %q", recent[0].Path)
	}
}

func TestRecentMismatchCanIncludeSensitiveFieldsWhenEnabled(t *testing.T) {
	c := NewWithDiagnostics(DiagnosticsConfig{Enabled: true, RecentMismatchLimit: 1, ExposeRecentMismatches: true, IncludeIP: true, IncludeUserAgent: true})
	c.ObserveComparison(decision.Comparison{Compared: true, Match: false, PHPAction: "queue", AgentAction: "allow", Reason: "actions_mismatch"}, ComparisonDetails{Path: "/product/test", IP: "1.2.3.4", UserAgent: "Mozilla/5.0", AgentReason: "basic_v1_default_allow"})
	recent := c.DiagnosticsSnapshot("shadow", true)["recent_mismatches"].([]RecentMismatch)
	if recent[0].IP == nil || *recent[0].IP != "1.2.3.4" || recent[0].UserAgent == nil || *recent[0].UserAgent != "Mozilla/5.0" {
		t.Fatalf("expected ip/user agent included when enabled: %+v", recent[0])
	}
}
