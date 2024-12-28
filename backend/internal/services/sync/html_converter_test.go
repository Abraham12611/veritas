package sync

import (
	"strings"
	"testing"
)

func TestHTMLToText(t *testing.T) {
	tests := []struct {
		name     string
		html     string
		expected string
	}{
		{
			name: "Basic paragraph",
			html: "<p>Hello, world!</p>",
			expected: "Hello, world!",
		},
		{
			name: "Multiple paragraphs",
			html: "<p>First paragraph</p><p>Second paragraph</p>",
			expected: "First paragraph\n\nSecond paragraph",
		},
		{
			name: "Lists",
			html: "<ul><li>Item 1</li><li>Item 2</li></ul>",
			expected: "• Item 1\n• Item 2",
		},
		{
			name: "Links",
			html: `<p>Check out <a href="https://example.com">this link</a></p>`,
			expected: `Check out this link (https://example.com)`,
		},
		{
			name: "Code blocks",
			html: `<p>Here's some code:</p><pre><code>func main() {
    fmt.Println("Hello")
}</code></pre>`,
			expected: "Here's some code:\n\n`func main() {\n    fmt.Println(\"Hello\")\n}`",
		},
		{
			name: "Tables",
			html: `<table>
				<tr><th>Header 1</th><th>Header 2</th></tr>
				<tr><td>Cell 1</td><td>Cell 2</td></tr>
			</table>`,
			expected: "Header 1\tHeader 2\nCell 1\tCell 2",
		},
		{
			name: "Complex formatting",
			html: `<div class="content">
				<h1>Title</h1>
				<p>This is a <strong>bold</strong> and <em>emphasized</em> text.</p>
				<ul>
					<li>First item with <a href="http://example.com">link</a></li>
					<li>Second item</li>
				</ul>
				<pre><code>var x = 1;</code></pre>
			</div>`,
			expected: "Title\n\nThis is a bold and emphasized text.\n\n• First item with link (http://example.com)\n• Second item\n\n`var x = 1;`",
		},
		{
			name: "Special characters",
			html: `<p>Here are some quotes: "smart quotes" and 'apostrophes'</p>`,
			expected: `Here are some quotes: "smart quotes" and 'apostrophes'`,
		},
		{
			name: "Nested structures",
			html: `<div>
				<h2>Section</h2>
				<div>
					<p>Nested content</p>
					<ul>
						<li>Nested list item</li>
					</ul>
				</div>
			</div>`,
			expected: "Section\n\nNested content\n\n• Nested list item",
		},
		{
			name: "Empty elements",
			html: "<p></p><p>Content</p><p></p>",
			expected: "Content",
		},
		{
			name: "Mixed content",
			html: `<div>
				Text before
				<p>Paragraph</p>
				Text after
			</div>`,
			expected: "Text before\n\nParagraph\n\nText after",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := HTMLToText(tt.html)
			if err != nil {
				t.Errorf("HTMLToText() error = %v", err)
				return
			}

			// Normalize newlines for comparison
			expected := strings.ReplaceAll(tt.expected, "\n", "\n")
			result = strings.ReplaceAll(result, "\n", "\n")

			if result != expected {
				t.Errorf("HTMLToText() = %q, want %q", result, expected)
			}
		})
	}
}

func TestHTMLToText_ErrorCases(t *testing.T) {
	tests := []struct {
		name    string
		html    string
		wantErr bool
	}{
		{
			name:    "Invalid HTML",
			html:    "<p>Unclosed paragraph",
			wantErr: false, // html.Parse is quite forgiving
		},
		{
			name:    "Empty string",
			html:    "",
			wantErr: false,
		},
		{
			name:    "Just whitespace",
			html:    "   \n\t  ",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := HTMLToText(tt.html)
			if (err != nil) != tt.wantErr {
				t.Errorf("HTMLToText() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
} 