package katana

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"server/zjson"
	"strings"
)

var METADATA = []string{"specs.json", "chatHistory.json", "cover-image.png"}

type Node struct {
	Path     string   `json:"path,omitempty"`
	Hash     string   `json:"hash"`
	Children []Node   `json:"children,omitempty"`
	Blocks   BlockMap `json:"blocks,omitempty"`
	Files    *Node    `json:"files,omitempty"`
}

type BlockMap map[string]*Node

func ComputePipelineHash(pipelinePath string) (string, error) {
	// Read and parse pipeline.json
	data, err := os.ReadFile(filepath.Join(pipelinePath, "pipeline.json"))
	if err != nil {
		return "", err
	}

	var specs zjson.Pipeline
	if err := json.Unmarshal(data, &specs); err != nil {
		return "", err
	}

	// Use the existing logic but only return the root hash
	node, err := ComputePipelineMerkleTree(&specs, pipelinePath)
	if err != nil {
		return "", err
	}

	return node.Hash, nil
}

func ComputePipelineMerkleTree(specs *zjson.Pipeline, pipelinePath string) (*Node, error) {
	return merklePipeline(specs.Pipeline, pipelinePath)
}

func merklePipeline(pipeline map[string]zjson.Block, pipelinePath string) (*Node, error) {
	node := &Node{
		Blocks: make(BlockMap),
	}

	for key, childBlock := range pipeline {
		if hasPipeline(childBlock) {
			childNode, err := merklePipeline(childBlock.Action.Pipeline, pipelinePath)
			if err != nil {
				return nil, err
			}
			node.Blocks[key] = childNode
		} else if hasContainer(childBlock) {
			blockPath := filepath.Join(pipelinePath, key)
			directoryMerkle, err := computeDirectoryMerkleTree(blockPath)
			if err != nil {
				return nil, err
			}
			node.Blocks[key] = &Node{
				Files: directoryMerkle,
				Hash:  directoryMerkle.Hash,
			}
		}
	}

	var blockNodes []Node
	for _, block := range node.Blocks {
		blockNodes = append(blockNodes, *block)
	}
	node.Hash = combineChildrenHashes(blockNodes)

	return node, nil
}

func hasContainer(block zjson.Block) bool {
	return block.Action.Container.Image != ""
}

func hasPipeline(block zjson.Block) bool {
	return len(block.Action.Pipeline) > 0
}

func computeDirectoryMerkleTree(dirPath string) (*Node, error) {
	return merkleDirectory([]string{dirPath}, []string{})
}

func merkleDirectory(absolutePathSegments []string, relativePathSegments []string) (*Node, error) {
	dirPath := filepath.Join(absolutePathSegments...)
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var children []Node
	for _, entry := range entries {
		entryAbsolutePathSegments := append(absolutePathSegments, entry.Name())
		entryRelativePathSegments := append(relativePathSegments, entry.Name())

		if entry.IsDir() {
			subDirNode, err := merkleDirectory(entryAbsolutePathSegments, entryRelativePathSegments)
			if err != nil {
				return nil, err
			}
			children = append(children, *subDirNode)
		} else {
			// Skip metadata files
			isMetadata := false
			for _, meta := range METADATA {
				if entry.Name() == meta {
					isMetadata = true
					break
				}
			}
			if isMetadata {
				continue
			}

			fileHash, err := computeFileHash(filepath.Join(entryAbsolutePathSegments...))
			if err != nil {
				return nil, err
			}

			entryRelativePath := strings.Join(entryRelativePathSegments, "/")
			children = append(children, Node{
				Path: entryRelativePath,
				Hash: fileHash,
			})
		}
	}

	relativePath := strings.Join(relativePathSegments, "/")
	hash := combineChildrenHashes(children)

	return &Node{
		Path:     relativePath,
		Hash:     hash,
		Children: children,
	}, nil
}

func computeFileHash(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

func combineChildrenHashes(nodes []Node) string {
	hashes := make([]string, len(nodes))
	for i, node := range nodes {
		hashes[i] = node.Hash
	}
	return combineHashes(hashes)
}

func combineHashes(hashes []string) string {
	concatenatedHashes := strings.Join(hashes, "")
	hash := sha256.New()
	hash.Write([]byte(concatenatedHashes))
	return hex.EncodeToString(hash.Sum(nil))
}
