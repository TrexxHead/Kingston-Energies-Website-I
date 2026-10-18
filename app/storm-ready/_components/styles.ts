export const STORM_READY_CSS = `
.ke-sr-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px;align-items:start}
.ke-sr-h3{font-family:var(--font-display);font-weight:700;font-size:14px;letter-spacing:.02em;color:var(--ke-dark-text);margin:0 0 6px;padding:0}
.ke-sr-car{display:grid;gap:6px;padding:12px 14px;border-radius:14px;background:rgba(62,207,142,.06);border:1px solid rgba(62,207,142,.22)}
.ke-sr-mini{width:46px;height:26px;padding:0 6px;border-radius:7px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);color:#fff;text-align:center}
.ke-sr-link{display:inline-flex;align-items:center;gap:5px;background:none;border:0;padding:0;color:var(--ke-green-400);font:inherit;font-size:13.5px;font-weight:600;text-decoration:none;cursor:pointer}
.ke-sr-link:hover{text-decoration:underline}
.ke-sr-note{margin:0;padding:12px 14px;border-radius:12px;background:rgba(255,200,87,.08);border:1px solid rgba(255,200,87,.28);color:var(--ke-dark-text);font-size:14px;line-height:1.55}
.ke-sr-storms{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.ke-sr-storm{display:grid;gap:12px;padding:16px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)}
.ke-sr-storm__head{display:flex;gap:12px;align-items:flex-start;color:#fff;font-size:17px}
.ke-sr-storm__head svg{color:var(--ke-sun-300);margin-top:3px;flex:none}
.ke-sr-badge{display:inline-block;margin-left:10px;padding:2px 9px;border-radius:999px;border:1px solid #f6a5a5;color:#f6a5a5;font-size:12px;font-weight:700;vertical-align:2px}
.ke-sr-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0}
.ke-sr-facts dt{font-size:12px;color:var(--ke-dark-text-muted)}
.ke-sr-facts dd{margin:2px 0 0;color:#fff;font-weight:700;font-variant-numeric:tabular-nums}
.ke-sr-facts small{font-weight:500;color:var(--ke-dark-text-muted)}
.ke-sr-rows{display:grid;gap:6px}
.ke-sr-row{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) 54px 32px;gap:6px;align-items:center}
.ke-sr-row--head span{font-size:12px;color:var(--ke-dark-text-muted)}
.ke-sr-icon{display:grid;place-items:center;width:32px;height:38px;border-radius:8px;background:none;border:1px solid rgba(255,255,255,.12);color:var(--ke-dark-text-muted);cursor:pointer}
.ke-sr-icon:hover{color:#f6a5a5;border-color:rgba(246,165,165,.4)}
.ke-sr-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ke-sr-result{display:grid;gap:12px;padding:18px;border-radius:16px;background:rgba(63,157,42,.07);border:1px solid rgba(110,200,90,.22)}
.ke-sr-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.ke-sr-checks>div{display:grid;gap:4px}
.ke-sr-check-label{font-size:13px;color:var(--ke-dark-text)}
.ke-sr-progress{height:8px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}
.ke-sr-progress i{display:block;height:100%;background:var(--ke-green-400);border-radius:999px;transition:width .3s}
.ke-sr-group{border:0;margin:0;padding:0;display:grid;gap:8px}
.ke-sr-item{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.5;color:var(--ke-dark-text);cursor:pointer}
.ke-sr-item input{margin-top:4px;width:17px;height:17px;accent-color:var(--ke-green-500);flex:none}
.ke-sr-item input:checked+span{color:var(--ke-dark-text-muted);text-decoration:line-through}
.ke-sr-safety{display:grid;gap:14px;padding:24px;border-radius:20px;background:rgba(217,83,79,.06);border:1px solid rgba(246,165,165,.22)}
.ke-sr-safety ul{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14px;line-height:1.55;color:var(--ke-dark-text)}
.ke-sr-map{height:clamp(280px,42vh,420px);border-radius:16px;overflow:hidden;background:#a7d3ee}
.ke-sr-shelters{list-style:none;margin:0;padding:0;display:grid;gap:8px;max-height:420px;overflow:auto}
.ke-sr-shelters li{display:grid;grid-template-columns:20px 1fr auto;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);color:#fff}
.ke-sr-shelters li svg{color:var(--ke-blue-300)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:560px){.ke-sr-row{grid-template-columns:minmax(0,1fr) 64px 56px 44px 32px}.ke-sr-row--head span:first-child{visibility:visible}}
`
