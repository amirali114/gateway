body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    font-family: var(--ux-font-ui);
    font-size: 14px;
    line-height: 1.8;
    background:
        radial-gradient(circle at top left, rgba(76,201,240,0.25), transparent 60%),
        radial-gradient(circle at bottom right, rgba(0 0 0 / 20%), transparent 55%),
        linear-gradient(135deg, <?php echo htmlspecialchars($bg_color, ENT_QUOTES, 'UTF-8'); ?>, #02010f);
    color: <?php echo htmlspecialchars($text_main, ENT_QUOTES, 'UTF-8'); ?>;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding:16px;
    <?php if ($body_font): ?>
    font-family: <?php echo htmlspecialchars($body_font, ENT_QUOTES, 'UTF-8'); ?>;
    <?php else: ?>
    <?php endif; ?>
    -webkit-font-smoothing: antialiased;
    font-smooth: antialiased;
    text-rendering: optimizeLegibility;
}
html[dir="rtl"] body {
    direction: rtl;
}
:lang(en),
input::placeholder,
textarea::placeholder {
    font-family: var(--ux-font-en) !important;
}

.ux-wrapper {
    max-width: 540px;
    width:100%;
    padding: 30px 22px 24px;
    background: <?php echo htmlspecialchars($card_bg, ENT_QUOTES, 'UTF-8'); ?>;
    border-radius: 26px;
    box-shadow: <?php echo htmlspecialchars($card_box_shadow, ENT_QUOTES, 'UTF-8'); ?>;
    border: <?php echo htmlspecialchars($card_border_css, ENT_QUOTES, 'UTF-8'); ?>;
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    position: relative;
    overflow: hidden;
}
.ux-wrapper::before {
    content: "";
    position: absolute;
    inset: -60%;
    background:
        linear-gradient(120deg, rgba(255,255,255,0.12), transparent 60%),
        radial-gradient(circle at 0% 0%, rgba(255,255,255,0.16), transparent 55%),
        radial-gradient(circle at 100% 100%, rgba(255,255,255,0.08), transparent 60%);
    opacity: 0.9;
    pointer-events: none;
}
.ux-inner {
    position: relative;
    z-index: 2;
}
.ux-brand {
    font-size: 12px;
    opacity: 0.85;
    margin-bottom: 10px;
    color: rgba(245,245,247,0.85);
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
}
.ux-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: <?php echo htmlspecialchars($primary_color, ENT_QUOTES, 'UTF-8'); ?>;
    box-shadow: 0 0 0 0 rgba(255,255,255,0.6);
    animation: ux-ping 1.6s infinite;
}
@keyframes ux-ping {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(2.3); opacity: 0; }
}
.ux-title {
    font-size: <?php echo htmlspecialchars($title_fs, ENT_QUOTES, 'UTF-8'); ?>;
    font-weight: 700;
    margin: 8px 0 6px;
}
.ux-subtitle {
    font-size: <?php echo htmlspecialchars($subtitle_fs, ENT_QUOTES, 'UTF-8'); ?>;
    line-height: 1.9;
    opacity: 0.92;
    margin-bottom: 18px;
    white-space: pre-line;
    color: rgba(245,245,247,0.85);
}
.ux-media {
    margin-bottom: 16px;
}
.ux-countdown {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin: 18px 0 10px;
}
.ux-countdown-item {
    background: rgba(0,0,0,0.26);
    padding: 8px 8px;
    border-radius: 16px;
    min-width: 64px;
    box-shadow: 0 10px 26px rgba(0,0,0,0.6);
    border:1px solid rgba(255,255,255,0.16);
}
.ux-countdown-value {
    font-size: 17px;
    font-weight: 700;
    color: <?php echo htmlspecialchars($primary_color, ENT_QUOTES, 'UTF-8'); ?>;
}
.ux-countdown-label {
    font-size: 11px;
    opacity: 0.9;
}
.ux-footer {
    margin-top: 18px;
    font-size: 11px;
    color: rgba(245,245,247,0.8);
}
.ux-btn {
    display: inline-block;
    margin-top: 12px;
    padding: 8px 18px;
    border-radius: 999px;
    background: linear-gradient(135deg, <?php echo htmlspecialchars($primary_color, ENT_QUOTES, 'UTF-8'); ?>, #000000);
    color: #fff;
    font-size: 13px;
    text-decoration: none;
    box-shadow: <?php echo htmlspecialchars($btn_shadow, ENT_QUOTES, 'UTF-8'); ?>;
}
.ux-custom {
    margin-top: 14px;
    font-size: 13px;
}
@media (max-width: 480px) {
    .ux-wrapper {
        padding: 24px 16px 20px;
    }
}

.ux-media {
    margin: 14px 0;
}
.ux-media-inner {
    display: inline-block;
    max-width: 100%;
}
.ux-media-inner img {
    max-width: 100%;
}
@media (min-width: 768px) {
    .ux-media-inner {
        width: <?php echo (int)$media_width_desktop; ?>%;
    }
}
@media (max-width: 767.98px) {
    .ux-media-inner {
        width: <?php echo (int)$media_width_mobile; ?>%;
    }
}
