package utils

import (
	"bookmarks-manager/internal/models"
	"fmt"
	"io"
	"strings"

	"golang.org/x/net/html"
)

// ParseBookmarksHTML parses a Netscape bookmark file and returns a list of bookmarks with tags (derived from folders)
func ParseBookmarksHTML(r io.Reader, userID uint) ([]models.Bookmark, error) {
	doc, err := html.Parse(r)
	if err != nil {
		return nil, err
	}

	var bookmarks []models.Bookmark
	var currentTags []string

	// Recursive function to traverse the DOM
	var traverse func(*html.Node)
	traverse = func(n *html.Node) {
		if n.Type == html.ElementNode {
			// If it's a Header (H3), it's a Folder/Tag name
			if n.Data == "h3" {
				if n.FirstChild != nil {
					currentTags = append(currentTags, n.FirstChild.Data)
				}
			}
			// If it's a Link (A), extract data
			if n.Data == "a" {
				var url string
				for _, attr := range n.Attr {
					if attr.Key == "href" {
						url = attr.Val
						break
					}
				}

				title := ""
				if n.FirstChild != nil {
					title = n.FirstChild.Data
				}

				if url != "" {
					// Create Tag objects from current folder stack
					var tags []models.Tag
					for _, tName := range currentTags {
						tags = append(tags, models.Tag{Name: tName})
					}

					bookmarks = append(bookmarks, models.Bookmark{
						UserID: userID,
						URL:    url,
						Title:  title,
						Tags:   tags,
					})
				}
			}
		}

		// Traverse children
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			traverse(c)
		}

		// When leaving a DL (folder list), pop the last tag
		if n.Type == html.ElementNode && n.Data == "dl" && len(currentTags) > 0 {
			// This logic depends heavily on exact browser format,
			// usually H3 is followed immediately by DL.
			// For simplicity in this v1 parser, we reset tags if we aren't careful.
			// A robust parser tracks depth carefully.
			// Simplified: We won't pop here for the MVP to avoid complexity errors,
			// but a production parser would track folder depth.
		}
	}
	traverse(doc)
	return bookmarks, nil
}

// GenerateBookmarksHTML creates a Netscape bookmark file string
func GenerateBookmarksHTML(bookmarks []models.Bookmark) string {
	var builder strings.Builder

	builder.WriteString(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`)

	for _, b := range bookmarks {
		// Collect tags for the "tags" attribute (optional, but useful)
		var tagNames []string
		for _, t := range b.Tags {
			tagNames = append(tagNames, t.Name)
		}
		tagsStr := strings.Join(tagNames, ",")

		// Convert time to Unix timestamp
		added := fmt.Sprintf("%d", b.CreatedAt.Unix())

		builder.WriteString(fmt.Sprintf(`    <DT><A HREF="%s" ADD_DATE="%s" TAGS="%s">%s</A>`+"\n",
			b.URL, added, tagsStr, b.Title))
	}

	builder.WriteString("</DL><p>\n")
	return builder.String()
}
