package decision

import (
	"context"
	"strings"

	"unixsee-campaign-gateway/agent/internal/pathclass"
	"unixsee-campaign-gateway/agent/internal/policy"
)

type Config struct {
	Enabled        bool
	Mode           string
	DefaultAction  string
	CompareUnknown bool
}

type Engine interface {
	Decide(ctx context.Context, input Input) Decision
}

type Input struct {
	SchemaVersion string
	SiteHost      string
	Scheme        string
	IP            string
	Method        string
	Path          string
	Query         string
	UserAgent     string
	IsAjax        bool

	StorageAvailable bool
	StorageFailMode  string
	GatewayEnabled   bool
	CampaignEnabled  bool
}

type Decision struct {
	Action     string `json:"action"`
	Reason     string `json:"reason"`
	Status     int    `json:"status,omitempty"`
	Confidence string `json:"confidence,omitempty"`
}

type Comparison struct {
	Compared    bool   `json:"compared"`
	Match       bool   `json:"match"`
	PHPAction   string `json:"php_action"`
	AgentAction string `json:"agent_action"`
	Reason      string `json:"reason"`
}

type BasicV1Engine struct {
	cfg     Config
	profile policy.Profile
}

func NewBasicV1Engine(cfg Config) *BasicV1Engine {
	return NewPolicyEngine(cfg, policy.DefaultLocalProfile())
}

func NewPolicyEngine(cfg Config, profile policy.Profile) *BasicV1Engine {
	cfg.DefaultAction = NormalizeAction(cfg.DefaultAction)
	if cfg.DefaultAction == "unknown" {
		cfg.DefaultAction = "allow"
	}
	if strings.TrimSpace(cfg.Mode) == "" {
		cfg.Mode = "comparator"
	}
	profile = policy.ApplyDefaults(profile)
	return &BasicV1Engine{cfg: cfg, profile: profile}
}

func (e *BasicV1Engine) Decide(ctx context.Context, input Input) Decision {
	select {
	case <-ctx.Done():
		return Decision{Action: "unknown", Reason: "context_cancelled", Confidence: "none"}
	default:
	}

	if e == nil || !e.cfg.Enabled {
		return Decision{Action: "unknown", Reason: "decision_disabled", Confidence: "none"}
	}
	profile := e.profile
	if !profile.Gateway.Enabled {
		return Decision{Action: "pass", Reason: "policy_gateway_disabled", Confidence: "high"}
	}
	if !input.GatewayEnabled {
		return Decision{Action: "pass", Reason: "runtime_gateway_disabled", Confidence: "medium"}
	}
	if !profile.Campaign.Enabled {
		return Decision{Action: "pass", Reason: "policy_campaign_disabled", Confidence: "high"}
	}
	if !input.CampaignEnabled {
		return Decision{Action: "pass", Reason: "runtime_campaign_disabled", Confidence: "medium"}
	}
	if !input.StorageAvailable {
		failMode := strings.ToLower(strings.TrimSpace(input.StorageFailMode))
		if failMode == "" {
			failMode = profile.Storage.FailMode
		}
		if failMode == policy.FailModeClose {
			return Decision{Action: "wait", Reason: "storage_unavailable_fail_close", Confidence: "medium"}
		}
		return Decision{Action: "pass", Reason: "storage_unavailable_fail_open", Confidence: "medium"}
	}
	method := strings.ToUpper(strings.TrimSpace(input.Method))
	if !methodManaged(method, profile.Methods.Managed) {
		return Decision{Action: "allow", Reason: "method_not_managed", Confidence: "low"}
	}

	routeClass := pathclass.ClassifyRequestPath(input.Path, input.Query)
	action, reason := routeDecision(profile, routeClass)
	if action != "" {
		return Decision{Action: action, Reason: reason, Confidence: routeConfidence(routeClass, profile)}
	}
	return Decision{Action: NormalizeAction(profile.Campaign.DefaultAction), Reason: "policy_default_action", Confidence: "low"}
}

