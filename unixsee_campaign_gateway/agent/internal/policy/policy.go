package policy

const (
	SourceLocal  = "local"
	SourceMother = "mother"

	ModeShadow = "shadow"

	ActionAllow   = "allow"
	ActionQueue   = "queue"
	ActionBlock   = "block"
	ActionWait    = "wait"
	ActionPass    = "pass"
	ActionUnknown = "unknown"

	FailModeOpen  = "open"
	FailModeClose = "close"
)

type Profile struct {
	Source       string         `json:"source" yaml:"source"`
	ProfileID    string         `json:"profile_id" yaml:"profile_id"`
	Version      int            `json:"version" yaml:"version"`
	Gateway      GatewayPolicy  `json:"gateway" yaml:"gateway"`
	Campaign     CampaignPolicy `json:"campaign" yaml:"campaign"`
	Storage      StoragePolicy  `json:"storage" yaml:"storage"`
	Bypass       BypassPolicy   `json:"bypass" yaml:"bypass"`
	Methods      MethodsPolicy  `json:"methods" yaml:"methods"`
	Routes       RoutesPolicy   `json:"routes" yaml:"routes"`
	Bot          BotPolicy      `json:"bot" yaml:"bot"`
	Queue        QueuePolicy    `json:"queue" yaml:"queue"`
	ControlPlane map[string]any `json:"control_plane,omitempty" yaml:"-"`
}

type GatewayPolicy struct {
	Enabled bool `json:"enabled" yaml:"enabled"`
}

type CampaignPolicy struct {
	Enabled       bool   `json:"enabled" yaml:"enabled"`
	Mode          string `json:"mode" yaml:"mode"`
	DefaultAction string `json:"default_action" yaml:"default_action"`
}

type StoragePolicy struct {
	FailMode string `json:"fail_mode" yaml:"fail_mode"`
}

type BypassPolicy struct {
	StaticAssets bool `json:"static_assets" yaml:"static_assets"`
	WPInternal   bool `json:"wp_internal" yaml:"wp_internal"`
	Admin        bool `json:"admin" yaml:"admin"`
	Checkout     bool `json:"checkout" yaml:"checkout"`
	Cart         bool `json:"cart" yaml:"cart"`
	Account      bool `json:"account" yaml:"account"`
	API          bool `json:"api" yaml:"api"`
}

type MethodsPolicy struct {
	Managed []string `json:"managed" yaml:"managed"`
}

type RoutesPolicy struct {
	StaticAssetAction string `json:"static_asset_action" yaml:"static_asset_action"`
	WPInternalAction  string `json:"wp_internal_action" yaml:"wp_internal_action"`
	AdminAction       string `json:"admin_action" yaml:"admin_action"`
	CheckoutAction    string `json:"checkout_action" yaml:"checkout_action"`
	CartAction        string `json:"cart_action" yaml:"cart_action"`
	AccountAction     string `json:"account_action" yaml:"account_action"`
	APIAction         string `json:"api_action" yaml:"api_action"`
	ProductAction     string `json:"product_action" yaml:"product_action"`
	OtherAction       string `json:"other_action" yaml:"other_action"`
}

type BotPolicy struct {
	Enabled       bool   `json:"enabled" yaml:"enabled"`
	DefaultAction string `json:"default_action" yaml:"default_action"`
}

type QueuePolicy struct {
	Enabled       bool   `json:"enabled" yaml:"enabled"`
	DefaultAction string `json:"default_action" yaml:"default_action"`
}

type Summary struct {
	Source    string `json:"source"`
	ProfileID string `json:"profile_id"`
	Version   int    `json:"version"`
	Status    string `json:"status,omitempty"`
}

type RuntimeSummary struct {
	GatewayEnabled  bool   `json:"gateway_enabled"`
	CampaignEnabled bool   `json:"campaign_enabled"`
	StorageFailMode string `json:"storage_fail_mode"`
	QueueEnabled    bool   `json:"queue_enabled"`
	BotEnabled      bool   `json:"bot_enabled"`
}

func DefaultLocalProfile() Profile {
	return Profile{
		Source:    SourceLocal,
		ProfileID: "default-local-shadow",
		Version:   1,
		Gateway: GatewayPolicy{
			Enabled: true,
		},
		Campaign: CampaignPolicy{
			Enabled:       true,
			Mode:          ModeShadow,
			DefaultAction: ActionAllow,
		},
		Storage: StoragePolicy{
			FailMode: FailModeOpen,
		},
		Bypass: BypassPolicy{
			StaticAssets: true,
			WPInternal:   true,
			Admin:        true,
			Checkout:     true,
			Cart:         false,
			Account:      false,
			API:          false,
		},
		Methods: MethodsPolicy{
			Managed: []string{"GET", "HEAD", "POST"},
		},
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
		Bot: BotPolicy{
			Enabled:       false,
			DefaultAction: ActionAllow,
		},
		Queue: QueuePolicy{
			Enabled:       false,
			DefaultAction: ActionAllow,
		},
	}
}

func (p Profile) Identity() Summary {
	return Summary{Source: p.Source, ProfileID: p.ProfileID, Version: p.Version}
}

func (p Profile) RuntimeSummary() RuntimeSummary {
	return RuntimeSummary{
		GatewayEnabled:  p.Gateway.Enabled,
		CampaignEnabled: p.Campaign.Enabled,
		StorageFailMode: p.Storage.FailMode,
		QueueEnabled:    p.Queue.Enabled,
		BotEnabled:      p.Bot.Enabled,
	}
}

func (p Profile) SafeLogFields() map[string]any {
	return map[string]any{
		"policy_source":     p.Source,
		"profile_id":        p.ProfileID,
		"version":           p.Version,
		"gateway_enabled":   p.Gateway.Enabled,
		"campaign_enabled":  p.Campaign.Enabled,
		"storage_fail_mode": p.Storage.FailMode,
		"queue_enabled":     p.Queue.Enabled,
		"bot_enabled":       p.Bot.Enabled,
	}
}
