package shadow

type Payload struct {
	SchemaVersion string      `json:"schema_version"`
	Timestamp     int64       `json:"timestamp"`
	Site          Site        `json:"site"`
	Request       Request     `json:"request"`
	PHPDecision   PHPDecision `json:"php_decision"`
	Runtime       Runtime     `json:"runtime"`
}

type Site struct {
	Host   string `json:"host"`
	Scheme string `json:"scheme"`
}

type Request struct {
	IP        string `json:"ip"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Query     string `json:"query"`
	UserAgent string `json:"user_agent"`
	Referer   string `json:"referer"`
	Accept    string `json:"accept"`
	IsAjax    bool   `json:"is_ajax"`
}

type PHPDecision struct {
	Action     string `json:"action"`
	Reason     string `json:"reason"`
	Status     int    `json:"status"`
	RetryAfter *int   `json:"retry_after"`
}

type Runtime struct {
	StorageAvailable bool   `json:"storage_available"`
	StorageFailMode  string `json:"storage_fail_mode"`
	GatewayEnabled   bool   `json:"gateway_enabled"`
	CampaignEnabled  bool   `json:"campaign_enabled"`
}

const SchemaVersion = "r3.shadow.v1"

var allowedActions = map[string]bool{
	"allow": true,
	"queue": true,
	"block": true,
	"wait":  true,
	"pass":  true,
}

func (p Payload) Action() string {
	if allowedActions[p.PHPDecision.Action] {
		return p.PHPDecision.Action
	}
	return "unknown"
}

func (p Payload) IsSupportedSchema() bool {
	return p.SchemaVersion == SchemaVersion
}
