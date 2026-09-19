# Opens your stream's chat in its own window, with the mod bot watching it.
#
# Called by "Pokebank Mod Bot.cmd". Written for Windows PowerShell 5.1, which
# is what ships with Windows - so no PS7-only syntax (no ??, no ternaries).

[CmdletBinding()]
param(
  [string]$Url = '',
  [switch]$DryRun,        # print the command instead of running it (for tests)
  [switch]$SetupOnly,
  [string]$BrowserPath = '',    # tests only; normally discovered
  [switch]$SelfTest
)

$ErrorActionPreference = 'Stop'
$ExtDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# Join-Path throws on a null root, and an absent environment variable is a
# confusing way to die. Everything built from $env: goes through this.
function Join-Safe([string]$root, [string]$leaf) {
  if (-not $root) { return '' }
  return (Join-Path $root $leaf)
}

$StateRoot = $env:LOCALAPPDATA
if (-not $StateRoot) { $StateRoot = $env:APPDATA }
if (-not $StateRoot) { $StateRoot = $env:TEMP }
if (-not $StateRoot) { $StateRoot = $ExtDir }
$StateDir = Join-Safe $StateRoot 'PokebankModBot'
$SetupMarker = Join-Safe $StateDir 'setup-done.txt'

function Say([string]$text) { Write-Host $text }
function Fail([string]$text) {
  Write-Host ''
  Write-Host "  $text" -ForegroundColor Red
  Write-Host ''
  if (-not $DryRun) { Read-Host 'Press Enter to close' }
  exit 1
}

# ── the video id ───────────────────────────────────────────────────────────
# Every shape a YouTube link comes in, plus a bare id. Ids are 11 characters
# of [A-Za-z0-9_-]; anything else pasted in is a mistake worth naming rather
# than quietly opening an empty chat.
function Get-VideoId([string]$text) {
  if (-not $text) { return '' }
  $t = $text.Trim().Trim('"').Trim("'")

  $patterns = @(
    '[?&]v=([A-Za-z0-9_-]{11})',            # watch?v=ID, live_chat?v=ID
    'youtu\.be/([A-Za-z0-9_-]{11})',        # youtu.be/ID
    '/live/([A-Za-z0-9_-]{11})',            # /live/ID
    '/embed/([A-Za-z0-9_-]{11})',           # /embed/ID
    '/shorts/([A-Za-z0-9_-]{11})',          # /shorts/ID
    '/video/([A-Za-z0-9_-]{11})'            # studio.youtube.com/video/ID/...
  )
  foreach ($p in $patterns) {
    $m = [regex]::Match($t, $p)
    if ($m.Success) { return $m.Groups[1].Value }
  }

  # A bare id, on its own.
  $m = [regex]::Match($t, '^([A-Za-z0-9_-]{11})$')
  if ($m.Success) { return $m.Groups[1].Value }

  return ''
}

# A channel link has no video in it, and is the easy mistake: the address bar
# often says /@name/live rather than the stream's own URL.
function Test-ChannelLink([string]$text) {
  if (-not $text) { return $false }
  return [regex]::IsMatch($text, '(youtube\.com/(@|c/|channel/|user/))')
}

if ($SelfTest) {
  $cases = @(
    @('https://www.youtube.com/watch?v=dmVCwUZT48s', 'dmVCwUZT48s'),
    @('https://youtu.be/dmVCwUZT48s', 'dmVCwUZT48s'),
    @('https://youtu.be/dmVCwUZT48s?si=xKq1', 'dmVCwUZT48s'),
    @('https://www.youtube.com/live/dmVCwUZT48s', 'dmVCwUZT48s'),
    @('https://www.youtube.com/live/dmVCwUZT48s?feature=share', 'dmVCwUZT48s'),
    @('https://www.youtube.com/watch?v=dmVCwUZT48s&t=30s', 'dmVCwUZT48s'),
    @('https://m.youtube.com/watch?v=dmVCwUZT48s', 'dmVCwUZT48s'),
    @('https://studio.youtube.com/video/dmVCwUZT48s/livestreaming', 'dmVCwUZT48s'),
    @('https://www.youtube.com/live_chat?v=dmVCwUZT48s', 'dmVCwUZT48s'),
    @('https://www.youtube.com/embed/dmVCwUZT48s', 'dmVCwUZT48s'),
    @('dmVCwUZT48s', 'dmVCwUZT48s'),
    @('  https://youtu.be/dmVCwUZT48s  ', 'dmVCwUZT48s'),
    @('"https://youtu.be/dmVCwUZT48s"', 'dmVCwUZT48s'),
    @('https://www.youtube.com/@Pokebank', ''),
    @('https://www.youtube.com/@Pokebank/live', ''),
    @('https://www.youtube.com/@Pokebank/videos', ''),
    @('not a link at all', ''),
    @('', '')
  )
  $bad = 0
  foreach ($c in $cases) {
    $got = Get-VideoId $c[0]
    if ($got -ne $c[1]) {
      Write-Host ("  FAIL  '{0}' -> '{1}', expected '{2}'" -f $c[0], $got, $c[1])
      $bad = $bad + 1
    } else {
      Write-Host ("  ok    '{0}' -> '{1}'" -f $c[0], $got)
    }
  }
  foreach ($ch in @('https://www.youtube.com/@Pokebank', 'https://www.youtube.com/@Pokebank/live')) {
    if (-not (Test-ChannelLink $ch)) { Write-Host "  FAIL  channel link not recognised: $ch"; $bad = $bad + 1 }
    else { Write-Host "  ok    recognised as a channel link: $ch" }
  }
  if ($bad -gt 0) { Write-Host "`n$bad failing"; exit 1 }
  Write-Host "`nall passing"
  exit 0
}

