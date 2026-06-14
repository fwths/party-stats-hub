$json = (Get-Content -Path "C:\Users\garas\.gemini\antigravity\brain\0726003b-df1f-48dd-8cd9-891dbc32a0ed\.system_generated\steps\215\content.md" | Select-Object -Skip 8) | ConvertFrom-Json
$mods = @()
if ($json.data.modifiers.class) { $mods += $json.data.modifiers.class }
if ($json.data.modifiers.race) { $mods += $json.data.modifiers.race }
if ($json.data.modifiers.background) { $mods += $json.data.modifiers.background }
if ($json.data.modifiers.item) { $mods += $json.data.modifiers.item }
if ($json.data.modifiers.feat) { $mods += $json.data.modifiers.feat }
$mods | Where-Object { $_.subType -match 'armor-class' } | ConvertTo-Json -Depth 10
