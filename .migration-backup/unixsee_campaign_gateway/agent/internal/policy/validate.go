package policy

import (
	"fmt"
	"strings"
)

var allowedActions = map[string]bool{
	ActionAllow:   true,
	ActionQueue:   true,
	ActionBlock:   true,
	ActionWait:    true,
	ActionPass:    true,
	ActionUnknown: true,
}

func NormalizeAction(action string) string {
	action = strings.ToLower(strings.TrimSpace(action))
	if allowedActions[action] {
		return action
	}
	return ActionUnknown
}

func NormalizeFailMode(mode string) string {
	return strings.ToLower(strings.TrimSpace(mode))
}

func NormalizeSource(source string) string {
	return strings.ToLower(strings.TrimSpace(source))
}

func ApplyDefaults(p Profile) Profile {
	defaults := DefaultLocalProfile()
	if isZeroProfile(p) {
		return defaults
	}
	if strings.TrimSpace(p.Source) == "" {
		p.Source = defaults.Source
	}
	if strings.TrimSpace(p.ProfileID) == "" {
		p.ProfileID = defaults.ProfileID
	}
	if p.Version <= 0 {
		p.Version = defaults.Version
	}
	if strings.TrimSpace(p.Campaign.Mode) == "" {
		p.Campaign.Mode = defaults.Campaign.Mode
	}
	if strings.TrimSpace(p.Campaign.DefaultAction) == "" {
		p.Campaign.DefaultAction = defaults.Campaign.DefaultAction
	}
	if strings.TrimSpace(p.Storage.FailMode) == "" {
		p.Storage.FailMode = defaults.Storage.FailMode
	}
	if len(p.Methods.Managed) == 0 {
		p.Methods.Managed = append([]string(nil), defaults.Methods.Managed...)
	}
	if strings.TrimSpace(p.Routes.StaticAssetAction) == "" {
		p.Routes.StaticAssetAction = defaults.Routes.StaticAssetAction
	}
	if strings.TrimSpace(p.Routes.WPInternalAction) == "" {
		p.Routes.WPInternalAction = defaults.Routes.WPInternalAction
	}
	if strings.TrimSpace(p.Routes.AdminAction) == "" {
		p.Routes.AdminAction = defaults.Routes.AdminAction
	}
	if strings.TrimSpace(p.Routes.CheckoutAction) == "" {
		p.Routes.CheckoutAction = defaults.Routes.CheckoutAction
	}
	if strings.TrimSpace(p.Routes.CartAction) == "" {
		p.Routes.CartAction = defaults.Routes.CartAction
	}
	if strings.TrimSpace(p.Routes.AccountAction) == "" {
		p.Routes.AccountAction = defaults.Routes.AccountAction
	}
	if strings.TrimSpace(p.Routes.APIAction) == "" {
		p.Routes.APIAction = defaults.Routes.APIAction
	}
	if strings.TrimSpace(p.Routes.ProductAction) == "" {
		p.Routes.ProductAction = defaults.Routes.ProductAction
	}
	if strings.TrimSpace(p.Routes.OtherAction) == "" {
		p.Routes.OtherAction = defaults.Routes.OtherAction
	}
	if strings.TrimSpace(p.Bot.DefaultAction) == "" {
		p.Bot.DefaultAction = defaults.Bot.DefaultAction
	}
	if strings.TrimSpace(p.Queue.DefaultAction) == "" {
		p.Queue.DefaultAction = defaults.Queue.DefaultAction
	}
	p.Normalize()
	return p
}

func (p *Profile) Normalize() {
	p.Source = NormalizeSource(p.Source)
	p.Campaign.Mode = strings.ToLower(strings.TrimSpace(p.Campaign.Mode))
	p.Campaign.DefaultAction = strings.ToLower(strings.TrimSpace(p.Campaign.DefaultAction))
	p.Storage.FailMode = NormalizeFailMode(p.Storage.FailMode)
	p.Routes.StaticAssetAction = strings.ToLower(strings.TrimSpace(p.Routes.StaticAssetAction))
	p.Routes.WPInternalAction = strings.ToLower(strings.TrimSpace(p.Routes.WPInternalAction))
	p.Routes.AdminAction = strings.ToLower(strings.TrimSpace(p.Routes.AdminAction))
	p.Routes.CheckoutAction = strings.ToLower(strings.TrimSpace(p.Routes.CheckoutAction))
	p.Routes.CartAction = strings.ToLower(strings.TrimSpace(p.Routes.CartAction))
	p.Routes.AccountAction = strings.ToLower(strings.TrimSpace(p.Routes.AccountAction))
	p.Routes.APIAction = strings.ToLower(strings.TrimSpace(p.Routes.APIAction))
	p.Routes.ProductAction = strings.ToLower(strings.TrimSpace(p.Routes.ProductAction))
	p.Routes.OtherAction = strings.ToLower(strings.TrimSpace(p.Routes.OtherAction))
	p.Bot.DefaultAction = strings.ToLower(strings.TrimSpace(p.Bot.DefaultAction))
	p.Queue.DefaultAction = strings.ToLower(strings.TrimSpace(p.Queue.DefaultAction))
	for i, method := range p.Methods.Managed {
		p.Methods.Managed[i] = strings.ToUpper(strings.TrimSpace(method))
	}
}

