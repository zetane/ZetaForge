package katana

import (
	"crypto/sha1"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
)

var skipPatterns []string
var skipExact = map[string]bool{
	"history":       true,
	".git":          true,
	".gitignore":    true,
	".DS_Store":     true,
	"__pycache__":   true,
	"node_modules":  true,
	".env":          true,
	".vscode":       true,
	".idea":         true,
	".pytest_cache": true,
	".coverage":     true,
	".venv":         true,
}

func init() {
	skipPatterns = []string{
		"*.pyc",
		"*.pyo",
		"*.pyd",
		"*.so",
		"*.dll",
		"*.class",
	}
}

func shouldSkipPath(path string) bool {
	base := filepath.Base(path)

	// Check exact matches first (faster)
	if skipExact[base] {
		return true
	}

	// Then check patterns
	for _, pattern := range skipPatterns {
		if matched, _ := filepath.Match(pattern, base); matched {
			return true
		}
	}

	return false
}

func copyDirectory(sourceDir, targetDir string) error {
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return fmt.Errorf("failed to create target directory: %w", err)
	}

	return filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if shouldSkipPath(path) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		relPath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return fmt.Errorf("failed to get relative path: %w", err)
		}

		targetPath := filepath.Join(targetDir, relPath)

		if info.IsDir() {
			return os.MkdirAll(targetPath, info.Mode())
		} else {
			return copyFile(path, targetPath)
		}
	})
}

func copyFile(sourcePath, targetPath string) error {
	if shouldSkipPath(sourcePath) {
		return nil
	}

	source, err := os.Open(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer source.Close()

	target, err := os.Create(targetPath)
	if err != nil {
		return fmt.Errorf("failed to create target file: %w", err)
	}
	defer target.Close()

	buf := make([]byte, 32*1024)
	if _, err := io.CopyBuffer(target, source, buf); err != nil {
		return fmt.Errorf("failed to copy file contents: %w", err)
	}

	sourceInfo, err := os.Stat(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to get source file info: %w", err)
	}

	return os.Chmod(targetPath, sourceInfo.Mode())
}

type fileInfo struct {
	exists bool
	hash   string
}

func getDirectoryContents(dir string) (map[string]fileInfo, error) {
	contents := make(map[string]fileInfo)
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Cache the FileInfo
		if info == nil {
			info, err = os.Lstat(path)
			if err != nil {
				return err
			}
		}

		relPath, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}

		if relPath == "." {
			return nil
		}

		if shouldSkipPath(path) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if info.IsDir() {
			contents[relPath] = fileInfo{exists: true}
			return nil
		}

		hash, err := getFileHash(path)
		if err != nil {
			return err
		}

		contents[relPath] = fileInfo{exists: true, hash: hash}
		return nil
	})
	return contents, err
}

func getFileHash(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha1.New()
	buf := make([]byte, 32*1024)

	for {
		n, err := file.Read(buf)
		if n > 0 {
			hash.Write(buf[:n])
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

// shouldKeepFile determines if a file should be kept based on original and current state
func shouldKeepFile(path string, originalFiles, currentFiles map[string]fileInfo) bool {
	orig, wasOriginal := originalFiles[path]
	curr, stillExists := currentFiles[path]

	// Keep if it's new
	if !wasOriginal && stillExists {
		return true
	}

	// Keep if it changed
	if wasOriginal && stillExists && orig.hash != curr.hash {
		return true
	}

	return false
}

// patternsToClean defines paths that should always be removed
var patternsToClean = []string{
	"__pycache__",
	"*.pyc",
	".pytest_cache",
	"*.pyo",
	// Add any other patterns here
}

func getFileChanges(executionDir string, originalFiles map[string]fileInfo) (map[string]string, map[string]string, error) {
	changedOrNew := make(map[string]string) // map[relativePath]absolutePath
	unchanged := make(map[string]string)    // map[relativePath]absolutePath

	// Get current state
	currentFiles, err := getDirectoryContents(executionDir)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get current directory contents: %w", err)
	}

	err = filepath.Walk(executionDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(executionDir, path)
		if err != nil {
			return err
		}

		// Skip root directory
		if relPath == "." {
			return nil
		}

		// Check if path matches any patterns to clean
		for _, pattern := range patternsToClean {
			matched, err := filepath.Match(pattern, info.Name())
			if err != nil {
				return err
			}
			if matched || info.Name() == pattern {
				unchanged[relPath] = path
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		// If not a pattern to clean, check if it's changed or unchanged
		if !info.IsDir() {
			if shouldKeepFile(relPath, originalFiles, currentFiles) {
				changedOrNew[relPath] = path
			} else {
				unchanged[relPath] = path
			}
		}

		return nil
	})

	if err != nil {
		return nil, nil, fmt.Errorf("failed to walk directory: %w", err)
	}

	return changedOrNew, unchanged, nil
}

// cleanup removes unchanged files and specified patterns
func cleanup(unchangedFiles map[string]string) error {
	// Convert map to slice for sorting
	toRemove := make([]string, 0, len(unchangedFiles))
	for _, absPath := range unchangedFiles {
		toRemove = append(toRemove, absPath)
	}

	// Sort paths by length in reverse order to handle nested paths first
	sort.Slice(toRemove, func(i, j int) bool {
		return len(toRemove[i]) > len(toRemove[j])
	})

	// Remove files and directories
	for _, path := range toRemove {
		if err := os.RemoveAll(path); err != nil {
			return fmt.Errorf("failed to remove %s: %w", path, err)
		}
	}

	return nil
}

// copyChangedFiles copies all changed or new files to a target directory
func copyChangedFiles(targetDir string, changedFiles map[string]string) error {
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return fmt.Errorf("failed to create target directory: %w", err)
	}

	for relPath, sourcePath := range changedFiles {
		targetPath := filepath.Join(targetDir, relPath)

		// Create parent directories if they don't exist
		targetParentDir := filepath.Dir(targetPath)
		if err := os.MkdirAll(targetParentDir, 0755); err != nil {
			return fmt.Errorf("failed to create directory structure for %s: %w", targetPath, err)
		}

		if err := copyFileAll(sourcePath, targetPath); err != nil {
			return fmt.Errorf("failed to copy %s to %s: %w", sourcePath, targetPath, err)
		}
	}

	return nil
}

// Helper function to copy a single file
func copyFileAll(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	targetFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer targetFile.Close()

	if _, err := io.Copy(targetFile, sourceFile); err != nil {
		return err
	}

	sourceInfo, err := os.Stat(src)
	if err != nil {
		return err
	}

	if err := os.Chmod(dst, sourceInfo.Mode()); err != nil {
		return err
	}

	return os.Chtimes(dst, sourceInfo.ModTime(), sourceInfo.ModTime())
}
