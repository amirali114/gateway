package pathclass

import "testing"

func TestClassifyRequestPath(t *testing.T) {
	cases := []struct {
		path  string
		query string
		want  string
	}{
		{path: "/wp-content/app.css", want: StaticAsset},
		{path: "/wp-cron.php", want: WPInternal},
		{path: "/wp-admin/admin-ajax.php", want: WPInternal},
		{path: "/wp-admin/edit.php", want: Admin},
		{path: "/wp-login.php", want: Admin},
		{path: "/checkout/order-pay/123", want: Checkout},
		{path: "/", query: "wc-api=WC_Gateway_Test", want: Checkout},
		{path: "/", query: "add-to-cart=123", want: Cart},
		{path: "/", query: "product=123", want: Product},
		{path: "/", query: "p=123", want: Product},
		{path: "/", query: "rest_route=/wc/v3/orders", want: API},
		{path: "/product/test", query: "secret=1", want: Product},
		{path: "/checkout/", query: "token=secret", want: Checkout},
		{path: "/cart/", want: Cart},
		{path: "/my-account/orders/", want: Account},
		{path: "/wp-json/wc/v3/products", want: API},
		{path: "/some-page/", want: Other},
	}
	for _, tc := range cases {
		if got := ClassifyRequestPath(tc.path, tc.query); got != tc.want {
			t.Fatalf("ClassifyRequestPath(%q,%q)=%q want %q", tc.path, tc.query, got, tc.want)
		}
	}
}

func TestSafeQueryKeysDoesNotReturnValues(t *testing.T) {
	keys := SafeQueryKeys("wc-api=SecretGateway&token=supersecret")
	for _, key := range keys {
		if key == "SecretGateway" || key == "supersecret" || key == "token=supersecret" {
			t.Fatalf("query values leaked in keys: %+v", keys)
		}
	}
}
