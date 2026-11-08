$csv = Import-Csv -Path "prefixes.csv"

# Initializing options with Thailand first
$phoneOptionsHtml =  "                                                <option value=`"+66`">Thailand +66</option>`r`n"
$countryOptionsHtml = "                                                <option value=`"Thailand`">Thailand</option>`r`n"

foreach ($row in $csv) {
    $country = $row.Country
    $code = $row."Country Code"
    
    if ($country -notmatch "^(?i)Thailand$") {
        $phoneOptionsHtml += "                                                <option value=`"+$code`">$country +$code</option>`r`n"
        $countryOptionsHtml += "                                                <option value=`"$country`">$country</option>`r`n"
    }
}

function Update-HtmlFile {
    param([string]$FilePath)
    
    if (!(Test-Path $FilePath)) {
        Write-Output "File not found: $FilePath"
        return
    }

    $content = [System.IO.File]::ReadAllText($FilePath)
    
    # 1. Replace Phone Prefixes (.phone-prefix-select)
    $phoneRegex = '(?s)(<select[^>]*class="[^"]*phone-prefix-select[^"]*"[^>]*>).*?(</select>)'
    $phoneEvaluator = [System.Text.RegularExpressions.MatchEvaluator] {
        param($match)
        return $match.Groups[1].Value + "`r`n" + $phoneOptionsHtml + "                                            " + $match.Groups[2].Value
    }
    $content = [System.Text.RegularExpressions.Regex]::Replace($content, $phoneRegex, $phoneEvaluator)

    # 2. Replace Countries (.country-select)
    $countryRegex = '(?s)(<select[^>]*class="[^"]*country-select[^"]*"[^>]*>).*?(</select>)'
    $countryEvaluator = [System.Text.RegularExpressions.MatchEvaluator] {
        param($match)
        return $match.Groups[1].Value + "`r`n" + $countryOptionsHtml + "                                            " + $match.Groups[2].Value
    }
    $content = [System.Text.RegularExpressions.Regex]::Replace($content, $countryRegex, $countryEvaluator)
    
    [System.IO.File]::WriteAllText($FilePath, $content)
    Write-Output "Updated $FilePath"
}

Update-HtmlFile -FilePath "account.html"
Update-HtmlFile -FilePath "register.html"
Update-HtmlFile -FilePath "checkout.html"
Update-HtmlFile -FilePath "account/personal-data.html"

Write-Output "Sync complete."
