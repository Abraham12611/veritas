package sync

import (
	"bytes"
	"io"
	"regexp"
	"strings"

	"golang.org/x/net/html"
)

// HTMLToText converts HTML content to plain text while preserving structure
func HTMLToText(htmlContent string) (string, error) {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	var lastNode *html.Node
	var f func(*html.Node)

	f = func(n *html.Node) {
		switch n.Type {
		case html.TextNode:
			// Skip if it's empty whitespace
			if strings.TrimSpace(n.Data) == "" {
				return
			}

			// Add spacing based on previous node
			if lastNode != nil && lastNode.Type == html.TextNode {
				buf.WriteString(" ")
			}

			// Clean and write the text
			text := cleanText(n.Data)
			buf.WriteString(text)
			lastNode = n

		case html.ElementNode:
			switch n.Data {
			case "p", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6":
				// Add newlines before block elements
				if buf.Len() > 0 {
					buf.WriteString("\n\n")
				}
			case "li":
				// Add bullet points for list items
				if buf.Len() > 0 {
					buf.WriteString("\n")
				}
				buf.WriteString("• ")
			case "a":
				// For links, include the URL in parentheses
				var href string
				for _, attr := range n.Attr {
					if attr.Key == "href" {
						href = attr.Val
						break
					}
				}
				if href != "" {
					for c := n.FirstChild; c != nil; c = c.NextSibling {
						f(c)
					}
					buf.WriteString(" (" + href + ")")
					return
				}
			case "code", "pre":
				// Preserve code blocks with backticks
				var code bytes.Buffer
				extractText(n, &code)
				if code.Len() > 0 {
					if buf.Len() > 0 {
						buf.WriteString("\n")
					}
					buf.WriteString("`")
					buf.Write(code.Bytes())
					buf.WriteString("`")
					if n.Data == "pre" {
						buf.WriteString("\n")
					}
					return
				}
			case "table":
				// Add newlines around tables
				if buf.Len() > 0 {
					buf.WriteString("\n\n")
				}
			case "tr":
				// Add newlines between rows
				if buf.Len() > 0 {
					buf.WriteString("\n")
				}
			case "td", "th":
				// Add spacing between cells
				if buf.Len() > 0 && !strings.HasSuffix(buf.String(), "\n") {
					buf.WriteString("\t")
				}
			}

			// Recursively process child nodes
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				f(c)
			}

			// Add spacing after certain elements
			switch n.Data {
			case "table":
				buf.WriteString("\n")
			}
		}
	}

	f(doc)

	// Clean up the final text
	text := buf.String()
	text = cleanupWhitespace(text)
	return text, nil
}

// extractText recursively extracts text from nodes
func extractText(n *html.Node, buf *bytes.Buffer) {
	if n.Type == html.TextNode {
		buf.WriteString(n.Data)
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractText(c, buf)
	}
}

// cleanText removes extra whitespace and normalizes quotes
func cleanText(s string) string {
	// Replace non-breaking spaces with regular spaces
	s = strings.ReplaceAll(s, "\u00a0", " ")
	
	// Normalize quotes
	s = strings.ReplaceAll(s, """, "\"")
	s = strings.ReplaceAll(s, """, "\"")
	s = strings.ReplaceAll(s, "'", "'")
	s = strings.ReplaceAll(s, "'", "'")
	
	// Remove extra whitespace
	s = strings.TrimSpace(s)
	return s
}

// cleanupWhitespace removes excessive whitespace while preserving structure
func cleanupWhitespace(s string) string {
	// Replace multiple newlines with double newline
	multipleNewlines := regexp.MustCompile(`\n{3,}`)
	s = multipleNewlines.ReplaceAllString(s, "\n\n")

	// Replace multiple spaces with single space
	multipleSpaces := regexp.MustCompile(`[ \t]+`)
	s = multipleSpaces.ReplaceAllString(s, " ")

	// Clean up spaces around newlines
	s = regexp.MustCompile(`[ \t]*\n[ \t]*`).ReplaceAllString(s, "\n")

	return strings.TrimSpace(s)
} 