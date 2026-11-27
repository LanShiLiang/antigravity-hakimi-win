# Extract a verified Antigravity App installer without running it or starting the app.
[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Installer)
$ErrorActionPreference = 'Stop'

if ([Environment]::OSVersion.Platform -ne 'Win32NT') { throw 'Windows is required.' }
$repo = Split-Path -Parent $PSScriptRoot
$stageRoot = Join-Path $repo '.stage\windows-x64'
$source = Get-Item -LiteralPath $Installer
$tar = Join-Path ([Environment]::SystemDirectory) 'tar.exe'
if (-not (Test-Path -LiteralPath $tar -PathType Leaf)) { throw 'Windows bsdtar (tar.exe) is required.' }

# Never stage through an existing junction or inside an installation of the official app.
for ($dir = [IO.DirectoryInfo]::new($stageRoot); $null -ne $dir; $dir = $dir.Parent) {
    if (($dir.Exists -and ($dir.Attributes -band [IO.FileAttributes]::ReparsePoint)) -or
        (Test-Path -LiteralPath (Join-Path $dir.FullName 'Antigravity.exe'))) {
        throw "Unsafe staging ancestor: $($dir.FullName)"
    }
}
& node (Join-Path $PSScriptRoot 'windows-base.js') --guard $stageRoot
if ($LASTEXITCODE -ne 0) { throw 'Staging path was rejected.' }

# Hold the file read-only, also preventing replacement between signature verification and extraction.
$lock = [IO.File]::Open($source.FullName, 'Open', 'Read', 'Read')
try {
    $signature = Get-AuthenticodeSignature -LiteralPath $source.FullName
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.GetNameInfo('SimpleName', $false) -ne 'Google LLC') {
        throw "Expected a valid Google LLC signature. Status: $($signature.Status)"
    }
    $version = $source.VersionInfo.FileVersion
    if ($source.VersionInfo.ProductName -ne 'Antigravity' -or $version -notmatch '^\d+(\.\d+){2,3}$') {
        throw 'Expected a versioned Antigravity App installer.'
    }

    $destination = Join-Path $stageRoot $version
    if (Test-Path -LiteralPath $destination) { throw "Stage already exists: $destination" }
    $entries = @(& $tar -tf $source.FullName)
    if ($LASTEXITCODE -ne 0 -or 'Antigravity.exe' -cnotin $entries -or 'resources/app.asar' -cnotin $entries) {
        throw 'Unsupported installer layout.'
    }
    foreach ($entry in $entries) {
        if ($entry -match '(^[/\\]|:|(^|[/\\])\.\.([/\\]|$))') { throw "Invalid archive path: $entry" }
    }

    [void][IO.Directory]::CreateDirectory($stageRoot)
    $scratch = Join-Path $stageRoot ('.partial-' + [Guid]::NewGuid().ToString('N'))
    [void](New-Item -ItemType Directory -Path $scratch -ErrorAction Stop)
    try {
        & $tar -xf $source.FullName -C $scratch
        if ($LASTEXITCODE -ne 0) { throw 'Extraction failed.' }
        $inspection = & node (Join-Path $PSScriptRoot 'windows-base.js') --inspect $scratch
        if ($LASTEXITCODE -ne 0) { throw 'Client inspection failed.' }
        $report = $inspection | ConvertFrom-Json
        if ($report.appVersion -ne $version) { throw 'Installer and app versions differ.' }
        $report | Add-Member -NotePropertyName installerSha256 -NotePropertyValue (Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash
        $report | Add-Member -NotePropertyName installerSigner -NotePropertyValue $signature.SignerCertificate.Subject
        $report | Add-Member -NotePropertyName signatureStatus -NotePropertyValue $signature.Status.ToString()
        [IO.File]::WriteAllText((Join-Path $scratch 'windows-base.json'), ($report | ConvertTo-Json -Depth 5))
        [IO.Directory]::Move($scratch, $destination)
        Write-Output "Verified Windows x64 base: $destination"
    } finally {
        if (Test-Path -LiteralPath $scratch) {
            $owned = Get-Item -LiteralPath $scratch -Force
            if ($owned.Parent.FullName -eq $stageRoot -and $owned.Name -match '^\.partial-[a-f0-9]{32}$' -and
                -not ($owned.Attributes -band [IO.FileAttributes]::ReparsePoint) -and
                (Resolve-Path -LiteralPath $scratch).Path -eq $scratch) { Remove-Item -LiteralPath $scratch -Recurse -Force }
        }
    }
} finally {
    $lock.Dispose()
}
