package katana

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
)

func shouldSkipPath(path string) bool {
	// Get the base name of the path
	base := filepath.Base(path)

	// List of paths/patterns to skip
	skipPaths := []string{
		"history",       // Skip history folder
		".git",          // Skip git folder
		".gitignore",    // Skip git files
		".DS_Store",     // Skip Mac OS system files
		"__pycache__",   // Skip Python cache
		"node_modules",  // Skip node modules
		".env",          // Skip environment files
		".vscode",       // Skip VS Code settings
		".idea",         // Skip IntelliJ settings
		"*.pyc",         // Skip Python compiled files
		"*.pyo",         // Skip Python optimized files
		"*.pyd",         // Skip Python dynamic libraries
		"*.so",          // Skip shared objects
		"*.dll",         // Skip DLL files
		"*.class",       // Skip Java class files
		".pytest_cache", // Skip pytest cache
		".coverage",     // Skip coverage files
	}

	// Check if the path matches any of the skip patterns
	for _, skip := range skipPaths {
		if matched, _ := filepath.Match(skip, base); matched {
			return true
		}
		if base == skip {
			return true
		}
	}

	return false
}

func copyDirectory(sourceDir, targetDir string) error {
	// Create the target directory if it doesn't exist
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return fmt.Errorf("failed to create target directory: %w", err)
	}

	// Walk through the source directory
	return filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip if path should be ignored
		if shouldSkipPath(path) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Get the relative path from the source directory
		relPath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return fmt.Errorf("failed to get relative path: %w", err)
		}

		// Create the target path
		targetPath := filepath.Join(targetDir, relPath)

		if info.IsDir() {
			// Create directory in target
			return os.MkdirAll(targetPath, info.Mode())
		} else {
			// Copy file
			return copyFile(path, targetPath)
		}
	})
}

func copyFile(sourcePath, targetPath string) error {
	// Skip if the file should be ignored
	if shouldSkipPath(sourcePath) {
		return nil
	}

	// Open the source file
	source, err := os.Open(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer source.Close()

	// Create the target file
	target, err := os.Create(targetPath)
	if err != nil {
		return fmt.Errorf("failed to create target file: %w", err)
	}
	defer target.Close()

	// Copy the contents
	_, err = io.Copy(target, source)
	if err != nil {
		return fmt.Errorf("failed to copy file contents: %w", err)
	}

	// Copy file permissions
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

// getDirectoryContents returns a map of files to their content hashes
func getDirectoryContents(dir string) (map[string]fileInfo, error) {
	contents := make(map[string]fileInfo)
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}

		// Skip the root directory itself
		if relPath == "." {
			return nil
		}

		// For directories, just mark that they exist
		if info.IsDir() {
			contents[relPath] = fileInfo{exists: true}
			return nil
		}

		// For files, compute hash
		hash, err := getFileHash(path)
		if err != nil {
			return err
		}

		contents[relPath] = fileInfo{exists: true, hash: hash}
		return nil
	})
	return contents, err
}

// getFileHash returns a hash of the file contents
func getFileHash(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	hash := sha256.Sum256(data)
	return fmt.Sprintf("%x", hash), nil
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

// cleanup removes unchanged files and specified patterns while preserving new and modified files
func cleanup(executionDir string, originalFiles map[string]fileInfo) error {
	// Get current state
	currentFiles, err := getDirectoryContents(executionDir)
	if err != nil {
		return fmt.Errorf("failed to get current directory contents: %w", err)
	}

	var toRemove []string
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
				if info.IsDir() {
					toRemove = append(toRemove, path)
					return filepath.SkipDir
				}
				toRemove = append(toRemove, path)
				return nil
			}
		}

		// If not a pattern to clean, check if it's an unchanged original file
		if !info.IsDir() && !shouldKeepFile(relPath, originalFiles, currentFiles) {
			toRemove = append(toRemove, path)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to walk directory: %w", err)
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

	// Clean up any remaining empty directories
	err = filepath.Walk(executionDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() || path == executionDir {
			return nil
		}

		entries, err := os.ReadDir(path)
		if err != nil {
			return err
		}

		if len(entries) == 0 {
			if err := os.Remove(path); err != nil {
				return fmt.Errorf("failed to remove empty directory %s: %w", path, err)
			}
		}

		return nil
	})

	return err
}
