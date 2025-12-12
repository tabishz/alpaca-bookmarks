package utils

import (
	"bookmarks-manager/internal/models"
	"io"
	"strings"

	"golang.org/x/net/html"
)

// ParseBookmarksHTML parses a Netscape bookmark file using context-passing recursion
func ParseBookmarksHTML(r io.Reader, userID uint) ([]models.Bookmark, error) {
	doc, err := html.Parse(r)
	if err != nil {
		return nil, err
	}

	var bookmarks []models.Bookmark

	// traverse processes a node with a specific set of inherited tags
	var traverse func(n *html.Node, inheritedTags []string)
	traverse = func(n *html.Node, inheritedTags []string) {

		// 1. Handle Link (A) - Save it with current tags
		if n.Type == html.ElementNode && n.Data == "a" {
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
				// Create Tag objects
				var tags []models.Tag
				for _, tName := range inheritedTags {
					tags = append(tags, models.Tag{Name: tName})
				}

				bookmarks = append(bookmarks, models.Bookmark{
					UserID: userID,
					URL:    url,
					Title:  title,
					Tags:   tags,
				})
			}
			// Links don't have children relevant to structure, so return
			return
		}

		// 2. Handle Folder Structure (DL / DT / H3)
		// In Netscape format, a folder is usually:
		// <DT> <H3>FolderName</H3> <DL> ...items... </DL> </DT>

		// We look for the <DL> tag, which represents a "Container of items".
		// We need to find the <H3> immediately preceding it to know the name.
		if n.Type == html.ElementNode && n.Data == "dl" {
			// Find the folder name by looking backward at previous siblings
			folderName := ""
			prev := n.PrevSibling
			for prev != nil {
				// Skip whitespace/text nodes to find the H3
				if prev.Type == html.ElementNode && prev.Data == "h3" {
					if prev.FirstChild != nil {
						folderName = prev.FirstChild.Data
					}
					break
				}
				prev = prev.PrevSibling
			}

			// Create new context: Add this folder name to inherited tags
			newTags := inheritedTags
			if folderName != "" {
				// Make a copy of the slice to avoid polluting other branches
				newTags = make([]string, len(inheritedTags))
				copy(newTags, inheritedTags)
				newTags = append(newTags, folderName)
			}

			// Recurse into this DL with the NEW tags
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				traverse(c, newTags)
			}
			return
		}

		// 3. Default Traversal
		// If it's not a Link or a DL, just keep going deeper with current tags
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			traverse(c, inheritedTags)
		}
	}

	// Start traversal with empty tags
	traverse(doc, []string{})
	return bookmarks, nil
}

// GenerateBookmarksHTML creates a Netscape bookmark file string
// (Kept consistent with previous version)
func GenerateBookmarksHTML(bookmarks []models.Bookmark) string {
	var builder strings.Builder
	builder.WriteString(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`)
	for _, b := range bookmarks {
		var tagNames []string
		for _, t := range b.Tags {
			tagNames = append(tagNames, t.Name)
		}
		tagsStr := strings.Join(tagNames, ",")
		builder.WriteString("    <DT><A HREF=\"" + b.URL + "\" TAGS=\"" + tagsStr + "\">" + b.Title + "</A>\n")
	}
	builder.WriteString("</DL><p>\n")
	return builder.String()
}
