package decision

import (
	"context"
	"testing"

	"unixsee-campaign-gateway/agent/internal/policy"
)

func testEngine() *BasicV1Engine {
	return NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow", CompareUnknown: false}, policy.DefaultLocalProfile())
}

func TestDecisionEnginePolicyGatewayDisabledPasses(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Gateway.Enabled = false
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/"})
	if d.Action != "pass" || d.Reason != "policy_gateway_disabled" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineRuntimeGatewayDisabledPasses(t *testing.T) {
	d := testEngine().Decide(context.Background(), Input{GatewayEnabled: false, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/"})
	if d.Action != "pass" || d.Reason != "runtime_gateway_disabled" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEnginePolicyCampaignDisabledPasses(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Campaign.Enabled = false
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/"})
	if d.Action != "pass" || d.Reason != "policy_campaign_disabled" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineRuntimeCampaignDisabledPasses(t *testing.T) {
	d := testEngine().Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: false, StorageAvailable: true, Method: "GET", Path: "/"})
	if d.Action != "pass" || d.Reason != "runtime_campaign_disabled" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineStorageFailCloseWaits(t *testing.T) {
	d := testEngine().Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: false, StorageFailMode: "close", Method: "GET", Path: "/"})
	if d.Action != "wait" || d.Reason != "storage_unavailable_fail_close" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineStorageFailOpenPasses(t *testing.T) {
	d := testEngine().Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: false, StorageFailMode: "open", Method: "GET", Path: "/"})
	if d.Action != "pass" || d.Reason != "storage_unavailable_fail_open" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineUsesPolicyStorageFailModeWhenRuntimeEmpty(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Storage.FailMode = policy.FailModeClose
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: false, StorageFailMode: "", Method: "GET", Path: "/"})
	if d.Action != "wait" || d.Reason != "storage_unavailable_fail_close" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineUnmanagedMethodAllows(t *testing.T) {
	d := testEngine().Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "PUT", Path: "/product/test"})
	if d.Action != "allow" || d.Reason != "method_not_managed" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineStaticAssetUsesPolicyAction(t *testing.T) {
	d := testEngine().Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/wp-content/uploads/a.png"})
	if d.Action != "pass" || d.Reason != "policy_static_asset_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineWPInternalUsesPolicyAction(t *testing.T) {
	d := testEngine().Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "POST", Path: "/wp-admin/admin-ajax.php"})
	if d.Action != "pass" || d.Reason != "policy_wp_internal_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineAdminUsesPolicyAction(t *testing.T) {
	d := testEngine().Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/wp-admin/edit.php"})
	if d.Action != "pass" || d.Reason != "policy_admin_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineCheckoutUsesQueryAwareClassification(t *testing.T) {
	d := testEngine().Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/", Query: "wc-api=WC_Gateway_Test"})
	if d.Action != "pass" || d.Reason != "policy_checkout_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineProductRouteUsesPolicy(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Routes.ProductAction = policy.ActionQueue
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/product/test"})
	if d.Action != "queue" || d.Reason != "policy_product_route" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineOtherRouteUsesPolicy(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Routes.OtherAction = policy.ActionWait
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/landing"})
	if d.Action != "wait" || d.Reason != "policy_other_route" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineStaticAssetBypassTrueUsesBypassReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.StaticAssets = true
	p.Routes.StaticAssetAction = policy.ActionPass
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/wp-content/uploads/a.png"})
	if d.Action != "pass" || d.Reason != "policy_static_asset_bypass" || d.Confidence != "medium" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineStaticAssetBypassFalseUsesDefaultNotBypassedReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.StaticAssets = false
	p.Campaign.DefaultAction = policy.ActionQueue
	p.Routes.StaticAssetAction = policy.ActionPass
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/wp-content/uploads/a.png"})
	if d.Action != "queue" || d.Reason != "policy_static_asset_not_bypassed" || d.Reason == "policy_static_asset_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineWPInternalBypassFalseDoesNotUseBypassReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.WPInternal = false
	p.Campaign.DefaultAction = policy.ActionQueue
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "POST", Path: "/wp-admin/admin-ajax.php"})
	if d.Action != "queue" || d.Reason != "policy_wp_internal_not_bypassed" || d.Reason == "policy_wp_internal_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineAdminBypassFalseDoesNotUseBypassReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.Admin = false
	p.Campaign.DefaultAction = policy.ActionQueue
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/wp-admin/edit.php"})
	if d.Action != "queue" || d.Reason != "policy_admin_not_bypassed" || d.Reason == "policy_admin_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineCheckoutBypassFalseWithWCApiDoesNotUseBypassReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.Checkout = false
	p.Campaign.DefaultAction = policy.ActionQueue
	p.Routes.CheckoutAction = policy.ActionPass
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/", Query: "wc-api=WC_Gateway_Test"})
	if d.Action != "queue" || d.Reason != "policy_checkout_not_bypassed" || d.Reason == "policy_checkout_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineCheckoutBypassTrueUsesRouteActionAndBypassReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.Checkout = true
	p.Routes.CheckoutAction = policy.ActionPass
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/", Query: "wc-api=WC_Gateway_Test"})
	if d.Action != "pass" || d.Reason != "policy_checkout_bypass" || d.Confidence != "medium" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineCartBypassFalseUsesRouteReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.Cart = false
	p.Routes.CartAction = policy.ActionAllow
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/cart/"})
	if d.Action != "allow" || d.Reason != "policy_cart_route" || d.Reason == "policy_cart_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineCartBypassTrueUsesBypassReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.Cart = true
	p.Routes.CartAction = policy.ActionPass
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/cart/"})
	if d.Action != "pass" || d.Reason != "policy_cart_bypass" || d.Confidence != "medium" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineAPIBypassFalseUsesRouteReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.API = false
	p.Routes.APIAction = policy.ActionAllow
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/wp-json/wc/v3/orders"})
	if d.Action != "allow" || d.Reason != "policy_api_route" || d.Reason == "policy_api_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineAPIBypassTrueUsesBypassReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.API = true
	p.Routes.APIAction = policy.ActionPass
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/wp-json/wc/v3/orders"})
	if d.Action != "pass" || d.Reason != "policy_api_bypass" || d.Confidence != "medium" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineAccountBypassFalseUsesRouteReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.Account = false
	p.Routes.AccountAction = policy.ActionAllow
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/my-account/orders/"})
	if d.Action != "allow" || d.Reason != "policy_account_route" || d.Reason == "policy_account_bypass" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestDecisionEngineAccountBypassTrueUsesBypassReason(t *testing.T) {
	p := policy.DefaultLocalProfile()
	p.Bypass.Account = true
	p.Routes.AccountAction = policy.ActionPass
	d := NewPolicyEngine(Config{Enabled: true, Mode: "comparator", DefaultAction: "allow"}, p).Decide(context.Background(), Input{GatewayEnabled: true, CampaignEnabled: true, StorageAvailable: true, Method: "GET", Path: "/my-account/orders/"})
	if d.Action != "pass" || d.Reason != "policy_account_bypass" || d.Confidence != "medium" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestComparisonMatch(t *testing.T) {
	c := Compare("allow", "allow", false)
	if !c.Compared || !c.Match || c.Reason != "actions_match" {
		t.Fatalf("unexpected comparison: %+v", c)
	}
}

func TestComparisonMismatch(t *testing.T) {
	c := Compare("queue", "allow", false)
	if !c.Compared || c.Match || c.Reason != "actions_mismatch" {
		t.Fatalf("unexpected comparison: %+v", c)
	}
}

func TestComparisonUnknownNotCompared(t *testing.T) {
	c := Compare("allow", "unknown", false)
	if c.Compared || c.Match || c.Reason != "agent_unknown_not_compared" {
		t.Fatalf("unexpected comparison: %+v", c)
	}
}
