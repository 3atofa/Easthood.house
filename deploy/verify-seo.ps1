<#
.SYNOPSIS
    EAST HOOD — SEO verification (PowerShell).

.DESCRIPTION
    The Windows twin of verify-seo.sh. Run it after every infrastructure
    change; every check here catches a real class of silent regression.

.EXAMPLE
    .\deploy\verify-seo.ps1
    .\deploy\verify-seo.ps1 -Site https://easthood.house
#>

param(
    [string]$Site = 'http://localhost:4000'
)

$ErrorActionPreference = 'Continue'

function Get-Status {
    param([string]$Url, [string]$UserAgent = 'Mozilla/5.0')

    try {
        $r = Invoke-WebRequest -Uri $Url -UserAgent $UserAgent `
                               -MaximumRedirection 0 -SkipHttpErrorCheck `
                               -TimeoutSec 20
        return $r.StatusCode
    }
    catch {
        # PS 5.1 has no -SkipHttpErrorCheck, so a 4xx lands here.
        if ($_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }
        return 0
    }
}

function Get-Body {
    param([string]$Url, [string]$UserAgent = 'Mozilla/5.0')

    try {
        return (Invoke-WebRequest -Uri $Url -UserAgent $UserAgent -TimeoutSec 30).Content
    }
    catch {
        return ''
    }
}

function Write-Check {
    param([string]$Label, $Actual, $Want)

    $ok = "$Actual" -eq "$Want"
    $mark = if ($ok) { 'PASS' } else { 'FAIL' }
    $colour = if ($ok) { 'Green' } else { 'Red' }

    Write-Host ("  {0,-22} {1,-6} (want {2})  {3}" -f $Label, $Actual, $Want, $mark) -ForegroundColor $colour
}

Write-Host "`nSITE: $Site" -ForegroundColor Cyan

# ------------------------------------------------------------------
Write-Host "`n--- data files 404 honestly (soft-404 check) ---" -ForegroundColor Yellow
Write-Check 'missing .xml'  (Get-Status "$Site/definitely-not-here.xml") 404
Write-Check 'sitemap.xml'   (Get-Status "$Site/sitemap.xml")            200
Write-Check 'robots.txt'    (Get-Status "$Site/robots.txt")             200

# ------------------------------------------------------------------
Write-Host "`n--- sitemap: valid XML, real lastmod, full catalogue ---" -ForegroundColor Yellow
$sitemap = Get-Body "$Site/sitemap.xml"

if (-not $sitemap) {
    Write-Host '  could not read the sitemap' -ForegroundColor Red
}
else {
    ($sitemap -split "`n" | Select-Object -First 2) | ForEach-Object { Write-Host "  $_" }

    $urlCount = ([regex]::Matches($sitemap, '<url>')).Count
    Write-Host "  URL count            : $urlCount"

    $dates = [regex]::Matches($sitemap, '<lastmod>([^<]+)') |
             ForEach-Object { $_.Groups[1].Value.Substring(0, 10) } |
             Select-Object -Unique

    Write-Host "  distinct lastmod     : $($dates.Count)"
    if ($dates.Count -eq 1 -and $urlCount -gt 3) {
        Write-Host '  WARNING: every lastmod is the same date — the field looks fabricated,' -ForegroundColor Yellow
        Write-Host '           which teaches crawlers to ignore it.' -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------
Write-Host "`n--- robots.txt declares the sitemap with a real directive ---" -ForegroundColor Yellow
$robots = Get-Body "$Site/robots.txt"
$directive = ($robots -split "`n" | Where-Object { $_ -match '^\s*Sitemap:' })

if ($directive) {
    Write-Host "  $($directive[0].Trim())" -ForegroundColor Green
}
else {
    Write-Host '  MISSING — a bare URL on its own line is silently ignored' -ForegroundColor Red
}

# ------------------------------------------------------------------
Write-Host "`n--- page is real HTML without JS, with its own metadata ---" -ForegroundColor Yellow

# Pick a real article out of the sitemap so the checks mean something.
$articleUrl = ([regex]::Match($sitemap, '<loc>([^<]*\/articles\/[^<]+)')).Groups[1].Value
if (-not $articleUrl) { $articleUrl = "$Site/articles" }

Write-Host "  target: $articleUrl"

$html  = Get-Body $articleUrl 'OAI-SearchBot'
$home  = Get-Body "$Site/"    'OAI-SearchBot'

if (-not $html) {
    Write-Host '  could not fetch the page' -ForegroundColor Red
}
else {
    $h1     = ([regex]::Matches($html, '<h1')).Count
    $canon  = ([regex]::Match($html, 'rel="canonical"[^>]*href="([^"]+)')).Groups[1].Value
    $title  = ([regex]::Match($html, '<title[^>]*>([^<]*)')).Groups[1].Value
    $desc   = ([regex]::Match($html, 'name="description"[^>]*content="([^"]{0,60})')).Groups[1].Value
    $ld     = ([regex]::Matches($html, 'application/ld\+json')).Count
    $og     = ([regex]::Match($html, 'og:image"[^>]*content="([^"]+)')).Groups[1].Value
    $words  = (($html -replace '<[^>]+>', ' ') -split '\s+' | Where-Object { $_ }).Count

    Write-Host "  bytes                : $($html.Length)"
    Write-Host "  homepage bytes       : $($home.Length)"
    Write-Check 'h1 count' $h1 1
    Write-Host "  title                : $title"
    Write-Host "  canonical            : $(if ($canon) { $canon } else { 'MISSING' })"
    Write-Host "  description          : $(if ($desc) { $desc } else { 'MISSING' })"
    Write-Host "  json-ld blocks       : $ld  (want 2-3 on an article)"
    Write-Host "  og:image             : $(if ($og) { $og } else { 'MISSING' })"

    if ($words -gt 150) {
        Write-Host "  body in HTML         : YES ($words words)" -ForegroundColor Green
    }
    else {
        Write-Host "  body in HTML         : NO ($words words) — this is the shell, not the page" -ForegroundColor Red
    }

    if ([math]::Abs($html.Length - $home.Length) -lt 500) {
        Write-Host '  WARNING: this page is within 500 bytes of the homepage — it probably' -ForegroundColor Yellow
        Write-Host '           fell back to the shell and will not index.' -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------
Write-Host "`n--- AI citation crawlers reach the edge ---" -ForegroundColor Yellow

foreach ($ua in @(
    'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User',
    'PerplexityBot', 'Googlebot', 'Bingbot', 'Google-Extended'
)) {
    $code = Get-Status $articleUrl $ua
    $colour = if ($code -eq 200) { 'Green' } else { 'Red' }
    Write-Host ("  {0,-18} -> {1}" -f $ua, $code) -ForegroundColor $colour
}

Write-Host "`nAll must be 200. A 403 or 429 means the CDN is blocking that assistant"
Write-Host "regardless of what robots.txt says.`n"
