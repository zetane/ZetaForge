// katana/uv.go
package katana

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func ensureUV(uvPath string) (string, error) {
	// If custom path is provided, check if uv exists there
	if uvPath != "" {
		absPath, err := filepath.Abs(uvPath)
		if err != nil {
			return "", fmt.Errorf("failed to resolve absolute path for %s: %v", uvPath, err)
		}
		if _, err := os.Stat(absPath); err == nil {
			cmd := exec.Command(absPath, "--version")
			if err := cmd.Run(); err == nil {
				return absPath, nil // Custom uv path is valid and executable
			}
			return "", fmt.Errorf("provided uv binary at %s exists but is not executable", absPath)
		}
		return "", fmt.Errorf("provided uv binary not found at %s", absPath)
	}

	// On Windows, check common installation locations first
	if runtime.GOOS == "windows" {
		// Get LOCALAPPDATA path
		localAppData := os.Getenv("LOCALAPPDATA")
		if localAppData != "" {
			commonPaths := []string{
				filepath.Join(localAppData, "uv", "bin", "uv.exe"),
				filepath.Join(localAppData, "Programs", "uv", "uv.exe"),
			}

			// Check each potential path
			for _, path := range commonPaths {
				if _, err := os.Stat(path); err == nil {
					cmd := exec.Command(path, "--version")
					if err := cmd.Run(); err == nil {
						// Found a working UV installation, add its directory to PATH
						uvDir := filepath.Dir(path)
						currentPath := os.Getenv("PATH")
						if !strings.Contains(currentPath, uvDir) {
							os.Setenv("PATH", uvDir+string(os.PathListSeparator)+currentPath)
						}
						return path, nil
					}
				}
			}
		}

		// Also check if UV is in the system PATH
		cmd := exec.Command("where", "uv.exe")
		if output, err := cmd.Output(); err == nil {
			uvPath := strings.TrimSpace(strings.Split(string(output), "\n")[0]) // Take first match if multiple
			if uvPath != "" {
				return uvPath, nil // UV found in PATH
			}
		}
	} else {
		// Non-Windows systems just check PATH
		if path, err := exec.LookPath("uv"); err == nil {
			return path, nil
		}
	}

	log.Println("uv not found, installing...")
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("powershell", "-ExecutionPolicy", "ByPass", "-c",
			"irm https://astral.sh/uv/install.ps1 | iex")
	} else {
		cmd = exec.Command("sh", "-c",
			"curl -LsSf https://astral.sh/uv/install.sh | sh")
	}

	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	cmd.Env = os.Environ()

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("failed to install uv: %v\nstderr: %s", err, stderr.String())
	}

	// After installation, find the binary path
	var installedPath string
	if runtime.GOOS == "windows" {
		localAppData := os.Getenv("LOCALAPPDATA")
		if localAppData != "" {
			uvPath := filepath.Join(localAppData, "uv", "bin", "uv.exe")
			if _, err := os.Stat(uvPath); err == nil {
				uvDir := filepath.Dir(uvPath)
				currentPath := os.Getenv("PATH")
				if !strings.Contains(currentPath, uvDir) {
					os.Setenv("PATH", uvDir+string(os.PathListSeparator)+currentPath)
				}
				installedPath = uvPath
			}
		}
	}

	// If we couldn't find the exact path after installation, try LookPath
	if installedPath == "" {
		var err error
		installedPath, err = exec.LookPath("uv")
		if err != nil {
			return "", fmt.Errorf("uv installation appeared to succeed but 'uv' command not found in PATH")
		}
	}

	log.Println("uv installed successfully at", installedPath)
	return installedPath, nil
}

func getBinPath(venvPath string) string {
	if runtime.GOOS == "windows" {
		return filepath.Join(venvPath, "Scripts")
	}
	return filepath.Join(venvPath, "bin")
}

func getPythonExecutable(venvPath string) string {
	if runtime.GOOS == "windows" {
		return filepath.Join(getBinPath(venvPath), "python.exe")
	}
	return filepath.Join(getBinPath(venvPath), "python")
}

func getPathSeparator() string {
	if runtime.GOOS == "windows" {
		return ";"
	}
	return ":"
}

type UVCommand struct {
	Cmd           *exec.Cmd
	AdditionalEnv []string
}

func runWithUV(blockId string, scriptDir string, uvPath string, opts Options) UVCommand {
	// Create the venv
	venvPath := filepath.Join(scriptDir, ".venv")
	cmd := exec.Command(uvPath, "venv", "--allow-existing")
	cmd.Dir = scriptDir
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Fatalf("failed to create UV environment: %v\nOutput: %s", err, string(out))
	}

	// Check for requirements.txt
	requirementsFile := filepath.Join(scriptDir, "requirements.txt")
	log.Printf("[%v] Installing requirements.txt in %v", blockId, requirementsFile)
	if _, err := os.Stat(requirementsFile); err == nil {
		// Use the specific venv path for pip install
		cmd = exec.Command(uvPath, "pip", "install", "-r", "requirements.txt")
		cmd.Dir = scriptDir
		out, err := cmd.CombinedOutput()
		log.Printf("[%v] Installed: %v", blockId, string(out))
		if err != nil {
			log.Fatalf("failed to install dependencies: %v\nOutput: %s", err, string(out))
		}
	} else {
		fmt.Println("No requirements.txt found. Skipping dependency installation.")
	}

	// Set up the final command with the specific virtual environment
	cmd = exec.Command(uvPath, "run", "entrypoint.py", blockId, opts.Runner)
	cmd.Dir = scriptDir

	// Prepare additional environment variables
	uvDir := filepath.Dir(uvPath)
	newPath := getBinPath(venvPath) + getPathSeparator() + uvDir + getPathSeparator() + os.Getenv("PATH")
	var additionalEnv []string

	// Windows uses different environment variable names
	if runtime.GOOS == "windows" {
		additionalEnv = []string{
			fmt.Sprintf("VIRTUAL_ENV=%s", venvPath),
			fmt.Sprintf("Path=%s", newPath), // Windows uses 'Path' instead of 'PATH'
		}
	} else {
		additionalEnv = []string{
			fmt.Sprintf("VIRTUAL_ENV=%s", venvPath),
			fmt.Sprintf("PATH=%s", newPath),
		}
	}

	return UVCommand{
		Cmd:           cmd,
		AdditionalEnv: additionalEnv,
	}
}
