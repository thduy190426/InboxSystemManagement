 = 'src\style.css'
 = Get-Content  -Raw
 =  -replace "\[data-theme='dark'\] \.sp-select", "html.dark .sp-select"
Set-Content -Path  -Value  -Encoding utf8
