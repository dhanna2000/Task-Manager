Add-Type -AssemblyName System.IO.Compression.FileSystem

$modsDir = "C:\Users\danny\AppData\Roaming\ModrinthApp\profiles\Create\mods"
$items = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

# Keys to skip — these match items/blocks keys but are UI labels, not things you gather
$skipPrefixes = @('item.modifiers.', 'item.nbt.', 'block.minecraft.banner_pattern')

Get-ChildItem -Path $modsDir -Filter "*.jar" | ForEach-Object {
    $jarName = $_.Name
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($_.FullName)
        # Each mod may have multiple lang files under assets/<modid>/lang/
        $langEntries = $zip.Entries | Where-Object {
            $_.FullName -match "^assets/[^/]+/lang/en_us\.json$"
        }
        foreach ($entry in $langEntries) {
            try {
                $stream = $entry.Open()
                $reader = [System.IO.StreamReader]::new($stream)
                $json = $reader.ReadToEnd()
                $reader.Close(); $stream.Close()

                $data = $json | ConvertFrom-Json -ErrorAction Stop
                $data.PSObject.Properties | ForEach-Object {
                    $key = $_.Name
                    $val = $_.Value
                    if ($key -match "^(item|block)\." -and $val -and $val.Trim() -ne '') {
                        $skip = $false
                        foreach ($pfx in $skipPrefixes) { if ($key.StartsWith($pfx)) { $skip = $true; break } }
                        if (-not $skip) {
                            [void]$items.Add($val.Trim())
                        }
                    }
                }
            } catch {
                Write-Warning "  Lang parse failed in $jarName / $($entry.FullName): $_"
            }
        }
        $zip.Dispose()
    } catch {
        Write-Warning "Could not open $jarName`: $_"
    }
}

$sorted = $items | Sort-Object
Write-Output "Extracted $($sorted.Count) unique item/block names" >&2
$sorted | ConvertTo-Json -Compress
