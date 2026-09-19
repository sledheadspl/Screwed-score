// The desktop launcher, as a single Windows executable.
//
// Double-click it, paste the stream link, and the chat opens in its own window
// with the moderation extension watching it. No PowerShell, no Node, nothing to
// install: Go links this statically, so the .exe is the whole program.
//
//	go build -o "Pokebank Mod Bot.exe"        (GOOS=windows GOARCH=amd64)
//	go run . -selftest                        (logic tests, any platform)
package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
)

const appName = "Pokebank Mod Bot"

// Every shape a YouTube link arrives in. Ids are exactly 11 characters of
// [A-Za-z0-9_-]; requiring that length is what keeps a channel URL from
// looking like a match.
var idPatterns = []*regexp.Regexp{
	regexp.MustCompile(`[?&]v=([A-Za-z0-9_-]{11})`),     // watch?v=ID, live_chat?v=ID
	regexp.MustCompile(`youtu\.be/([A-Za-z0-9_-]{11})`), // youtu.be/ID
	regexp.MustCompile(`/live/([A-Za-z0-9_-]{11})`),     // /live/ID
	regexp.MustCompile(`/embed/([A-Za-z0-9_-]{11})`),    // /embed/ID
	regexp.MustCompile(`/shorts/([A-Za-z0-9_-]{11})`),   // /shorts/ID
	regexp.MustCompile(`/video/([A-Za-z0-9_-]{11})`),    // studio.youtube.com/video/ID/...
	regexp.MustCompile(`^([A-Za-z0-9_-]{11})$`),         // a bare id
}

var channelPattern = regexp.MustCompile(`youtube\.com/(@|c/|channel/|user/)`)

func videoID(text string) string {
	t := strings.TrimSpace(text)
	t = strings.Trim(t, `"'`)
	for _, re := range idPatterns {
		if m := re.FindStringSubmatch(t); m != nil {
			return m[1]
		}
	}
	return ""
}

func isChannelLink(text string) bool {
	return channelPattern.MatchString(text)
}

// Where Chrome lives. No registry lookup: that needs a dependency, and these
// cover a normal install, a per-user install, and Edge as a fallback since it
// is the same engine and the same extension works in it.
func findBrowser() string {
	var candidates []string
	join := func(root, rest string) {
		if root != "" {
			candidates = append(candidates, filepath.Join(root, rest))
		}
	}
	join(os.Getenv("ProgramFiles"), `Google\Chrome\Application\chrome.exe`)
	join(os.Getenv("ProgramFiles(x86)"), `Google\Chrome\Application\chrome.exe`)
	join(os.Getenv("LOCALAPPDATA"), `Google\Chrome\Application\chrome.exe`)
	join(os.Getenv("ProgramFiles"), `Microsoft\Edge\Application\msedge.exe`)
	join(os.Getenv("ProgramFiles(x86)"), `Microsoft\Edge\Application\msedge.exe`)

	for _, c := range candidates {
		if fi, err := os.Stat(c); err == nil && !fi.IsDir() {
			return c
		}
	}
	// Last resort, and what makes this testable off Windows.
	for _, name := range []string{"chrome", "google-chrome", "chromium", "msedge"} {
		if p, err := exec.LookPath(name); err == nil {
			return p
		}
	}
	return ""
}

func stateDir() string {
	for _, env := range []string{"LOCALAPPDATA", "APPDATA", "HOME", "TMPDIR", "TEMP"} {
		if v := os.Getenv(env); v != "" {
			return filepath.Join(v, "PokebankModBot")
		}
	}
	return ""
}

// The extension folder. Normally the directory holding this executable - but
// once the exe has been copied to the Desktop it no longer sits beside the
// extension, so first run records where it came from.
func extensionDir() string {
	exe, err := os.Executable()
	if err == nil {
		dir := filepath.Dir(exe)
		if _, err := os.Stat(filepath.Join(dir, "manifest.json")); err == nil {
			rememberExtensionDir(dir)
			return dir
		}
	}
	if sd := stateDir(); sd != "" {
		if b, err := os.ReadFile(filepath.Join(sd, "extension-path.txt")); err == nil {
			dir := strings.TrimSpace(string(b))
			if _, err := os.Stat(filepath.Join(dir, "manifest.json")); err == nil {
				return dir
			}
		}
	}
	return ""
}

func rememberExtensionDir(dir string) {
	sd := stateDir()
	if sd == "" {
		return
	}
	_ = os.MkdirAll(sd, 0o755)
	_ = os.WriteFile(filepath.Join(sd, "extension-path.txt"), []byte(dir), 0o644)
}

func desktopDir() string {
	home := os.Getenv("USERPROFILE")
	if home == "" {
		home = os.Getenv("HOME")
	}
	if home == "" {
		return ""
	}
	// OneDrive redirects Desktop on many Windows machines; that path is the
	// real Desktop, so it is checked first.
	for _, p := range []string{
		filepath.Join(os.Getenv("OneDrive"), "Desktop"),
		filepath.Join(home, "OneDrive", "Desktop"),
		filepath.Join(home, "Desktop"),
	} {
		if strings.HasSuffix(p, string(os.PathSeparator)+"Desktop") {
			if fi, err := os.Stat(p); err == nil && fi.IsDir() {
				return p
			}
		}
	}
	return ""
}

// Copying the executable is how the Desktop icon gets made. Writing a .lnk
// means either a COM dependency or hand-rolling a binary shortcut format;
// a copy of the program is simpler, and works whatever it is launched from.
func placeOnDesktop() string {
	desk := desktopDir()
	if desk == "" {
		return ""
	}
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	target := filepath.Join(desk, appName+exeSuffix())
	if sameFile(exe, target) {
		return ""
	}
	if _, err := os.Stat(target); err == nil {
		return ""
	}
	src, err := os.Open(exe)
	if err != nil {
		return ""
	}
	defer src.Close()
	dst, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return ""
	}
	defer dst.Close()
	if _, err := io.Copy(dst, src); err != nil {
		return ""
	}
	return target
}

