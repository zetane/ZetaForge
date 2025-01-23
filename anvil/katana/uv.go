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
)

// ensureUV checks if uv is installed and installs it if not
func ensureUV() error {
	// First check if uv is already installed
	if _, err := exec.LookPath("uv"); err == nil {
		return nil // uv is already installed
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

	// Capture both stdout and stderr
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	cmd.Env = os.Environ()

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install uv: %v\nstderr: %s", err, stderr.String())
	}

	// Verify installation
	if _, err := exec.LookPath("uv"); err != nil {
		return fmt.Errorf("uv installation appeared to succeed but 'uv' command not found in PATH")
	}

	log.Println("uv installed successfully")
	return nil
}

// SetupUVEnvironment creates and configures a UV virtual environment
func setupUVEnvironment(scriptDir string, opts Options) error {
	uvEnvPath := filepath.Join(scriptDir, ".venv")

	// Create UV environment if it does not exist
	if _, err := os.Stat(uvEnvPath); os.IsNotExist(err) {
		// Create the venv
		cmd := exec.Command("uv", "venv", uvEnvPath)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to create UV environment: %w", err)
		}

		// Generate lockfile first
		cmd = exec.Command("uv", "pip", "compile", "requirements.txt", "-o", "requirements.txt")
		cmd.Dir = scriptDir
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to compile requirements: %w", err)
		}
	}

	// Check for requirements.txt
	requirementsFile := filepath.Join(scriptDir, "requirements.txt")
	if _, err := os.Stat(requirementsFile); err == nil {
		var cmd *exec.Cmd
		cmd = exec.Command("uv", "pip", "install", "-r", requirementsFile)
		cmd.Dir = scriptDir
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to install dependencies: %w", err)
		}
	} else {
		fmt.Println("No requirements.txt found. Skipping dependency installation.")
	}

	return nil
}

// RunWithUV runs a python script using the UV environment
func runWithUV(blockId string, scriptDir string, opts Options) *exec.Cmd {
	cmd := exec.Command("uv", "run", "entrypoint.py", blockId, opts.Mode)
	cmd.Dir = scriptDir

	return cmd
}
