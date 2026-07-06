package policy

const (
	SourceMother = "mother"
	ModeShadow   = "shadow"
	ActionAllow  = "allow"
	ActionPass   = "pass"
	FailModeOpen = "open"
)

type Profile struct {
	Source    string         `json:"source"`
	ProfileID string         `json:"profile_id"`
	Version   int            `json:"version"`
	Gateway   GatewayPolicy  `json:"gateway"`
	Campaign  CampaignPolicy `json:"campaign"`
	Storage   StoragePolicy  `json:"storage"`
	Bypass    BypassPolicy   `json:"bypass"`
	Methods   MethodsPolicy  `json:"methods"`
	Routes    RoutesPolicy   `json:"routes"`
	Bot       BotPolicy      `json:"bot"`
	Queue     QueuePolicy    `json:"queue"`
}

type GatewayPolicy struct {
	Enabled bool `json:"enabled"`
}

type CampaignPolicy struct {
	Enabled       bool   `json:"enabled"`
	Mode          string `json:"mode"`
	DefaultAction string `json:"default_action"`
}

type StoragePolicy struct {
	FailMode string `json:"fail_mode"`
}

type BypassPolicy struct {
	StaticAssets bool `json:"static_assets"`
	WPInternal   bool `json:"wp_internal"`
	Admin        bool `json:"admin"`
	Checkout     bool `json:"checkout"`
	Cart         bool `json:"cart"`
	Account      bool `json:"account"`
	API          bool `json:"api"`
}

type MethodsPolicy struct {
	Managed []string `json:"managed"`
}

type RoutesPolicy struct {
	StaticAssetAction string `json:"static_asset_action"`
	WPInternalAction  string `json:"wp_internal_action"`
	AdminAction       string `json:"admin_action"`
	CheckoutAction    string `json:"checkout_action"`
	CartAction        string `json:"cart_action"`
	AccountAction     string `json:"account_action"`
	APIAction         string `json:"api_action"`
	ProductAction     string `json:"product_action"`
	OtherAction       string `json:"other_action"`
}

type BotPolicy struct {
	Enabled       bool   `json:"enabled"`
	DefaultAction string `json:"default_action"`
}

type QueuePolicy struct {
	Enabled       bool   `json:"enabled"`
	DefaultAction string `json:"default_action"`
}

func DefaultRemotePolicy() Profile {
	return Profile{
		Source:    SourceMother,
		ProfileID: "mother-default-shadow",
		Version:   1,
		Gateway:   GatewayPolicy{Enabled: true},
		Campaign:  CampaignPolicy{Enabled: true, Mode: ModeShadow, DefaultAction: ActionAllow},
		Storage:   StoragePolicy{FailMode: FailModeOpen},
		Bypass: BypassPolicy{
			StaticAssets: true,
			WPInternal:   true,
			Admin:        true,
			Checkout:     true,
			Cart:         false,
			Account:      false,
			API:          false,
		},
		Methods: MethodsPolicy{Managed: []string{"GET", "HEAD", "POST"}},
		Routes: RoutesPolicy{
			StaticAssetAction: ActionPass,
			WPInternalAction:  ActionPass,
			AdminAction:       ActionPass,
			CheckoutAction:    ActionPass,
			CartAction:        ActionAllow,
			AccountAction:     ActionAllow,
			APIAction:         ActionAllow,
			ProductAction:     ActionAllow,
			OtherAction:       ActionAllow,
		},
		Bot:   BotPolicy{Enabled: false, DefaultAction: ActionAllow},
		Queue: QueuePolicy{Enabled: false, DefaultAction: ActionAllow},
	}
}

func Validate(p Profile) error {
	if p.Source != SourceMother {
		return validationError("invalid source")
	}
	if p.ProfileID == "" {
		return validationError("missing profile_id")
	}
	if p.Version <= 0 {
		return validationError("invalid version")
	}
	if p.Campaign.Mode != ModeShadow {
		return validationError("unsupported campaign mode")
	}
	if !validAction(p.Campaign.DefaultAction) || !validAction(p.Bot.DefaultAction) || !validAction(p.Queue.DefaultAction) {
		return validationError("invalid default action")
	}
	if p.Storage.FailMode != FailModeOpen && p.Storage.FailMode != "close" {
		return validationError("invalid fail_mode")
	}
	if len(p.Methods.Managed) == 0 {
		return validationError("invalid managed methods")
	}
	for _, m := range p.Methods.Managed {
		if m != "GET" && m != "HEAD" && m != "POST" {
			return validationError("invalid managed methods")
		}
	}
	actions := []string{p.Routes.StaticAssetAction, p.Routes.WPInternalAction, p.Routes.AdminAction, p.Routes.CheckoutAction, p.Routes.CartAction, p.Routes.AccountAction, p.Routes.APIAction, p.Routes.ProductAction, p.Routes.OtherAction}
	for _, a := range actions {
		if !validAction(a) {
			return validationError("invalid action")
		}
	}
	return nil
}

type validationError string

func (e validationError) Error() string { return string(e) }

func validAction(a string) bool {
	switch a {
	case "allow", "queue", "block", "wait", "pass", "unknown":
		return true
	default:
		return false
	}
}