func exeSuffix() string {
	if runtime.GOOS == "windows" {
		return ".exe"
	}
	return ""
}

func sameFile(a, b string) bool {
	fa, err1 := os.Stat(a)
	fb, err2 := os.Stat(b)
	return err1 == nil && err2 == nil && os.SameFile(fa, fb)
}

func prompt(reader *bufio.Reader, label string) string {
	fmt.Print(label)
	line, _ := reader.ReadString('\n')
	return strings.TrimSpace(line)
}

func pause(reader *bufio.Reader) {
	fmt.Print("\n  Press Enter to close. ")
	_, _ = reader.ReadString('\n')
}

func main() {
	dry := flag.Bool("dry", false, "print what would be launched instead of launching")
	selftest := flag.Bool("selftest", false, "run the link-parsing tests and exit")
	urlFlag := flag.String("url", "", "stream link (skips the prompt)")
	flag.Parse()

	if *selftest {
		os.Exit(runSelfTest())
	}

	reader := bufio.NewReader(os.Stdin)
	fmt.Println()
	fmt.Println("  Pokebank chat mod bot")
	fmt.Println("  =====================")

	if placed := placeOnDesktop(); placed != "" {
		fmt.Printf("\n  Put \"%s\" on your Desktop.\n", appName)
	}

	extDir := extensionDir()
	browser := findBrowser()
	if browser == "" {
		fmt.Println("\n  Could not find Chrome or Edge on this computer.")
		fmt.Println("  Install Chrome, then run this again.")
		if !*dry {
			pause(reader)
		}
		os.Exit(1)
	}

	sd := stateDir()
	setupMarker := ""
	if sd != "" {
		setupMarker = filepath.Join(sd, "setup-done.txt")
	}
	_, setupDone := os.Stat(setupMarker)

	// The Desktop copy does not sit beside the extension, so it relies on the
	// path recorded on first run. If that is missing, setup never happened and
	// silently skipping it would leave a launcher that opens a chat no bot is
	// watching - which looks exactly like the bot being broken.
	if setupDone != nil && extDir == "" {
		fmt.Println("\n  I cannot find the extension folder.")
		fmt.Println("  Run \"" + appName + exeSuffix() + "\" from the folder you unzipped,")
		fmt.Println("  the one containing manifest.json. After that this copy works from anywhere.")
		if !*dry {
			pause(reader)
		}
		os.Exit(1)
	}

	if setupDone != nil && extDir != "" {
		fmt.Println("\n  FIRST TIME ONLY - about 20 seconds")
		fmt.Println("  ----------------------------------")
		fmt.Println("  Two windows are opening: Chrome extensions, and the folder.")
		fmt.Println()
		fmt.Println("   1. In Chrome, turn ON \"Developer mode\" (top right)")
		fmt.Println("   2. Drag the folder from the Explorer window onto the Chrome window")
		fmt.Println()
		fmt.Println("  That installs it. You never do this again.")
		if !*dry {
			_ = exec.Command(browser, "chrome://extensions").Start()
			openFolder(extDir)
			prompt(reader, "\n  Press Enter once you have dragged it in. ")
			if sd != "" {
				_ = os.MkdirAll(sd, 0o755)
				_ = os.WriteFile(setupMarker, []byte("done"), 0o644)
			}
		} else {
			fmt.Printf("  [dry] would open chrome://extensions and %s\n", extDir)
		}
	}

	link := *urlFlag
	for {
		if link == "" {
			fmt.Println()
			fmt.Println("  Paste your stream link and press Enter.")
			fmt.Println("  (the watch page, a youtu.be link, or just the video id)")
			fmt.Println()
			link = prompt(reader, "  Link: ")
		}
		id := videoID(link)
		if id != "" {
			launch(browser, id, *dry, reader)
			return
		}
		if isChannelLink(link) {
			fmt.Println("\n  That is a channel link, not a stream.")
			fmt.Println("  Open the live stream itself and copy the link from the address bar.")
		} else if link == "" {
			fmt.Println("\n  Nothing pasted.")
		} else {
			fmt.Printf("\n  That does not look like a YouTube link: %s\n", link)
		}
		if *dry {
			os.Exit(1)
		}
		link = ""
	}
}

func launch(browser, id string, dry bool, reader *bufio.Reader) {
	chatURL := "https://www.youtube.com/live_chat?v=" + id
	args := []string{"--app=" + chatURL, "--window-size=420,760"}

	fmt.Printf("\n  Opening chat for %s\n", id)
	fmt.Println("  Leave that window on screen - Chrome slows hidden windows down.")
	fmt.Println()
	fmt.Println("  Click the extension icon and check it says \"Watching this chat\".")
	fmt.Println("  It starts in Dry run: it logs what it would remove and touches nothing.")

	if dry {
		fmt.Printf("\n[dry] %s %s\n", browser, strings.Join(args, " "))
		return
	}
	if err := exec.Command(browser, args...).Start(); err != nil {
		fmt.Printf("\n  Could not start the browser: %v\n", err)
		pause(reader)
		os.Exit(1)
	}
}

func openFolder(dir string) {
	switch runtime.GOOS {
	case "windows":
		_ = exec.Command("explorer.exe", dir).Start()
	case "darwin":
		_ = exec.Command("open", dir).Start()
	default:
		_ = exec.Command("xdg-open", dir).Start()
	}
}