# ── chrome ─────────────────────────────────────────────────────────────────
function Find-Browser {
  $candidates = @(
    (Join-Safe $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Safe ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Safe $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
    (Join-Safe $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Safe ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe')
  )
  foreach ($c in $candidates) {
    if ($c -and (Test-Path $c)) { return $c }
  }

  # Whatever the system has registered for chrome.exe.
  $key = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe'
  if (Test-Path $key) {
    $p = (Get-ItemProperty $key).'(default)'
    if ($p -and (Test-Path $p)) { return $p }
  }
  return ''
}

# ── one-time setup ─────────────────────────────────────────────────────────
# Chrome has no way to be told "install this unpacked extension", so this part
# cannot be automated. What it can do is put both windows in front of you at
# once: dragging the folder onto the extensions page installs it, which is
# fewer steps and fewer wrong turns than the file picker.
function Show-Setup([string]$browser) {
  Say ''
  Say '  FIRST TIME ONLY - about 20 seconds'
  Say '  ----------------------------------'
  Say '  Two windows are opening: Chrome extensions, and this folder.'
  Say ''
  Say '   1. In Chrome, turn ON "Developer mode" (top right)'
  Say '   2. Drag the folder from Explorer onto the Chrome window'
  Say ''
  Say '  That installs it. You never do this again.'
  Say ''
  if ($DryRun) { Say "  [dry run] would open chrome://extensions and $ExtDir"; return }

  Start-Process $browser 'chrome://extensions'
  Start-Sleep -Milliseconds 700
  Start-Process 'explorer.exe' $ExtDir
  Read-Host '  Press Enter once you have dragged it in'

  if ($StateDir -and -not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir -Force | Out-Null }
  if ($SetupMarker) { Set-Content -Path $SetupMarker -Value (Get-Date).ToString('o') }
}

# One double-click from the desktop, from here on.
#
# Runs before anything else and on every launch, not as a step inside setup:
# it used to sit behind "press Enter once you have dragged it in", so closing
# the window at the extension step meant no icon ever appeared - and no icon
# looks exactly like nothing happened.
function New-DesktopIcon {
  $desktop = [Environment]::GetFolderPath('Desktop')
  if (-not $desktop -or -not (Test-Path $desktop)) {
    Say '  Could not find your Desktop folder. Drag "Pokebank Mod Bot.cmd" there yourself.'
    return
  }
  $link = Join-Path $desktop 'Pokebank Mod Bot.lnk'
  if (Test-Path $link) { return }

  try {
    $shell = New-Object -ComObject WScript.Shell
    $sc = $shell.CreateShortcut($link)
    $sc.TargetPath = (Join-Path $ExtDir 'Pokebank Mod Bot.cmd')
    $sc.WorkingDirectory = $ExtDir
    $sc.Description = 'Moderate my YouTube live chat'
    $icon = Join-Path $ExtDir 'icon.ico'
    if (Test-Path $icon) { $sc.IconLocation = $icon }
    $sc.Save()
    if (Test-Path $link) {
      Say ''
      Say '  Put "Pokebank Mod Bot" on your Desktop.'
    } else {
      Say '  The shortcut did not save. Drag "Pokebank Mod Bot.cmd" to your Desktop instead.'
    }
  } catch {
    Say ''
    Say '  Could not create the Desktop shortcut:'
    Say ("    " + $_.Exception.Message)
    Say '  Drag "Pokebank Mod Bot.cmd" to your Desktop instead - it works the same.'
  }
}

# ── main ───────────────────────────────────────────────────────────────────
Say ''
Say '  Pokebank chat mod bot'
Say '  ====================='

$browser = $BrowserPath
if (-not $browser) { $browser = Find-Browser }
if (-not $browser) {
  Fail 'Could not find Chrome or Edge. Install Chrome, or tell me where it is.'
}

# Before anything that can be abandoned half-way.
New-DesktopIcon

if ($SetupOnly -or -not ($SetupMarker -and (Test-Path $SetupMarker))) {
  Show-Setup $browser
  if ($SetupOnly) { exit 0 }
}

if (-not $Url) {
  Say ''
  Say '  Paste your stream link and press Enter.'
  Say '  (the watch page, youtu.be link, or just the video id)'
  Say ''
  $Url = Read-Host '  Link'
}

$id = Get-VideoId $Url
if (-not $id) {
  if (Test-ChannelLink $Url) {
    Fail "That is a channel link, not a stream. Open the live stream itself and copy the link from the address bar - it needs the video in it."
  }
  Fail "That does not look like a YouTube link: '$Url'"
}

$chatUrl = "https://www.youtube.com/live_chat?v=$id"
$chatArgs = @("--app=$chatUrl", '--window-size=420,760')

Say ''
Say "  Opening chat for $id"
Say '  Leave that window on screen - Chrome slows hidden windows down.'
Say ''
Say '  Click the extension icon to check it says "Watching this chat".'
Say '  It starts in Dry run: it logs what it would remove and touches nothing.'
Say ''

if ($DryRun) {
  Say "[dry run] $browser $($chatArgs -join ' ')"
  exit 0
}

Start-Process -FilePath $browser -ArgumentList $chatArgs
Start-Sleep -Seconds 2