func methodManaged(method string, managed []string) bool {
	for _, m := range managed {
		if strings.EqualFold(strings.TrimSpace(m), method) {
			return true
		}
	}
	return false
}

func routeDecision(profile policy.Profile, routeClass string) (string, string) {
	defaultAction := NormalizeAction(profile.Campaign.DefaultAction)
	if defaultAction == "unknown" {
		defaultAction = "allow"
	}

	switch routeClass {
	case pathclass.StaticAsset:
		if profile.Bypass.StaticAssets {
			return NormalizeAction(profile.Routes.StaticAssetAction), "policy_static_asset_bypass"
		}
		return defaultAction, "policy_static_asset_not_bypassed"
	case pathclass.WPInternal:
		if profile.Bypass.WPInternal {
			return NormalizeAction(profile.Routes.WPInternalAction), "policy_wp_internal_bypass"
		}
		return defaultAction, "policy_wp_internal_not_bypassed"
	case pathclass.Admin:
		if profile.Bypass.Admin {
			return NormalizeAction(profile.Routes.AdminAction), "policy_admin_bypass"
		}
		return defaultAction, "policy_admin_not_bypassed"
	case pathclass.Checkout:
		if profile.Bypass.Checkout {
			return NormalizeAction(profile.Routes.CheckoutAction), "policy_checkout_bypass"
		}
		return defaultAction, "policy_checkout_not_bypassed"
	case pathclass.Cart:
		if profile.Bypass.Cart {
			return NormalizeAction(profile.Routes.CartAction), "policy_cart_bypass"
		}
		return NormalizeAction(profile.Routes.CartAction), "policy_cart_route"
	case pathclass.Account:
		if profile.Bypass.Account {
			return NormalizeAction(profile.Routes.AccountAction), "policy_account_bypass"
		}
		return NormalizeAction(profile.Routes.AccountAction), "policy_account_route"
	case pathclass.API:
		if profile.Bypass.API {
			return NormalizeAction(profile.Routes.APIAction), "policy_api_bypass"
		}
		return NormalizeAction(profile.Routes.APIAction), "policy_api_route"
	case pathclass.Product:
		return NormalizeAction(profile.Routes.ProductAction), "policy_product_route"
	case pathclass.Other:
		return NormalizeAction(profile.Routes.OtherAction), "policy_other_route"
	default:
		return "", ""
	}
}

func routeConfidence(routeClass string, profile policy.Profile) string {
	switch routeClass {
	case pathclass.StaticAsset:
		if profile.Bypass.StaticAssets {
			return "medium"
		}
	case pathclass.WPInternal:
		if profile.Bypass.WPInternal {
			return "medium"
		}
	case pathclass.Admin:
		if profile.Bypass.Admin {
			return "medium"
		}
	case pathclass.Checkout:
		if profile.Bypass.Checkout {
			return "medium"
		}
	case pathclass.Cart:
		if profile.Bypass.Cart {
			return "medium"
		}
	case pathclass.Account:
		if profile.Bypass.Account {
			return "medium"
		}
	case pathclass.API:
		if profile.Bypass.API {
			return "medium"
		}
	}
	return "low"
}

func Compare(phpAction string, agentAction string, compareUnknown bool) Comparison {
	phpNorm := NormalizeAction(phpAction)
	agentNorm := NormalizeAction(agentAction)
	if agentNorm == "unknown" && !compareUnknown {
		return Comparison{Compared: false, Match: false, PHPAction: phpNorm, AgentAction: agentNorm, Reason: "agent_unknown_not_compared"}
	}
	match := phpNorm == agentNorm
	if match {
		return Comparison{Compared: true, Match: true, PHPAction: phpNorm, AgentAction: agentNorm, Reason: "actions_match"}
	}
	return Comparison{Compared: true, Match: false, PHPAction: phpNorm, AgentAction: agentNorm, Reason: "actions_mismatch"}
}

func NormalizeAction(action string) string {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "allow", "queue", "block", "wait", "pass":
		return strings.ToLower(strings.TrimSpace(action))
	default:
		return "unknown"
	}
}
