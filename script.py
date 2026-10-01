import sys

with open("src/style.css", "r", encoding="utf-8") as f:
    lines = f.read().splitlines()

def replace_lines(start, end, new_lines):
    lines[start-1:end] = new_lines.splitlines()

# 6. Pp-grid deletion (lines 12306-12310)
replace_lines(12306, 12310, "")

# 5. Pp-page (lines 11499-11534)
replace_lines(11499, 11534, """@media (max-width: 1024px) {
  .pp-page { overflow-y: auto; height: 100%; min-height: 0; padding: 32px 24px 80px; }
  .pp-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .pp-page { overflow-y: auto; height: 100%; min-height: 0; padding: 24px 16px 80px; }
  .pp-page-header { flex-direction: column; align-items: flex-start; margin-bottom: 24px; gap: 12px; }
  .pp-header-aside { width: 100%; justify-content: flex-start; }
  .pp-avatar-card { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .pp-avatar-wrap { margin-right: 0; margin-bottom: 12px; }
  .pp-upload-btn { margin-left: 0; margin-top: 16px; width: 100%; justify-content: center; }
  .pp-fields { grid-template-columns: 1fr; }
  .pp-field--wide { grid-column: 1; }
  .pp-save-btn { width: 100%; justify-content: center; }
  .pp-form-footer { justify-content: stretch; }
}""")

# 4. Np-page (lines 11071-11076)
replace_lines(11071, 11076, """@media (max-width: 1024px) {
  .np-page { overflow-y: auto; height: 100%; min-height: 0; padding: 32px 24px 80px; }
}
@media (max-width: 768px) {
  .np-page { overflow-y: auto; height: 100%; min-height: 0; padding: 24px 16px 80px; }
  .np-page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .np-header-aside { width: 100%; justify-content: flex-start; }
}""")

# 3. Np-grid (lines 10903-10910)
replace_lines(10903, 10910, """@media (max-width: 1024px) {
  .np-grid { grid-template-columns: repeat(2, 1fr); }
  .np-grid > :last-child { grid-column: 1 / -1; }
}
@media (max-width: 768px) {
  .np-grid { grid-template-columns: 1fr; }
  .np-grid > :last-child { grid-column: auto; }
}""")

# 2. Cp-page (lines 10802-10806)
replace_lines(10802, 10806, """@media (max-width: 1024px) {
  .cp-page { overflow-y: auto; height: 100%; min-height: 0; padding: 32px 24px 80px; }
}
@media (max-width: 768px) {
  .cp-page { overflow-y: auto; height: 100%; min-height: 0; padding: 24px 16px 80px; }
  .cp-card-actions { gap: 8px; flex-direction: column; width: 100%; }
  .cp-card-actions .cp-btn { width: 100%; justify-content: center; }
  .cp-btn--sm { padding: 8px 12px; font-size: 13px; }
  .cp-card { flex-direction: column; align-items: stretch; text-align: center; }
  .cp-card-avatar-wrap { margin: 0 auto; }
}""")

# 1. Cp-grid (lines 10386-10388)
replace_lines(10386, 10388, """@media (max-width: 1024px) {
  .cp-grid { grid-template-columns: 1fr; }
}""")

# 0. Sp-layout (lines 10215-10302)
replace_lines(10215, 10302, """@media (max-width: 1024px) {
  .sp-layout { grid-template-columns: 1fr; gap: 32px; }
  .sp-main { grid-template-columns: 1fr; }
  .sp-nav { position: static; flex-direction: row; flex-wrap: wrap; gap: 8px; }
  .sp-nav-item { width: auto; flex: 1 1 auto; justify-content: center; padding: 12px 16px; font-size: 14.5px; }
  .sp-nav-divider { display: none; }
  .sp-page { overflow-y: auto; height: 100%; min-height: 0; padding: 32px 24px 80px; }
  .sp-card-header, .sp-card-body { padding: 24px; }
  .sp-card-footer { padding: 20px 24px; }
}

@media (max-width: 768px) {
  .sp-page { overflow-y: auto; height: 100%; min-height: 0; padding: 24px 16px 80px; }
  
  .sp-session-item { flex-direction: column; align-items: stretch; text-align: center; gap: 16px; padding: 20px 16px; }
  .sp-session-icon { margin: 0 auto; }
  .sp-session-title-row { justify-content: center; flex-wrap: wrap; }
  .sp-session-meta { justify-content: center; }
  
  .sp-card-header { flex-direction: column; align-items: flex-start; text-align: left; gap: 16px; padding: 24px 16px; }
  .sp-card-body { padding: 24px 16px; }
  .sp-card-footer { padding: 20px 16px; justify-content: stretch; flex-direction: column; gap: 12px; }
  .sp-card-footer .sp-btn { width: 100%; justify-content: center; }
  
  .sp-toggle-row { flex-direction: column; align-items: flex-start; gap: 12px; }
  .sp-toggle-switch { align-self: flex-start; }
  
  .sp-nav-item { font-size: 13.5px; padding: 10px 12px; }
}""")

with open("src/style.css", "w", encoding="utf-8") as f:
    f.write("\\n".join(lines) + "\\n")
