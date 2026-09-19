package main

import "fmt"

// The link parsing, checked against every shape a stream link arrives in.
// Shipped in the executable rather than kept as a separate test file so it can
// be run on the machine that is actually having trouble: -selftest.
func runSelfTest() int {
	cases := []struct{ in, want string }{
		{"https://www.youtube.com/watch?v=dmVCwUZT48s", "dmVCwUZT48s"},
		{"https://youtu.be/dmVCwUZT48s", "dmVCwUZT48s"},
		{"https://youtu.be/dmVCwUZT48s?si=xKq1", "dmVCwUZT48s"},
		{"https://www.youtube.com/live/dmVCwUZT48s", "dmVCwUZT48s"},
		{"https://www.youtube.com/live/dmVCwUZT48s?feature=share", "dmVCwUZT48s"},
		{"https://www.youtube.com/watch?v=dmVCwUZT48s&t=30s", "dmVCwUZT48s"},
		{"https://m.youtube.com/watch?v=dmVCwUZT48s", "dmVCwUZT48s"},
		{"https://studio.youtube.com/video/dmVCwUZT48s/livestreaming", "dmVCwUZT48s"},
		{"https://www.youtube.com/live_chat?v=dmVCwUZT48s", "dmVCwUZT48s"},
		{"https://www.youtube.com/embed/dmVCwUZT48s", "dmVCwUZT48s"},
		{"https://www.youtube.com/shorts/dmVCwUZT48s", "dmVCwUZT48s"},
		{"dmVCwUZT48s", "dmVCwUZT48s"},
		{"  https://youtu.be/dmVCwUZT48s  ", "dmVCwUZT48s"},
		{`"https://youtu.be/dmVCwUZT48s"`, "dmVCwUZT48s"},
		{"https://www.youtube.com/@Pokebank", ""},
		{"https://www.youtube.com/@Pokebank/live", ""},
		{"https://www.youtube.com/@Pokebank/videos", ""},
		{"https://www.youtube.com/channel/UCabcdefghijklmnopqrstu", ""},
		{"not a link at all", ""},
		{"", ""},
		{"https://example.com/watch?v=dmVCwUZT48s", "dmVCwUZT48s"},
		{"tooshort", ""},
		{"waytoolongtobeavideoid", ""},
	}

	bad := 0
	for _, c := range cases {
		got := videoID(c.in)
		if got != c.want {
			fmt.Printf("  FAIL  %q -> %q, wanted %q\n", c.in, got, c.want)
			bad++
			continue
		}
		fmt.Printf("  ok    %q -> %q\n", c.in, got)
	}

	for _, ch := range []string{
		"https://www.youtube.com/@Pokebank",
		"https://www.youtube.com/@Pokebank/live",
		"https://www.youtube.com/channel/UCabc",
	} {
		if !isChannelLink(ch) {
			fmt.Printf("  FAIL  not recognised as a channel link: %s\n", ch)
			bad++
			continue
		}
		fmt.Printf("  ok    channel link recognised: %s\n", ch)
	}

	if bad > 0 {
		fmt.Printf("\n%d failing\n", bad)
		return 1
	}
	fmt.Printf("\nall %d passing\n", len(cases)+3)
	return 0
}