func isZeroProfile(p Profile) bool {
	return strings.TrimSpace(p.Source) == "" &&
		strings.TrimSpace(p.ProfileID) == "" &&
		p.Version == 0 &&
		strings.TrimSpace(p.Campaign.Mode) == "" &&
		strings.TrimSpace(p.Campaign.DefaultAction) == "" &&
		strings.TrimSpace(p.Storage.FailMode) == "" &&
		len(p.Methods.Managed) == 0 &&
		strings.TrimSpace(p.Routes.StaticAssetAction) == "" &&
		strings.TrimSpace(p.Routes.WPInternalAction) == "" &&
		strings.TrimSpace(p.Routes.AdminAction) == "" &&
		strings.TrimSpace(p.Routes.CheckoutAction) == "" &&
		strings.TrimSpace(p.Routes.CartAction) == "" &&
		strings.TrimSpace(p.Routes.AccountAction) == "" &&
		strings.TrimSpace(p.Routes.APIAction) == "" &&
		strings.TrimSpace(p.Routes.ProductAction) == "" &&
		strings.TrimSpace(p.Routes.OtherAction) == "" &&
		strings.TrimSpace(p.Bot.DefaultAction) == "" &&
		strings.TrimSpace(p.Queue.DefaultAction) == ""
}

func Validate(p Profile) error {
	p = ApplyDefaults(p)
	if p.Source != SourceLocal && p.Source != SourceMother {
		return fmt.Errorf("unsupported policy source %q", p.Source)
	}
	if strings.TrimSpace(p.ProfileID) == "" {
		return fmt.Errorf("policy.profile_id must not be empty")
	}
	if p.Version <= 0 {
		return fmt.Errorf("policy.version must be positive")
	}
	if p.Campaign.Mode != ModeShadow {
		return fmt.Errorf("unsupported policy.campaign.mode %q: R6 supports shadow only", p.Campaign.Mode)
	}
	if p.Storage.FailMode != FailModeOpen && p.Storage.FailMode != FailModeClose {
		return fmt.Errorf("unsupported policy.storage.fail_mode %q", p.Storage.FailMode)
	}
	if len(p.Methods.Managed) == 0 {
		return fmt.Errorf("policy.methods.managed must not be empty")
	}
	for _, method := range p.Methods.Managed {
		if strings.TrimSpace(method) == "" {
			return fmt.Errorf("policy.methods.managed contains an empty method")
		}
	}
	if err := validateAction("policy.campaign.default_action", p.Campaign.DefaultAction); err != nil {
		return err
	}
	if err := validateAction("policy.routes.static_asset_action", p.Routes.StaticAssetAction); err != nil {
		return err
	}
	if err := validateAction("policy.routes.wp_internal_action", p.Routes.WPInternalAction); err != nil {
		return err
	}
	if err := validateAction("policy.routes.admin_action", p.Routes.AdminAction); err != nil {
		return err
	}
	if err := validateAction("policy.routes.checkout_action", p.Routes.CheckoutAction); err != nil {
		return err
	}
	if err := validateAction("policy.routes.cart_action", p.Routes.CartAction); err != nil {
		return err
	}
	if err := validateAction("policy.routes.account_action", p.Routes.AccountAction); err != nil {
		return err
	}
	if err := validateAction("policy.routes.api_action", p.Routes.APIAction); err != nil {
		return err
	}
	if err := validateAction("policy.routes.product_action", p.Routes.ProductAction); err != nil {
		return err
	}
	if err := validateAction("policy.routes.other_action", p.Routes.OtherAction); err != nil {
		return err
	}
	if err := validateAction("policy.bot.default_action", p.Bot.DefaultAction); err != nil {
		return err
	}
	if err := validateAction("policy.queue.default_action", p.Queue.DefaultAction); err != nil {
		return err
	}
	return nil
}

func validateAction(field string, action string) error {
	if !allowedActions[action] {
		return fmt.Errorf("unsupported %s %q", field, action)
	}
	return nil
}
